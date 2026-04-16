// ============================================================
// article-searcher.ts — Web article search via Google Search Grounding
// Uses Account 2 (GOOGLE_AI_API_KEY_SEARCH).
// Server-side only. Never import in Client Components.
// ============================================================

import { geminiSearch } from '@/lib/ai/google-ai-client'
import type { NewsArticle } from '@/lib/ai/news-curation'

const SEARCH_PROMPT = (topic: string) => `
Search for recent and relevant news articles about the following topic: "${topic}"

Focus exclusively on content related to these niches: architectural lighting, LED technology, LED panels, luminaires, lighting fixtures, lighting design, interior design, architecture, smart lighting, building technology, lighting projects.

Return ONLY a valid JSON array of up to 10 articles, no markdown, no extra text:
[
  {
    "title": "article title",
    "url": "https://article-url.com",
    "description": "relevant summary or excerpt from the article",
    "source": "publication or portal name",
    "publishedAt": "2024-01-15"
  }
]

If no relevant articles are found, return an empty array: []
`.trim()

const extractHostname = (url: string): string => {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

export const searchArticlesByTopic = async (topic: string): Promise<NewsArticle[]> => {
  if (!geminiSearch) {
    throw new Error('GOOGLE_AI_API_KEY_SEARCH não configurada')
  }

  const result = await geminiSearch.generateContent({
    contents: [{ role: 'user', parts: [{ text: SEARCH_PROMPT(topic) }] }],
    tools: [{ googleSearchRetrieval: {} }],
  })

  // Primary: extract grounded sources from metadata
  // (With Search Grounding, Gemini returns natural language text, not JSON —
  // the actual searched URLs live in groundingMetadata.groundingChunks)
  const chunks = result.response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []
  const fromGrounding: NewsArticle[] = chunks
    .filter((c) => c.web?.uri && c.web?.title)
    .map((c) => ({
      title: c.web!.title!,
      url: c.web!.uri!,
      description: '',
      source: extractHostname(c.web!.uri!),
      publishedAt: new Date().toISOString().split('T')[0],
    }))
    .slice(0, 10)

  if (fromGrounding.length > 0) return fromGrounding

  // Fallback: try to parse JSON from text (non-grounded responses)
  const text = result.response.text().trim()
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    const raw = JSON.parse(jsonMatch[0]) as Array<{
      title?: string
      url?: string
      description?: string
      source?: string
      publishedAt?: string
    }>

    return raw
      .filter((a) => a.title && a.url)
      .map((a) => ({
        title: a.title ?? '',
        url: a.url ?? '',
        description: a.description ?? '',
        source: a.source ?? '',
        publishedAt: a.publishedAt ?? '',
      }))
      .slice(0, 10)
  } catch {
    return []
  }
}
