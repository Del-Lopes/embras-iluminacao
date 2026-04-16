// ============================================================
// cron-runner.ts — Fully autonomous daily automation pipeline
// Server-side only. Called by /api/cron/auto-publish.
//
// Flow per run:
//   1. Load settings + guard checks (enabled, active day, start hour)
//   2. Get or create daily run records for 'news' and 'sales'
//   3. News pipeline — 3 posts/day across 3 topics, dedup by source_url
//   4. Sales pipeline — product × city rotation, Sudeste-first strategy
//   5. Each post: slot 0 = published (start_hour), slot 1 = scheduled 12h,
//      slot 2 = scheduled 17h
//   6. On partial failure the run record stays incomplete → hourly cron retries
// ============================================================

import { supabaseAdmin } from '@/lib/db/supabase-admin'
import { publishScheduledPosts } from '@/lib/automation/publish-scheduler'
import { fetchNewsByTopic } from '@/lib/ai/news-curation'
import { generatePostContent } from '@/lib/ai/content-generator'
import { generateSalesPostContent } from '@/lib/ai/sales-post-generator'
import { generateCoverImage } from '@/lib/utils/hf-image'
import { pickProduct } from '@/lib/automation/embras-products'
import type { AutomationSettings, AutomationDailyRun, AutomationCityHistory } from '@/lib/db/schema'
import type { NewsArticle } from '@/lib/ai/news-curation'

// ──────────────────────────────────────────────────────────────
// Timezone helpers (Brasília = America/Sao_Paulo)
// ──────────────────────────────────────────────────────────────
const WEEKDAY_MAP: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
}

function getBrasiliaInfo(): { date: string; hour: number; dayOfWeek: number } {
  const now = new Date()
  const tz = 'America/Sao_Paulo'

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hour12: false,
    weekday: 'long',
  }).formatToParts(now)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '0'

  const year  = get('year')
  const month = get('month')
  const day   = get('day')
  const hour  = parseInt(get('hour'), 10)
  const dayOfWeek = WEEKDAY_MAP[get('weekday')] ?? 0

  return { date: `${year}-${month}-${day}`, hour, dayOfWeek }
}

/**
 * Returns publish status + ISO timestamp for a given daily slot.
 * Slot 0  → published  at startHour:startMinute (Brasília)
 * Slot N  → scheduled  at (startHour + N * intervalHours):startMinute
 */
function getPublishInfo(
  slot: number,
  dateStr: string,
  startHour: number,
  startMinute: number,
  intervalHours: number,
): { status: 'published' | 'scheduled'; publishedAt: string } {
  const h = startHour + slot * intervalHours
  const pad = (n: number) => String(n).padStart(2, '0')
  // Brasília is UTC-3 (no DST in the majority of the year; close enough)
  const publishedAt = `${dateStr}T${pad(h)}:${pad(startMinute)}:00-03:00`
  return {
    status: slot === 0 ? 'published' : 'scheduled',
    publishedAt: new Date(publishedAt).toISOString(),
  }
}

// ──────────────────────────────────────────────────────────────
// Daily run helpers
// ──────────────────────────────────────────────────────────────
async function getOrCreateDailyRun(
  date: string,
  type: 'news' | 'sales',
  target: number,
): Promise<AutomationDailyRun> {
  const { data: existing } = await supabaseAdmin
    .from('automation_daily_runs')
    .select('*')
    .eq('run_date', date)
    .eq('run_type', type)
    .maybeSingle()

  if (existing) return existing as AutomationDailyRun

  const { data: created, error } = await supabaseAdmin
    .from('automation_daily_runs')
    .insert({ run_date: date, run_type: type, posts_target: target })
    .select('*')
    .single()

  if (error || !created) {
    throw new Error(`Failed to create daily run record (${type}): ${error?.message ?? 'no data'}`)
  }
  return created as AutomationDailyRun
}

async function updateDailyRun(
  id: string,
  postsCreated: number,
  target: number,
): Promise<void> {
  await supabaseAdmin
    .from('automation_daily_runs')
    .update({
      posts_created: postsCreated,
      completed: postsCreated >= target,
      last_attempt_at: new Date().toISOString(),
    })
    .eq('id', id)
}

// ──────────────────────────────────────────────────────────────
// City rotation — Sudeste first, then least-recently-used
// ──────────────────────────────────────────────────────────────
async function getNextCity(today: string): Promise<AutomationCityHistory | null> {
  // 1. Never-used or oldest Sudeste city (not used today)
  const { data: sudeste } = await supabaseAdmin
    .from('automation_city_history')
    .select('*')
    .eq('region', 'Sudeste')
    .or(`last_used_date.is.null,last_used_date.lt.${today}`)
    .order('last_used_date', { ascending: true, nullsFirst: true })
    .order('usage_count', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (sudeste) return sudeste as AutomationCityHistory

  // 2. Any city not used today (all regions)
  const { data: any } = await supabaseAdmin
    .from('automation_city_history')
    .select('*')
    .or(`last_used_date.is.null,last_used_date.lt.${today}`)
    .order('last_used_date', { ascending: true, nullsFirst: true })
    .order('usage_count', { ascending: true })
    .limit(1)
    .maybeSingle()

  return (any as AutomationCityHistory | null) ?? null
}

async function markCityUsed(cityId: string, currentCount: number, today: string): Promise<void> {
  await supabaseAdmin
    .from('automation_city_history')
    .update({ last_used_date: today, usage_count: currentCount + 1 })
    .eq('id', cityId)
}

// ──────────────────────────────────────────────────────────────
// Image persistence — downloads AI-generated images to Storage
// so temporary HF URLs don't expire
// ──────────────────────────────────────────────────────────────
async function persistImageToStorage(tempUrl: string): Promise<string> {
  try {
    const res = await fetch(tempUrl)
    if (!res.ok) return tempUrl
    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const ext = contentType.split('/')[1]?.split(';')[0] ?? 'jpg'
    const path = `ai-generated/${Date.now()}.${ext}`
    const { error } = await supabaseAdmin.storage
      .from('cover-images')
      .upload(path, Buffer.from(buffer), { contentType, cacheControl: '31536000', upsert: false })
    if (error) return tempUrl
    const { data } = supabaseAdmin.storage.from('cover-images').getPublicUrl(path)
    return data.publicUrl
  } catch {
    return tempUrl
  }
}

// ──────────────────────────────────────────────────────────────
// Resolve or create categories used by the cron
// ──────────────────────────────────────────────────────────────
async function resolveCategory(name: string, slug: string, description: string): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabaseAdmin
    .from('categories')
    .insert({ name, slug, description })
    .select('id')
    .single()

  if (error || !created) throw new Error(`Failed to resolve category "${slug}": ${error?.message}`)
  return created.id
}

// ──────────────────────────────────────────────────────────────
// Pipeline result type
// ──────────────────────────────────────────────────────────────
type PipelineResult = {
  created: number
  errors: string[]
  completed: boolean
}

// ──────────────────────────────────────────────────────────────
// NEWS PIPELINE
// Topics: Iluminação → Arquitetura → Design de Interiores
// Each slot tries its primary topic first; falls through to
// remaining topics if no fresh articles are found.
// ──────────────────────────────────────────────────────────────
const NEWS_TOPICS = ['Iluminação', 'Arquitetura', 'Design de Interiores']

async function runNewsPipeline(
  run: AutomationDailyRun,
  date: string,
  startHour: number,
  startMinute: number,
  intervalHours: number,
): Promise<PipelineResult> {
  const botId = process.env.AI_BOT_PROFILE_ID
  if (!botId) throw new Error('AI_BOT_PROFILE_ID env var not set')

  const categoryId = await resolveCategory(
    'Notícias', 'noticias',
    'Notícias sobre iluminação, arquitetura e design de interiores',
  )

  // Collect all source_urls already in DB to deduplicate
  const { data: existingRows } = await supabaseAdmin
    .from('posts')
    .select('source_url')
    .not('source_url', 'is', null)
  const knownUrls = new Set<string>(
    (existingRows ?? []).map((r) => r.source_url as string).filter(Boolean),
  )

  let created = run.posts_created
  const errors: string[] = []

  for (let slot = run.posts_created; slot < run.posts_target; slot++) {
    let article: NewsArticle | null = null

    // Try each topic in rotation starting from this slot's primary
    for (let t = 0; t < NEWS_TOPICS.length; t++) {
      const topic = NEWS_TOPICS[(slot + t) % NEWS_TOPICS.length]
      try {
        const articles = await fetchNewsByTopic(topic)
        const fresh = articles.filter((a) => a.url && !knownUrls.has(a.url))
        if (fresh.length > 0) {
          article = fresh[0]
          break
        }
        console.warn(`[news-pipeline] no fresh articles for topic "${topic}" (slot ${slot})`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[news-pipeline] fetch failed for topic "${topic}": ${msg}`)
      }
    }

    if (!article) {
      errors.push(`slot ${slot}: no fresh article found across all topics`)
      continue
    }

    // Reserve URL locally to avoid re-selecting within same run
    knownUrls.add(article.url)

    try {
      // Generate content (density from curator or default 'general')
      const generated = await generatePostContent({
        title: article.title,
        url: article.url,
        description: article.description,
        density: article.density ?? 'general',
      })

      // Generate cover image (FLUX → backup → Unsplash → default)
      const { url: imgUrl, origin: imgOrigin } = await generateCoverImage(generated.image_prompt)
      const coverImage = (imgOrigin === 'flux' || imgOrigin === 'imagen4')
        ? await persistImageToStorage(imgUrl)
        : imgUrl

      const { status, publishedAt } = getPublishInfo(slot, date, startHour, startMinute, intervalHours)
      const rand = Math.floor(Math.random() * 9000) + 1000
      const slug = `${generated.slug}-${rand}`

      const { data: post, error: insertErr } = await supabaseAdmin
        .from('posts')
        .insert({
          title: generated.title,
          slug,
          content: generated.content,
          excerpt: generated.excerpt,
          status,
          author_id: botId,
          category_id: categoryId,
          source_url: article.url,
          image_prompt: generated.image_prompt,
          cover_image: coverImage,
          seo_title: generated.seo_title,
          seo_description: generated.seo_description,
          seo_keywords: generated.seo_keywords,
          published_at: publishedAt,
        })
        .select('id')
        .single()

      if (insertErr || !post) throw new Error(insertErr?.message ?? 'no post data returned')

      await supabaseAdmin.from('ai_automation_logs').insert({
        post_id: post.id,
        prompt_used: article.url,
        model_version: generated.model_used,
        token_usage: null,
        raw_response: {
          type: 'auto_news',
          topic: NEWS_TOPICS[slot % NEWS_TOPICS.length],
          slot,
          imageOrigin: imgOrigin,
        } as Record<string, unknown>,
      })

      created++
      console.info(`[news-pipeline] slot ${slot} OK — post ${post.id} | status=${status}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`slot ${slot}: ${msg}`)
      console.error(`[news-pipeline] slot ${slot} failed:`, msg)
    }
  }

  await updateDailyRun(run.id, created, run.posts_target)
  return { created: created - run.posts_created, errors, completed: created >= run.posts_target }
}

// ──────────────────────────────────────────────────────────────
// SALES PIPELINE
// Picks next city (Sudeste priority) + deterministic product.
// No cover image (same as manual sales flow).
// ──────────────────────────────────────────────────────────────
async function runSalesPipeline(
  run: AutomationDailyRun,
  date: string,
  startHour: number,
  startMinute: number,
  intervalHours: number,
): Promise<PipelineResult> {
  const botId = process.env.AI_BOT_PROFILE_ID
  if (!botId) throw new Error('AI_BOT_PROFILE_ID env var not set')

  const categoryId = await resolveCategory(
    'Google', 'google',
    'Artigos de vendas para SEO — não exibidos no blog',
  )

  let created = run.posts_created
  const errors: string[] = []

  for (let slot = run.posts_created; slot < run.posts_target; slot++) {
    try {
      const city = await getNextCity(date)
      if (!city) {
        errors.push(`slot ${slot}: no city available for ${date}`)
        break
      }

      const product = pickProduct(date, slot)
      const cityLabel = `${city.city}, ${city.state_code}`

      const generated = await generateSalesPostContent(product, cityLabel)

      const { status, publishedAt } = getPublishInfo(slot, date, startHour, startMinute, intervalHours)
      const rand = Math.floor(Math.random() * 9000) + 1000
      const slug = `${generated.slug}-${rand}`

      const { data: post, error: insertErr } = await supabaseAdmin
        .from('posts')
        .insert({
          title: generated.title,
          slug,
          content: generated.content,
          excerpt: generated.excerpt,
          status,
          author_id: botId,
          category_id: categoryId,
          source_url: null,
          image_prompt: null,
          cover_image: null,
          seo_title: generated.seo_title,
          seo_description: generated.seo_description,
          seo_keywords: generated.seo_keywords,
          published_at: publishedAt,
        })
        .select('id')
        .single()

      if (insertErr || !post) throw new Error(insertErr?.message ?? 'no post data returned')

      await markCityUsed(city.id, city.usage_count, date)

      await supabaseAdmin.from('ai_automation_logs').insert({
        post_id: post.id,
        prompt_used: `auto-sales | produto: ${product} | cidade: ${cityLabel}`,
        model_version: generated.model_used,
        token_usage: null,
        raw_response: {
          type: 'auto_sales',
          product,
          city: city.city,
          state: city.state_code,
          region: city.region,
          slot,
        } as Record<string, unknown>,
      })

      created++
      console.info(`[sales-pipeline] slot ${slot} OK — post ${post.id} | ${product} × ${cityLabel} | status=${status}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`slot ${slot}: ${msg}`)
      console.error(`[sales-pipeline] slot ${slot} failed:`, msg)
    }
  }

  await updateDailyRun(run.id, created, run.posts_target)
  return { created: created - run.posts_created, errors, completed: created >= run.posts_target }
}

// ──────────────────────────────────────────────────────────────
// PUBLIC ENTRY POINT
// ──────────────────────────────────────────────────────────────
export type AutomationRunResult =
  | { skipped: string; scheduledPublished: number }
  | {
      ok: true
      date: string
      scheduledPublished: number
      news?: PipelineResult
      sales?: PipelineResult
    }

export async function runAutomation(): Promise<AutomationRunResult> {
  // 0. Always publish any scheduled posts that are now due
  const scheduledPublished = await publishScheduledPosts()

  // 1. Load settings
  const { data: settings, error: settingsErr } = await supabaseAdmin
    .from('automation_settings')
    .select('*')
    .maybeSingle()

  if (settingsErr || !settings) {
    throw new Error(`Failed to load automation settings: ${settingsErr?.message ?? 'no row found'}`)
  }

  const cfg = settings as AutomationSettings

  if (!cfg.is_enabled) return { skipped: 'automation_disabled', scheduledPublished }

  // 2. Brasília time guards
  const { date, hour, dayOfWeek } = getBrasiliaInfo()

  if (!cfg.active_days.includes(dayOfWeek)) {
    return { skipped: `inactive_day (${dayOfWeek})`, scheduledPublished }
  }
  if (hour < cfg.cron_start_hour) {
    return { skipped: `too_early (${hour}h < configured ${cfg.cron_start_hour}h)`, scheduledPublished }
  }

  // 3. Load / create daily run records
  const [newsRun, salesRun] = await Promise.all([
    cfg.news_posts_per_day > 0
      ? getOrCreateDailyRun(date, 'news', cfg.news_posts_per_day)
      : null,
    cfg.sales_posts_per_day > 0
      ? getOrCreateDailyRun(date, 'sales', cfg.sales_posts_per_day)
      : null,
  ])

  const newsComplete  = !newsRun  || newsRun.completed
  const salesComplete = !salesRun || salesRun.completed

  if (newsComplete && salesComplete) {
    return { skipped: 'daily_goal_already_met', scheduledPublished }
  }

  // 4. Run incomplete pipelines
  const result: { ok: true; date: string; scheduledPublished: number; news?: PipelineResult; sales?: PipelineResult } = {
    ok: true,
    date,
    scheduledPublished,
  }

  if (newsRun && !newsRun.completed) {
    console.info(`[cron-runner] Starting news pipeline — ${newsRun.posts_created}/${newsRun.posts_target} done`)
    result.news = await runNewsPipeline(newsRun, date, cfg.cron_start_hour, cfg.cron_start_minute, cfg.post_interval_hours)
  }

  if (salesRun && !salesRun.completed) {
    console.info(`[cron-runner] Starting sales pipeline — ${salesRun.posts_created}/${salesRun.posts_target} done`)
    result.sales = await runSalesPipeline(salesRun, date, cfg.cron_start_hour, cfg.cron_start_minute, cfg.post_interval_hours)
  }

  return result
}
