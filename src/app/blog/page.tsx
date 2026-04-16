import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { BlogHeader } from '@/components/blog/BlogHeader'
import { BlogSidebar } from '@/components/blog/BlogSidebar'
import Footer from '@/components/layout/Footer'
import { PostCard } from '@/components/blog/PostCard'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import type { PostCardData } from '@/components/blog/PostCard'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Conteúdo sobre iluminação, arquitetura, design de interiores e tendências do setor.',
}

const PAGE_SIZE = 6

type SearchParams = Promise<{ page?: string; q?: string; category?: string }>

export default async function BlogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const q = params.q?.trim() ?? ''
  const categorySlug = params.category?.trim() ?? ''

  const supabase = await createSupabaseServerClient()

  // Slugs de categorias ocultas — indexadas mas não listadas no blog
  const HIDDEN_SLUGS = ['google']

  // Redireciona para /blog se alguém tentar filtrar por uma categoria oculta
  if (categorySlug && HIDDEN_SLUGS.includes(categorySlug)) {
    redirect('/blog')
  }

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

  // Resolve category_id from slug — ignora slugs ocultos
  let categoryId = ''
  if (categorySlug && !HIDDEN_SLUGS.includes(categorySlug)) {
    const match = categories.find((c) => c.slug === categorySlug)
    categoryId = match?.id ?? ''
  }

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
    .order('published_at', { ascending: false })
    .range(from, to)

  // Nunca listar posts de categorias ocultas — independente de filtros
  for (const id of hiddenCategoryIds) {
    query = query.neq('category_id', id)
  }

  if (q) query = query.ilike('title', `%${q}%`)
  if (categoryId) query = query.eq('category_id', categoryId)

  const { data, count } = await query
  const posts = (data ?? []) as unknown as PostCardData[]
  const total = count ?? 0
  const pageCount = Math.ceil(total / PAGE_SIZE)

  const buildHref = (p: number) => {
    const urlParams = new URLSearchParams()
    if (q) urlParams.set('q', q)
    if (categorySlug) urlParams.set('category', categorySlug)
    if (p > 1) urlParams.set('page', String(p))
    const qs = urlParams.toString()
    return qs ? `/blog?${qs}` : '/blog'
  }

  return (
    <main className="min-h-screen bg-(--color-bg)">
      <BlogHeader />

      {/* ── Hero ── */}
      <div className="blog-index-hero">
        <div className="blog-index-hero-inner">
          <h1 className="blog-index-title">Blog</h1>
          <p className="blog-index-desc">
            Tendências em iluminação, arquitetura e design de interiores — conteúdo para inspirar projetos e decisões.
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
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={buildHref(p)}
                  className={`blog-pagination-page${p === page ? ' blog-pagination-page--active' : ''}`}
                  aria-current={p === page ? 'page' : undefined}
                >
                  {p}
                </Link>
              ))}
            </nav>
          )}
        </section>
      </div>

      <Footer />
    </main>
  )
}
