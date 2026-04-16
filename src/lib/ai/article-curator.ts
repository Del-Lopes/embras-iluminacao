// ============================================================
// article-curator.ts — Cascading relevance ranking + density classification
// Uses Account 2 (GOOGLE_AI_API_KEY_SEARCH) cascade (10s timeout per model):
//   Attempt 1 → Gemma 4 31B
//   Attempt 2 → Gemini Flash Lite (gemini-3.1-flash-lite-preview)
//   Attempt 3 → Gemma 4 26B-a4b (MoE)
// When Account 2 not configured OR all 3 fail:
//   → returns pre-scored articles without density (treated as 'general').
// Server-side only. Never import in Client Components.
// ============================================================

import { curationModels } from '@/lib/ai/google-ai-client'
import type { NewsArticle } from '@/lib/ai/news-curation'

const MAX_ATTEMPTS = 3   // one attempt per model: Gemma 4 31B → Gemini Flash Lite → Gemma 4 26B
const AI_TIMEOUT_MS = 10000 // 10s per model before falling to next in cascade

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`AI timeout after ${ms}ms`)), ms)
    ),
  ])
}

const RANK_PROMPT = (topic: string, articles: NewsArticle[]) => `
You are a content curator specializing in: architectural lighting, LED technology, LED panels, luminaires, lighting fixtures, lighting design, interior design, architecture, smart lighting, building technology.

Topic searched by the user: "${topic}"

Available articles (index 0 to ${articles.length - 1}):
${articles.map((a, i) => `[${i}] "${a.title}" — ${a.source} — ${a.description?.slice(0, 120) ?? ''}`).join('\n')}

For each article determine:
1. Relevance order (most to least relevant for the topic and niches above)
2. Density: "dense" if the article is technical, in-depth, or uses specialized vocabulary; "general" if it is accessible, brief, or introductory

Return ONLY a valid JSON array ordered by relevance. Each item must have exactly two fields — "index" (integer) and "density" ("dense" or "general"):
[
  {"index": 2, "density": "dense"},
  {"index": 0, "density": "general"}
]

Include ALL available articles. Return only the array, no extra text or markdown.
`.trim()

type RankedItem = { index: number; density: 'dense' | 'general' }

function parseResult(rawText: string, maxIndex: number): RankedItem[] | null {
  const text = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) return null
    const valid: RankedItem[] = []
    for (const item of parsed as unknown[]) {
      if (typeof item !== 'object' || item === null) continue
      const obj = item as Record<string, unknown>
      const idx = obj.index
      if (typeof idx !== 'number' || idx < 0 || idx >= maxIndex) continue
      valid.push({
        index: idx,
        density: obj.density === 'dense' ? 'dense' : 'general',
      })
      if (valid.length >= 10) break
    }
    return valid.length > 0 ? valid : null
  } catch {
    return null
  }
}

function applyRanking(articles: NewsArticle[], ranked: RankedItem[]): NewsArticle[] {
  return ranked.map(({ index, density }) => ({ ...articles[index], density }))
}

export const rankArticlesByRelevance = async (
  topic: string,
  articles: NewsArticle[],
): Promise<NewsArticle[]> => {
  if (articles.length === 0) return []

  const prompt = RANK_PROMPT(topic, articles)

  // ── Account 2 cascade ─────────────────────────────────────
  if (curationModels.length > 0) {
    let lastError: unknown
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const { label, model } = curationModels[i % curationModels.length]
      try {
        const result = await withTimeout(
          model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
          AI_TIMEOUT_MS
        )
        const ranked = parseResult(result.response.text(), articles.length)
        if (!ranked) throw new Error('Array de índices/density inválido na resposta')
        console.log(`[article-curator] Ranked by ${label} (attempt ${i + 1})`)
        return applyRanking(articles, ranked)
      } catch (err) {
        lastError = err
        console.warn(`[article-curator] ${label} falhou (tentativa ${i + 1}/${MAX_ATTEMPTS}):`, err)
      }
    }
    console.error('[article-curator] Todos os modelos falharam:', lastError)
    return articles.slice(0, 10) // pre-scored order, no density → treated as 'general'
  }

  // ── Account 2 not configured — use pre-scored order directly ──
  console.warn('[article-curator] Account 2 not configured — using pre-scored order')
  return articles.slice(0, 10)
}
