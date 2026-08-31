import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { BlogSidebar } from '@/components/blog/BlogSidebar'
import { BlogControls } from '@/components/blog/BlogControls'
import { BlogActiveFilters } from '@/components/blog/BlogActiveFilters'
import Footer from '@/components/layout/Footer'
import { PostCard } from '@/components/blog/PostCard'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import type { PostCardData } from '@/components/blog/PostCard'
import { absoluteUrl } from '@/config/seo'

const PAGE_SIZE = 6

type SearchParams = Promise<{ page?: string; q?: string; category?: string; sort?: string }>

// generateMetadata, e não um metadata fixo: com 544 posts a listagem tem
// dezenas de páginas, e todas apontariam a canonical para /blog. Canonical de
// página 2 para a 1 é o padrão que faz o Google tratar a 2 como duplicata e
// parar de dar valor aos links dela — que são justamente os caminhos para os
// posts mais antigos. Cada página aponta para si mesma.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams
}): Promise<Metadata> {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const url = page > 1 ? absoluteUrl(`/blog?page=${page}`) : absoluteUrl('/blog')
  const sufixo = page > 1 ? ` — Página ${page}` : ''

  return {
    title: `Blog de Iluminação: Projetos, LED e Arquitetura${sufixo}`,
    description:
      'Artigos sobre iluminação LED, projetos luminotécnicos, arquitetura e design de interiores, escritos pela equipe da Embras Iluminação.',
    alternates: { canonical: url },
    // A busca e os filtros montam listagens que não são conteúdo próprio: elas
    // saem do índice, mas o robô continua seguindo os links dali para os posts.
    robots: params.q || params.category ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `Blog de Iluminação: Projetos, LED e Arquitetura${sufixo} | Embras Iluminação`,
      description:
        'Artigos sobre iluminação LED, projetos luminotécnicos, arquitetura e design de interiores.',
      url,
      type: 'website',
    },
  }
}

export default async function BlogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const q = params.q?.trim() ?? ''
  const categorySlug = params.category?.trim() ?? ''
  const sort = params.sort?.trim() || 'recentes'

  // category é multi-seleção (lista separada por vírgula)
  const parseList = (s: string) =>
    s ? s.split(',').map((v) => v.trim()).filter(Boolean) : []
  const categorySlugs = parseList(categorySlug)

  const supabase = await createSupabaseServerClient()

  // Slugs de categorias ocultas — indexadas mas não listadas no blog
  const HIDDEN_SLUGS = ['google']

  const { data: allCategories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')

  // Categorias visíveis na sidebar (exclui as ocultas)
  const categories = (allCategories ?? []).filter((c) => !HIDDEN_SLUGS.includes(c.slug))

  // IDs das categorias ocultas — usados para excluir posts da listagem
  const hiddenCategoryIds = (allCategories ?? [])
    .filter((c) => HIDDEN_SLUGS.includes(c.slug))
    .map((c) => c.id)

  // Resolve os slugs selecionados → ids (ignora ocultas e inexistentes)
  const categoryIds = categories
    .filter((c) => categorySlugs.includes(c.slug))
    .map((c) => c.id)

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('posts')
    .select(
      `id, title, slug, excerpt, cover_image, published_at, created_at,
       category:categories(name, slug)`,
      { count: 'exact' }
    )
    .eq('status', 'published')

  // O id entra como desempate por data: há posts publicados no mesmo instante,
  // e sem ele o Postgres pode devolvê-los em ordem diferente a cada consulta,
  // fazendo um post pular de página. A navegação entre posts vizinhos usa a
  // mesma chave composta.
  if (sort === 'az') query = query.order('title', { ascending: true })
  else if (sort === 'za') query = query.order('title', { ascending: false })
  else if (sort === 'antigos')
    query = query.order('published_at', { ascending: true }).order('id', { ascending: true })
  else query = query.order('published_at', { ascending: false }).order('id', { ascending: false })

  query = query.range(from, to)

  // Nunca listar posts de categorias ocultas — independente de filtros
  for (const id of hiddenCategoryIds) {
    query = query.neq('category_id', id)
  }

  if (q) query = query.ilike('title', `%${q}%`)
  if (categoryIds.length) query = query.in('category_id', categoryIds)

  const { data, count } = await query
  const posts = (data ?? []) as unknown as PostCardData[]
  const total = count ?? 0
  const pageCount = Math.ceil(total / PAGE_SIZE)

  const buildHref = (p: number) => {
    const urlParams = new URLSearchParams()
    if (q) urlParams.set('q', q)
    if (categorySlug) urlParams.set('category', categorySlug)
    if (sort && sort !== 'recentes') urlParams.set('sort', sort)
    if (p > 1) urlParams.set('page', String(p))
    const qs = urlParams.toString()
    return qs ? `/blog?${qs}` : '/blog'
  }

  // Janela deslizante de paginação — no máximo 9 números no desktop.
  // A página atual fica centralizada; perto das bordas a janela "encosta".
  const PAGE_WINDOW = 9
  let winStart = Math.max(1, page - 4)
  let winEnd = Math.min(pageCount, winStart + PAGE_WINDOW - 1)
  winStart = Math.max(1, winEnd - PAGE_WINDOW + 1)
  const windowPages = Array.from({ length: winEnd - winStart + 1 }, (_, i) => winStart + i)
  const atFirst = page <= 1
  const atLast = page >= pageCount

  return (
    <main className="min-h-screen bg-(--color-bg)">
      <Header variant="solid" />

      {/* ── Hero ── */}
      <div
        className="blog-index-hero blog-index-hero--banner"
        style={{ backgroundImage: 'url(/images/blog-bg.webp)' }}
      >
        <div className="blog-index-hero-inner">
          <h1 className="blog-index-title">Blog</h1>
          <p className="blog-index-desc">
            Tendências em iluminação, arquitetura e design de interiores para inspirar projetos e decisões.
          </p>
        </div>
      </div>

      {/* ── Body: sidebar + grid ── */}
      <div className="blog-index-body">
        {/* Sidebar — client component, needs Suspense for useSearchParams */}
        <Suspense fallback={<aside className="blog-sidebar" />}>
          <BlogSidebar
            categories={categories ?? []}
            currentQ={q}
            currentCategorySlug={categorySlug}
          />
        </Suspense>

        {/* Grid + pagination */}
        <section className="blog-grid-section">
          <div className="catalog-toolbar">
            <Suspense fallback={<div className="catalog-controls" />}>
              <BlogControls total={total} currentSort={sort} />
            </Suspense>

            {/* Chips dos filtros ativos — abaixo da linha de controles */}
            <Suspense fallback={null}>
              <BlogActiveFilters
                q={q}
                categorySlug={categorySlug}
                categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
              />
            </Suspense>
          </div>

          {posts.length === 0 ? (
            <p className="blog-grid-empty">Nenhum post encontrado.</p>
          ) : (
            <div className="blog-grid">
              {posts.map((post) => (
                <PostCard key={post.id} {...post} />
              ))}
            </div>
          )}

          {pageCount > 1 && (
            <nav className="blog-pagination" aria-label="Paginação">
              {/* Primeira página */}
              {atFirst ? (
                <span className="blog-pagination-page blog-pagination-arrow blog-pagination-page--disabled" aria-hidden="true">«</span>
              ) : (
                <Link href={buildHref(1)} className="blog-pagination-page blog-pagination-arrow" aria-label="Primeira página">«</Link>
              )}

              {/* Página anterior */}
              {atFirst ? (
                <span className="blog-pagination-page blog-pagination-arrow blog-pagination-page--disabled" aria-hidden="true">‹</span>
              ) : (
                <Link href={buildHref(page - 1)} className="blog-pagination-page blog-pagination-arrow" aria-label="Página anterior">‹</Link>
              )}

              {/* Janela de números */}
              {windowPages.map((p) => (
                <Link
                  key={p}
                  href={buildHref(p)}
                  data-far={Math.abs(p - page) > 2 ? 'true' : undefined}
                  className={`blog-pagination-page blog-pagination-num${p === page ? ' blog-pagination-page--active' : ''}`}
                  aria-current={p === page ? 'page' : undefined}
                >
                  {p}
                </Link>
              ))}

              {/* Próxima página */}
              {atLast ? (
                <span className="blog-pagination-page blog-pagination-arrow blog-pagination-page--disabled" aria-hidden="true">›</span>
              ) : (
                <Link href={buildHref(page + 1)} className="blog-pagination-page blog-pagination-arrow" aria-label="Próxima página">›</Link>
              )}

              {/* Última página */}
              {atLast ? (
                <span className="blog-pagination-page blog-pagination-arrow blog-pagination-page--disabled" aria-hidden="true">»</span>
              ) : (
                <Link href={buildHref(pageCount)} className="blog-pagination-page blog-pagination-arrow" aria-label="Última página">»</Link>
              )}
            </nav>
          )}
        </section>
      </div>

      <Footer />
    </main>
  )
}
