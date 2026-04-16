// ============================================================
// google-ai-client.ts — Google AI Studio singletons
// Server-side only. Never import in Client Components.
//
// Account 1 (GOOGLE_AI_API_KEY):
//   - gemma  → Gemma 3 27B (Account 1 fallback ranking)
//   - gemini → Gemini Flash Lite (content writing)
//
// Account 2 (GOOGLE_AI_API_KEY_SEARCH):
//   - curationModels → [Gemma 4 31B, Gemma 4 26B, Gemma 3 27B] (cascade curation)
//   - geminiSearch   → Gemini 2.0 Flash + Google Search Grounding (unused / future)
//   - All null when key is not configured (graceful degradation)
// ============================================================

import { GoogleGenerativeAI } from '@google/generative-ai'

if (!process.env.GOOGLE_AI_API_KEY) {
  throw new Error('GOOGLE_AI_API_KEY não configurada')
}

// Account 1 — Content writing + last-resort ranking fallback
const ai1 = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)

export const gemma = ai1.getGenerativeModel({ model: 'gemma-3-27b-it' })

export const gemma4 = ai1.getGenerativeModel({ model: 'gemma-4-31b-it' })

export const gemini = ai1.getGenerativeModel({
  model: 'gemini-3.1-flash-lite-preview',
})

// Account 2 — Curation cascade + Search Grounding (null when key not set)
const ai2 = process.env.GOOGLE_AI_API_KEY_SEARCH
  ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY_SEARCH)
  : null

export type CurationModel = { label: string; model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> }

export const curationModels: CurationModel[] = ai2
  ? [
      { label: 'Gemma 4 31B',       model: ai2.getGenerativeModel({ model: 'gemma-4-31b-it' }) },
      { label: 'Gemini Flash Lite',  model: ai2.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' }) },
      { label: 'Gemma 4 26B (MoE)', model: ai2.getGenerativeModel({ model: 'gemma-4-26b-a4b-it' }) },
    ]
  : []

export const geminiSearch = ai2
  ? ai2.getGenerativeModel({ model: 'gemini-2.0-flash' })
  : null
