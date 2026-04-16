// ============================================================
// news-curation.ts — Category-aware RSS + NewsAPI aggregator
// Server-side only. Never import in Client Components.
//
// Filter order:
//   1. Date (most recent first, 7-day window)
//   2. Source diversity (max 3 per source, expand if needed)
//   3. Relevance score
// ============================================================

import { fetchMultipleFeeds } from './rss-fetcher'

export type NewsArticle = {
  title: string
  url: string
  description: string
  source: string
  publishedAt: string
  /** Set by article-curator after AI classification. Undefined on pre-scored fallback (treated as 'general'). */
  density?: 'dense' | 'general'
}

// ──────────────────────────────────────────────────────────────
// Category definition
// ──────────────────────────────────────────────────────────────
type Category = 'lighting' | 'architecture' | 'interior' | 'trends'

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  lighting: [
    'iluminação', 'iluminacao', 'led', 'luminária', 'luminaria',
    'lighting', 'lamp', 'lâmpada', 'lampada', 'poste', 'projetor',
    'lustre', 'pendente', 'downlight', 'luminar', 'illumination', 'fixture',
  ],
  architecture: [
    'arquitetura', 'architecture', 'projeto', 'edifício', 'edificio',
    'construção', 'construcao', 'fachada', 'urbano', 'urban', 'building',
  ],
  interior: [
    'interior', 'interiores', 'decoração', 'decoracao', 'decor',
    'ambientes', 'ambientação', 'sala', 'quarto', 'cozinha', 'banheiro',
    'furniture', 'mobiliário', 'mobiliario', 'design de interiores',
  ],
  trends: ['tendências', 'tendencias', 'trends', 'trend', 'novidades'],
}

function detectCategory(topic: string): Category {
  const t = topic.toLowerCase()
  // Check lighting first (most specific to the business)
  if (CATEGORY_KEYWORDS.lighting.some((kw) => t.includes(kw))) return 'lighting'
  if (CATEGORY_KEYWORDS.interior.some((kw) => t.includes(kw))) return 'interior'
  if (CATEGORY_KEYWORDS.architecture.some((kw) => t.includes(kw))) return 'architecture'
  if (CATEGORY_KEYWORDS.trends.some((kw) => t.includes(kw))) return 'trends'
  return 'trends'
}

// ──────────────────────────────────────────────────────────────
// Bilingual query expansion (Portuguese → English equivalents)
// Applied to the NewsAPI `q` parameter so English feeds return results
// ──────────────────────────────────────────────────────────────
const BILINGUAL_EXPANSION: Array<[RegExp, string[]]> = [
  [/ilumina[çc][aã]o/i, ['lighting', 'illumination']],
  [/luminária/i,        ['luminaire', 'light fixture']],
  [/arquitetura/i,      ['architecture', 'architectural design']],
  [/interiores?/i,      ['interior design', 'interior']],
  [/decoração/i,        ['decor', 'decoration', 'interior decor']],
  [/tend[êe]ncias?/i,   ['trends', 'design trends']],
  [/led\b/i,            ['LED lighting', 'LED technology']],
  [/projetor/i,         ['projector light', 'spotlight']],
  [/pendente/i,         ['pendant light', 'pendant lamp']],
  [/lustres?/i,         ['chandelier', 'light fixture']],
  [/ambient[ae]/i,      ['ambient lighting', 'atmosphere']],
  [/projeto\b/i,        ['lighting project', 'architectural project']],
]

function expandQueryBilingual(topic: string): string {
  const extras = new Set<string>()
  for (const [pattern, equivalents] of BILINGUAL_EXPANSION) {
    if (pattern.test(topic)) equivalents.forEach((e) => extras.add(e))
  }
  if (extras.size === 0) return topic
  return `${topic} OR ${[...extras].join(' OR ')}`
}

// ──────────────────────────────────────────────────────────────
// RSS sources per category
// ──────────────────────────────────────────────────────────────
const RSS_BY_CATEGORY: Record<Category, string[]> = {
  lighting: [
    'https://www.ledinside.com/rss',
    'https://blog.1800lighting.com/feed/',
    'https://blog.1000bulbs.com/home?format=RSS',
    'https://www.led-professional.com/RSS',
    'https://lightingdesign.com/blogs/blog.atom',
    'https://www.okelilights.com/blogs/blog.atom',
  ],
  architecture: [
    'https://www.archdaily.com/feed/',
    'https://www.archpaper.com/feed/',
    'https://www.dezeen.com/feed/',
  ],
  interior: [
    'https://www.dezeen.com/feed/',
    'https://www.designboom.com/feed/',
    'https://www.contemporist.com/feed/',
    'https://www.decoist.com/feed/',
    'https://www.yankodesign.com/feed/',
  ],
  trends: [
    'https://www.archdaily.com/feed/',
    'https://www.dezeen.com/feed/',
    'https://www.designboom.com/feed/',
    'https://www.archpaper.com/feed/',
    'https://www.yankodesign.com/feed/',
    'https://www.contemporist.com/feed/',
    'https://www.decoist.com/feed/',
    'https://www.ledinside.com/rss',
    'https://lightingdesign.com/blogs/blog.atom',
  ],
}

// NewsAPI supplement — only confirmed well-indexed domains; null = skip
const NEWSAPI_DOMAINS: Record<Category, string | null> = {
  lighting: null,
  architecture: 'archdaily.com',
  interior: 'dezeen.com,designboom.com,archdigest.com',
  trends: 'archdaily.com,dezeen.com,designboom.com',
}

// ──────────────────────────────────────────────────────────────
// Source tier (scoring bonus)
// ──────────────────────────────────────────────────────────────
const TIER1_NAMES = new Set([
  'ledinside', 'led-professional', 'lightingdesign', 'lux review',
  'archdaily', 'dezeen', 'architectural record',
])
const TIER2_NAMES = new Set([
  '1800lighting', '1000bulbs', 'okelilights',
  'designboom', 'archpaper', 'contemporist',
  'decoist', 'yanko design', 'architizer',
  'architectural digest', 'elle decor',
])

function sourceTier(sourceName: string): 0 | 1 | 2 {
  const s = sourceName.toLowerCase()
  if ([...TIER1_NAMES].some((n) => s.includes(n))) return 1
  if ([...TIER2_NAMES].some((n) => s.includes(n))) return 2
  return 0
}

// ──────────────────────────────────────────────────────────────
// Keyword lists
// ──────────────────────────────────────────────────────────────
const POSITIVE_KEYWORDS = [
  'lighting', 'light design', 'illumination', 'lighting design',
  'led lighting', 'led panel', 'led strip', 'architectural lighting',
  'interior lighting', 'ambient lighting', 'luminaire', 'luminaires',
  'fixture', 'chandelier', 'pendant light', 'downlight', 'spotlight',
  'floodlight', 'light installation', 'iluminação', 'luminária',
  'design de interiores', 'projeto luminotécnico',
]

const NEGATIVE_KEYWORDS = [
  'celebrity', 'fashion week', 'automobile', 'politics', 'crime',
  'bitcoin', 'crypto', 'startup funding', 'stock market', 'gossip',
  'divorce', 'wedding dress', 'recipe', 'cooking', 'football',
  'soccer', 'basketball', 'tennis',
]

// ──────────────────────────────────────────────────────────────
// Scoring
// ──────────────────────────────────────────────────────────────
function scoreArticle(article: NewsArticle, topic: string, category: Category): number {
  const text = `${article.title} ${article.description}`.toLowerCase()
  let score = 0

  const tier = sourceTier(article.source)
  if (tier === 1) score += 3
  else if (tier === 2) score += 2

  if (CATEGORY_KEYWORDS[category].some((kw) => text.includes(kw))) score += 2

  if (
    text.includes('lighting') || text.includes('illumination') ||
    text.includes('luminaire') || text.includes('iluminação') ||
    text.includes('luminária')
  ) score += 3

  // Topic word matching (handles both pt and en if user mixed)
  const topicWords = topic.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  for (const word of topicWords) {
    if (text.includes(word)) score += 3
  }

  for (const kw of POSITIVE_KEYWORDS) {
    if (text.includes(kw)) score += 2
  }

  for (const kw of NEGATIVE_KEYWORDS) {
    if (text.includes(kw)) score -= 5
  }

  return score
}

const SCORE_THRESHOLD = 1

// ──────────────────────────────────────────────────────────────
// Junk filter & dedup
// ──────────────────────────────────────────────────────────────
function isJunk(article: NewsArticle): boolean {
  if (!article.title || article.title.length < 20) return true
  if (!article.url) return true
  return false
}

function normaliseTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
}

function parseDate(dateStr: string): number {
  if (!dateStr) return 0
  try { return new Date(dateStr).getTime() } catch { return 0 }
}

// ──────────────────────────────────────────────────────────────
// Diversity filter: max N per source, expand if needed
// Filter order: date → diversity → relevance
// ──────────────────────────────────────────────────────────────
function applyDiversityFilter(
  rawScored: Array<{ article: NewsArticle; score: number }>,
  maxPerSource = 3,
  targetCount = 10,
): NewsArticle[] {
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

  // Primary sort: articles within same 7-day window sorted by score;
  // articles >7 days older pushed back by date
  const sorted = [...rawScored].sort((a, b) => {
    const da = parseDate(a.article.publishedAt)
    const db = parseDate(b.article.publishedAt)
    const diff = Math.abs(db - da)
    if (diff > ONE_WEEK_MS) return db - da   // date wins when >1 week apart
    return b.score - a.score                  // same week: relevance wins
  })

  const sourceCount = new Map<string, number>()
  const selected: Array<{ article: NewsArticle; score: number }> = []
  const overflow: Array<{ article: NewsArticle; score: number }> = []

  for (const item of sorted) {
    const key = item.article.source.toLowerCase()
    const count = sourceCount.get(key) ?? 0
    if (count < maxPerSource) {
      selected.push(item)
      sourceCount.set(key, count + 1)
    } else {
      overflow.push(item)
    }
    if (selected.length >= targetCount) break
  }

  // Fill remaining slots from overflow (best-scoring articles beyond the cap)
  if (selected.length < targetCount) {
    overflow.sort((a, b) => b.score - a.score)
    for (const item of overflow) {
      selected.push(item)
      if (selected.length >= targetCount) break
    }
  }

  return selected.map(({ article }) => article)
}

// ──────────────────────────────────────────────────────────────
// NewsAPI supplement fetch
// ──────────────────────────────────────────────────────────────
type RawApiArticle = {
  title?: string
  url?: string
  description?: string
  content?: string
  source?: { name?: string }
  publishedAt?: string
}

async function fetchFromNewsAPI(apiKey: string, topic: string, domains: string): Promise<NewsArticle[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const q = expandQueryBilingual(topic)
    const url = new URL('https://newsapi.org/v2/everything')
    url.searchParams.set('q', q)
    url.searchParams.set('domains', domains)
    url.searchParams.set('sortBy', 'publishedAt')
    url.searchParams.set('pageSize', '20')
    url.searchParams.set('apiKey', apiKey)

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      next: { revalidate: 300 },
    } as RequestInit)
    if (!res.ok) { console.warn(`[news-curation] NewsAPI ${res.status}`); return [] }

    const data = await res.json()
    return ((data.articles ?? []) as RawApiArticle[]).flatMap((a) => {
      const title = a.title?.trim() ?? ''
      const articleUrl = a.url?.trim() ?? ''
      if (!title || !articleUrl) return []
      return [{
        title,
        url: articleUrl,
        description: a.description?.trim() ?? a.content?.trim() ?? '',
        source: a.source?.name ?? '',
        publishedAt: a.publishedAt ?? '',
      }]
    })
  } catch (err) {
    console.warn('[news-curation] NewsAPI fetch failed:', err)
    return []
  } finally {
    clearTimeout(timer)
  }
}

// ──────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────
export const fetchNewsByTopic = async (topic: string): Promise<NewsArticle[]> => {
  const category = detectCategory(topic)
  const apiKey = process.env.NEWS_API_KEY

  const [rssArticles, newsapiArticles] = await Promise.all([
    fetchMultipleFeeds(RSS_BY_CATEGORY[category]),
    apiKey && NEWSAPI_DOMAINS[category]
      ? fetchFromNewsAPI(apiKey, topic, NEWSAPI_DOMAINS[category]!)
      : Promise.resolve([] as NewsArticle[]),
  ])

  const seenTitles = new Set<string>()
  const rawScored: Array<{ article: NewsArticle; score: number }> = []

  for (const article of [...rssArticles, ...newsapiArticles]) {
    if (isJunk(article)) continue
    const norm = normaliseTitle(article.title)
    if (seenTitles.has(norm)) continue
    seenTitles.add(norm)

    const score = scoreArticle(article, topic, category)
    if (score < SCORE_THRESHOLD) continue

    rawScored.push({ article, score })
  }

  return applyDiversityFilter(rawScored, 3, 10)
}
