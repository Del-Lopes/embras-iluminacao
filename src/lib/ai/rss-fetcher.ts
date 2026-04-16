// ============================================================
// rss-fetcher.ts — RSS/Atom feed fetcher
// Server-side only. Never import in Client Components.
//
// Uses fetch() + AbortController for reliable per-feed timeout.
// rss-parser.parseString() is used instead of parseURL() so the
// HTTP layer is fully controlled (avoids socket-only timeout).
// ============================================================

import Parser from 'rss-parser'
import type { NewsArticle } from './news-curation'

const FEED_TIMEOUT_MS = 7000  // 7s per feed; parseURL() socket timeout is unreliable

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; EmbrasBot/1.0; +https://embras.com.br)',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
  },
})

export async function fetchRSSFeed(url: string): Promise<NewsArticle[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EmbrasBot/1.0; +https://embras.com.br)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    })

    if (!res.ok) {
      console.warn(`[rss-fetcher] HTTP ${res.status} for ${url}`)
      return []
    }

    const text = await res.text()
    const feed = await parser.parseString(text)
    const sourceName = feed.title?.trim() || new URL(url).hostname.replace(/^www\./, '')

    return (feed.items ?? []).slice(0, 20).flatMap((item) => {
      const title = item.title?.trim() ?? ''
      const link = item.link?.trim() ?? ''
      if (!title || !link) return []
      return [{
        title,
        url: link,
        description: item.contentSnippet?.trim() ?? item.summary?.trim() ?? '',
        source: sourceName,
        publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
      }]
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[rss-fetcher] Failed ${url}: ${msg.slice(0, 80)}`)
    return []
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchMultipleFeeds(urls: string[]): Promise<NewsArticle[]> {
  const results = await Promise.allSettled(urls.map(fetchRSSFeed))
  return results
    .filter((r): r is PromiseFulfilledResult<NewsArticle[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value)
}
