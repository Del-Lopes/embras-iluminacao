// ============================================================
// image-providers.ts — Unsplash image fetch utility
// Server-side only. Never import in Client Components.
// ============================================================

export const fetchUnsplashImage = async (query: string): Promise<string | null> => {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) return null

  const url = new URL('https://api.unsplash.com/search/photos')
  url.searchParams.set('query', query)
  url.searchParams.set('per_page', '1')
  url.searchParams.set('orientation', 'landscape')
  url.searchParams.set('content_filter', 'high')

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${accessKey}` },
      next: { revalidate: 3600 },
    })

    if (!res.ok) return null

    const data = await res.json()
    return (data.results?.[0]?.urls?.regular as string) ?? null
  } catch {
    return null
  }
}
