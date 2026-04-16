// ============================================================
// hf-image.ts — HuggingFace FLUX image generation
// Server-side only. Never import in Client Components.
//
// Fallback chain:
//   1. FLUX.2-klein-4B (primary)
//   2. Fake-FLUX-Pro-Unlimited (backup)
//   3. Unsplash
//   4. /images/default-cover.webp (static)
// ============================================================

import { Client } from '@gradio/client'
import { fetchUnsplashImage } from '@/lib/utils/image-providers'

export const DEFAULT_COVER = '/images/default-cover.webp'

export type ImageOrigin = 'flux' | 'imagen4' | 'unsplash' | 'default'

export type CoverImageResult = {
  url: string
  origin: ImageOrigin
}

const TIMEOUT_MS = 35_000
const MAX_RETRIES = 3

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('HF request timeout')), ms)
    ),
  ])

const isRateLimitError = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  return (
    msg.includes('rate') ||
    msg.includes('quota') ||
    msg.includes('limit') ||
    msg.includes('exceeded') ||
    msg.includes('too many')
  )
}

const extractImageUrl = (data: unknown): string | null => {
  if (!data) return null
  // Array response: data[0]
  const item = Array.isArray(data) ? data[0] : data
  if (typeof item === 'string' && item.startsWith('http')) return item
  if (typeof item === 'object' && item !== null) {
    const obj = item as Record<string, unknown>
    if (typeof obj.url === 'string') return obj.url
    if (typeof obj.path === 'string') return obj.path
  }
  return null
}

// ----------------------------------------------------------------
// Primary: black-forest-labs/FLUX.2-klein-4B
// ----------------------------------------------------------------
const tryFluxPrimary = async (prompt: string): Promise<string | null> => {
  const hfToken = process.env.HF_TOKEN
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const client = await withTimeout(
        Client.connect('black-forest-labs/FLUX.2-klein-4B', {
          token: hfToken as `hf_${string}` | undefined,
        }),
        TIMEOUT_MS
      )
      const result = await withTimeout(
        client.predict('/infer', {
          prompt,
          input_images: [],
          mode_choice: 'Distilled (4 steps)',
          seed: 0,
          randomize_seed: true,
          width: 1024,
          height: 1024,
          num_inference_steps: 4,
          guidance_scale: 3,
          prompt_upsampling: false,
        }),
        TIMEOUT_MS
      )
      const url = extractImageUrl(result.data)
      if (url) return url
    } catch (err) {
      if (isRateLimitError(err)) {
        console.warn('[hf-image] FLUX primary: rate limit — skipping to backup')
        return null
      }
      console.warn(`[hf-image] FLUX primary attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err)
    }
  }
  return null
}

// ----------------------------------------------------------------
// Backup: llamameta/Fake-FLUX-Pro-Unlimited
// ----------------------------------------------------------------
const tryFluxBackup = async (prompt: string): Promise<string | null> => {
  const hfToken = process.env.HF_TOKEN
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const client = await withTimeout(
        Client.connect('llamameta/Fake-FLUX-Pro-Unlimited', {
          token: hfToken as `hf_${string}` | undefined,
        }),
        TIMEOUT_MS
      )
      const result = await withTimeout(
        client.predict('/generate_image', {
          prompt,
          model: 'imagen-4-ultra',
        }),
        TIMEOUT_MS
      )
      const url = extractImageUrl(result.data)
      if (url) return url
    } catch (err) {
      if (isRateLimitError(err)) {
        console.warn('[hf-image] FLUX backup: rate limit — skipping to Unsplash')
        return null
      }
      console.warn(`[hf-image] FLUX backup attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err)
    }
  }
  return null
}

// ----------------------------------------------------------------
// Public entry point
// ----------------------------------------------------------------
export const generateCoverImage = async (prompt: string): Promise<CoverImageResult> => {
  // 1. Try primary FLUX
  const primary = await tryFluxPrimary(prompt)
  if (primary) return { url: primary, origin: 'flux' }

  // 2. Try backup FLUX (Imagen 4 Ultra)
  const backup = await tryFluxBackup(prompt)
  if (backup) return { url: backup, origin: 'imagen4' }

  // 3. Try Unsplash
  const unsplash = await fetchUnsplashImage(prompt)
  if (unsplash) return { url: unsplash, origin: 'unsplash' }

  // 4. Static default
  return { url: DEFAULT_COVER, origin: 'default' }
}
