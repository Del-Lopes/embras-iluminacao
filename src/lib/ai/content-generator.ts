// ============================================================
// content-generator.ts — Cascading AI post generation
// Server-side only. Never import in Client Components.
//
// General content cascade (3 attempts):
//   1. Gemini 3.1 Flash Lite  (GOOGLE_AI_API_KEY)
//   2. Gemma 3 27B             (GOOGLE_AI_API_KEY)
//   3. Gemma 4 31B             (GOOGLE_AI_API_KEY)
//
// Dense content cascade (3 attempts):
//   1. Llama 3.3 70B Versatile (GROQ_API_KEY)
//   2. Gemma 3 27B             (GOOGLE_AI_API_KEY)
//   3. Gemma 4 31B             (GOOGLE_AI_API_KEY)
//   → After 3 failures, throws error
// ============================================================

import Groq from 'groq-sdk'
import { gemini, gemma, gemma4 } from '@/lib/ai/google-ai-client'
import { generateEmbrasClosing } from '@/lib/ai/embras-closing'
import { z } from 'zod'

const GeneratedPostSchema = z.object({
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  excerpt: z.string(),
  seo_title: z.string(),
  seo_description: z.string(),
  seo_keywords: z.array(z.string()),
  image_prompt: z.string(),
})

export type GeneratedPost = z.infer<typeof GeneratedPostSchema> & { model_used: string }

// ----------------------------------------------------------------
// Prompts (English instructions, Portuguese output)
// ----------------------------------------------------------------
const SYSTEM_PROMPT = `You are an expert content writer specializing in architectural lighting, LED technology, luminaires, lighting design, interior design, and building technology for the Brazilian market.
Given a reference article, write an original journalistic article in Brazilian Portuguese (pt-BR).
Return ONLY a valid JSON object — no markdown, no extra text.`

const buildUserPrompt = (article: { title: string; url: string; description: string }) => `
Write an original journalistic article in Brazilian Portuguese (pt-BR) based on this source:

Original title: ${article.title}
URL: ${article.url}
Summary: ${article.description}

Return a JSON with EXACTLY these fields (no extra fields):
{
  "title": "article title in Brazilian Portuguese (max 80 characters)",
  "slug": "title-in-kebab-case-no-accents-no-special-characters",
  "content": "full content in semantic HTML using <h2>, <h3>, <p>, <ul>/<ol> where applicable, minimum 400 words. Do NOT include <html>, <head>, <body> or <script> tags. Write in Brazilian Portuguese.",
  "excerpt": "one short sentence summary in Brazilian Portuguese (max 160 characters)",
  "seo_title": "SEO-optimized title in Brazilian Portuguese (max 60 characters)",
  "seo_description": "descriptive meta description in Brazilian Portuguese (max 160 characters)",
  "seo_keywords": ["keyword-1", "keyword-2", "keyword-3", "keyword-4"],
  "image_prompt": "English description for cover image generation/search — focus on architectural lighting, LED panels, luminaires, or modern interior design"
}
`.trim()

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
const stripScriptTags = (text: string): string =>
  text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

const parseJsonText = (raw: string): unknown => {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(cleaned)
}

// ----------------------------------------------------------------
// Per-model callers — each returns raw text
// ----------------------------------------------------------------
type ModelRunner = { label: string; run: () => Promise<string> }

const llamaRunner = (article: { title: string; url: string; description: string }): ModelRunner => ({
  label: 'llama-3.3-70b-versatile',
  run: async () => {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY não configurada')
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(article) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })
    return completion.choices[0]?.message?.content ?? ''
  },
})

const geminiRunner = (article: { title: string; url: string; description: string }): ModelRunner => ({
  label: 'gemini-3.1-flash-lite',
  run: async () => {
    const result = await gemini.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\n${buildUserPrompt(article)}` }] }],
    })
    return result.response.text()
  },
})

const gemmaRunner = (article: { title: string; url: string; description: string }): ModelRunner => ({
  label: 'gemma-3-27b-it',
  run: async () => {
    const result = await gemma.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\n${buildUserPrompt(article)}` }] }],
    })
    return result.response.text()
  },
})

const gemma4Runner = (article: { title: string; url: string; description: string }): ModelRunner => ({
  label: 'gemma-4-31b-it',
  run: async () => {
    const result = await gemma4.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\n${buildUserPrompt(article)}` }] }],
    })
    return result.response.text()
  },
})

function buildRunners(
  article: { title: string; url: string; description: string },
  density: 'dense' | 'general',
): ModelRunner[] {
  if (density === 'dense') {
    // Dense: Llama 70B → Gemma 3 27B → Gemma 4 31B
    return [llamaRunner(article), gemmaRunner(article), gemma4Runner(article)]
  }
  // General: Gemini Flash Lite → Gemma 3 27B → Gemma 4 31B
  return [geminiRunner(article), gemmaRunner(article), gemma4Runner(article)]
}

// ----------------------------------------------------------------
// Public entry point — cascade with 3 total attempts
// ----------------------------------------------------------------
const MAX_ATTEMPTS = 3

export const generatePostContent = async (article: {
  title: string
  url: string
  description: string
  density?: 'dense' | 'general'
}): Promise<GeneratedPost> => {
  const density = article.density ?? 'general'
  const runners = buildRunners(article, density)
  console.info(`[content-generator] density=${density} → cascade: ${runners.map(r => r.label).join(' → ')}`)
  let lastError: Error = new Error('Nenhuma tentativa realizada')

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const runner = runners[i % runners.length]
    try {
      const rawText = await runner.run()
      const raw = parseJsonText(rawText)
      const parsed = GeneratedPostSchema.safeParse(raw)
      if (!parsed.success) {
        throw new Error(`Formato inválido: ${parsed.error.issues[0]?.message}`)
      }
      console.info(`[content-generator] sucesso com ${runner.label} (tentativa ${i + 1})`)
      const cleanContent = stripScriptTags(parsed.data.content)
      const embrasClosing = await generateEmbrasClosing(parsed.data.title, parsed.data.excerpt, article.description)
      return {
        ...parsed.data,
        content: `${cleanContent}\n${embrasClosing}`,
        excerpt: stripScriptTags(parsed.data.excerpt),
        title: stripScriptTags(parsed.data.title),
        model_used: runner.label,
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(`[content-generator] ${runner.label} falhou (tentativa ${i + 1}/${MAX_ATTEMPTS}): ${lastError.message}`)
    }
  }

  throw new Error(`Todos os modelos falharam após ${MAX_ATTEMPTS} tentativas. Último erro: ${lastError.message}`)
}
