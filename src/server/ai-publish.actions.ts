'use server'

import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { supabaseAdmin } from '@/lib/db/supabase-admin'
import { fetchNewsByTopic } from '@/lib/ai/news-curation'
import { rankArticlesByRelevance } from '@/lib/ai/article-curator'
import { generatePostContent } from '@/lib/ai/content-generator'
import { generateSalesPostContent } from '@/lib/ai/sales-post-generator'
import { generateCoverImage } from '@/lib/utils/hf-image'
import { revalidatePath } from 'next/cache'
import type { NewsArticle } from '@/lib/ai/news-curation'

// Max 5 AI generations per user per hour
const RATE_LIMIT = 5
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

const isRateLimited = async (userId: string): Promise<boolean> => {
  const supabase = await createSupabaseServerClient()
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const { count } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', userId)
    .not('source_url', 'is', null)
    .gte('created_at', since)
  return (count ?? 0) >= RATE_LIMIT
}

// ================================================================
// fetchNewsAction — Search + Rank via Gemini/Gemma
// Falls back to NewsAPI if GOOGLE_AI_API_KEY_SEARCH is not set
// ================================================================
export type FetchNewsResult = { error: string } | { articles: NewsArticle[] }

export const fetchNewsAction = async (formData: FormData): Promise<FetchNewsResult> => {
  const topic = (formData.get('topic') as string | null)?.trim() ?? ''
  if (!topic) return { error: 'Informe um tópico para buscar' }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  try {
    // Step 1: Fetch from category-specific RSS feeds + NewsAPI supplement
    console.log('[fetchNewsAction] Starting RSS + NewsAPI fetch for:', topic)
    const t0 = Date.now()

    const rawArticles = await Promise.race([
      fetchNewsByTopic(topic),
      new Promise<NewsArticle[]>((_, reject) =>
        setTimeout(() => reject(new Error('fetchNewsByTopic timeout after 30s')), 30_000)
      ),
    ])

    console.log(`[fetchNewsAction] News fetch done in ${Date.now() - t0}ms — ${rawArticles.length} articles`)

    if (!rawArticles.length) return { error: 'Nenhum artigo encontrado para esse tópico' }

    // Step 2: Rank with Gemma — fallback to pre-scored order if it fails/times out
    let articles: NewsArticle[]
    try {
      console.log('[fetchNewsAction] Starting Gemma ranking...')
      const t1 = Date.now()
      articles = await rankArticlesByRelevance(topic, rawArticles)
      console.log(`[fetchNewsAction] Ranking done in ${Date.now() - t1}ms`)
    } catch (rankErr) {
      console.warn('[fetchNewsAction] Gemma ranking failed — using pre-scored order:', rankErr)
      articles = rawArticles.slice(0, 10)
    }

    return { articles }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao buscar notícias'
    console.error('[fetchNewsAction] error:', msg)
    return { error: msg }
  }
}

// ================================================================
// generatePostAction — AI generation + image chain + save draft
// ================================================================
export type GeneratePostResult = { error: string } | { postId: string; imageOrigin: string }

export const generatePostAction = async (formData: FormData): Promise<GeneratePostResult> => {
  const articleTitle = (formData.get('title') as string | null) ?? ''
  const articleUrl = (formData.get('url') as string | null) ?? ''
  const articleDescription = (formData.get('description') as string | null) ?? ''
  const categoryId = (formData.get('category_id') as string | null) ?? ''
  const rawDensity = (formData.get('density') as string | null) ?? 'general'
  const density = rawDensity === 'dense' ? 'dense' : 'general'

  if (!articleTitle || !articleUrl) return { error: 'Dados do artigo inválidos' }
  if (!categoryId) return { error: 'Selecione uma categoria antes de gerar' }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  if (await isRateLimited(user.id)) {
    return { error: 'Limite de 5 gerações por hora atingido. Tente novamente mais tarde.' }
  }

  // Create placeholder post (supabaseAdmin bypasses RLS; auth already verified above)
  const placeholderSlug = `ai-draft-${Date.now()}`
  const { data: post, error: insertError } = await supabaseAdmin
    .from('posts')
    .insert({
      title: `[IA] ${articleTitle.slice(0, 70)}`,
      slug: placeholderSlug,
      content: '',
      status: 'draft',
      author_id: user.id,
      category_id: categoryId,
      source_url: articleUrl,
      image_prompt: null,
      excerpt: null,
      cover_image: null,
      seo_title: null,
      seo_description: null,
      seo_keywords: null,
      published_at: null,
    })
    .select('id')
    .single()

  if (insertError || !post) {
    console.error('[generatePostAction] insert error', insertError?.message)
    return { error: `Erro ao criar rascunho: ${insertError?.message ?? 'sem dados retornados'}` }
  }

  const postId = post.id

  try {
    // Step 1: Generate content with Gemini Flash Lite
    const generated = await generatePostContent({
      title: articleTitle,
      url: articleUrl,
      description: articleDescription,
      density,
    })

    // Step 2: Generate cover image (FLUX → FLUX backup → Unsplash → default)
    const { url: tempCoverUrl, origin: imageOrigin } = await generateCoverImage(generated.image_prompt)

    // Step 2b: If AI-generated, download and persist to Supabase Storage (HF URLs are temporary)
    let coverImage = tempCoverUrl
    if ((imageOrigin === 'flux' || imageOrigin === 'imagen4') && tempCoverUrl.startsWith('http')) {
      try {
        const res = await fetch(tempCoverUrl)
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer()
          const contentType = res.headers.get('content-type') ?? 'image/jpeg'
          const ext = contentType.split('/')[1]?.split(';')[0] ?? 'jpg'
          const storagePath = `ai-generated/${Date.now()}.${ext}`
          const { error: upErr } = await supabaseAdmin.storage
            .from('cover-images')
            .upload(storagePath, Buffer.from(arrayBuffer), { contentType, cacheControl: '31536000', upsert: false })
          if (!upErr) {
            const { data: pub } = supabaseAdmin.storage.from('cover-images').getPublicUrl(storagePath)
            coverImage = pub.publicUrl
          }
        }
      } catch {
        // Keep temp URL as fallback — image may not display after HF session expires
      }
    }

    // Step 3: Update post with full content
    const { error: updateError } = await supabaseAdmin
      .from('posts')
      .update({
        title: generated.title,
        slug: generated.slug,
        content: generated.content,
        excerpt: generated.excerpt,
        seo_title: generated.seo_title,
        seo_description: generated.seo_description,
        seo_keywords: generated.seo_keywords,
        image_prompt: generated.image_prompt,
        cover_image: coverImage,
        status: 'draft',
        published_at: new Date().toISOString(),
      })
      .eq('id', postId)

    if (updateError) {
      console.error('[generatePostAction] update error', updateError.message)
    }

    // Step 4: Log generation
    await supabaseAdmin.from('ai_automation_logs').insert({
      post_id: postId,
      prompt_used: articleUrl,
      model_version: generated.model_used,
      token_usage: null,
      raw_response: { ...generated, imageOrigin } as unknown as Record<string, unknown>,
    })

    revalidatePath('/admin/dashboard')
    return { postId, imageOrigin }
  } catch (e) {
    await supabase.from('posts').delete().eq('id', postId)
    const msg = e instanceof Error ? e.message : 'Erro ao gerar conteúdo com IA'
    console.error('[generatePostAction] generation error', msg)
    return { error: msg }
  }
}

// ================================================================
// generateSalesPostAction — Artigo para Vendas (sem RSS, sem imagem)
// Recebe produto + cidade, gera conteúdo SEO via IA e salva na
// categoria "google" (invisível no blog). Categoria criada
// automaticamente se não existir.
// ================================================================
export type GenerateSalesPostResult = { error: string } | { postId: string }

export const generateSalesPostAction = async ({
  product,
  city,
}: {
  product: string
  city: string
}): Promise<GenerateSalesPostResult> => {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Resolve or create the 'google' category
  let categoryId: string
  const { data: existingCat } = await supabaseAdmin
    .from('categories')
    .select('id')
    .eq('slug', 'google')
    .maybeSingle()

  if (existingCat) {
    categoryId = existingCat.id
  } else {
    const { data: newCat, error: catErr } = await supabaseAdmin
      .from('categories')
      .insert({ name: 'Google', slug: 'google', description: 'Artigos de vendas para SEO — não exibidos no blog' })
      .select('id')
      .single()
    if (catErr || !newCat) {
      console.error('[generateSalesPostAction] category error', catErr?.message)
      return { error: 'Erro ao resolver categoria Google' }
    }
    categoryId = newCat.id
  }

  // Generate content via AI
  let generated
  try {
    generated = await generateSalesPostContent(product, city)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao gerar conteúdo'
    console.error('[generateSalesPostAction] generation error', msg)
    return { error: msg }
  }

  // Unique slug to avoid conflicts — 4-digit random suffix
  const rand = Math.floor(Math.random() * 9000) + 1000
  const slug = `${generated.slug}-${rand}`

  const { data: post, error: insertError } = await supabaseAdmin
    .from('posts')
    .insert({
      title: generated.title,
      slug,
      content: generated.content,
      excerpt: generated.excerpt,
      status: 'draft',
      author_id: user.id,
      category_id: categoryId,
      source_url: null,
      image_prompt: null,
      cover_image: null,
      seo_title: generated.seo_title,
      seo_description: generated.seo_description,
      seo_keywords: generated.seo_keywords,
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertError || !post) {
    console.error('[generateSalesPostAction] insert error', insertError?.message)
    return { error: `Erro ao criar artigo: ${insertError?.message ?? 'sem dados retornados'}` }
  }

  await supabaseAdmin.from('ai_automation_logs').insert({
    post_id: post.id,
    prompt_used: `sales-post | produto: ${product} | cidade: ${city}`,
    model_version: generated.model_used,
    token_usage: null,
    raw_response: { type: 'sales_post', product, city } as unknown as Record<string, unknown>,
  })

  revalidatePath('/admin/dashboard')
  return { postId: post.id }
}
