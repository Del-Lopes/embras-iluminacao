import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectsSidebar } from '@/components/projects/ProjectsSidebar'
import { ProjectsControls } from '@/components/projects/ProjectsControls'
import { getPublishedProjects, getProjectLocations } from '@/server/project.actions'

export const metadata: Metadata = {
  title: 'Projetos',
  description:
    'Portfólio de projetos Embras — intervenções de iluminação que valorizam a arquitetura.',
}

const PAGE_SIZE = 9

type SearchParams = Promise<{
  page?: string
  q?: string
  location?: string
  period?: string
  sort?: string
}>

// location e period são multi-seleção: chegam como lista separada por vírgula.
const parseList = (s: string) =>
  s ? s.split(',').map((v) => v.trim()).filter(Boolean) : []

export default async function ProjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const q = params.q?.trim() ?? ''
  const location = params.location?.trim() ?? ''
  const period = params.period?.trim() ?? ''
  const sort = params.sort?.trim() || 'recentes'

  const [{ projects, total, pageCount }, locations] = await Promise.all([
    getPublishedProjects(page, PAGE_SIZE, {
      q,
      locations: parseList(location),
      periods: parseList(period),
      sort,
    }),
    // Só locais de projetos publicados, e sempre a lista completa: marcar um
    // local não pode fazer os outros sumirem da própria lista.
    getProjectLocations(true),
  ])

  const hasFilters = !!(q || location || period)

  // Os links da paginação carregam os filtros ativos, senão a página 2 voltaria
  // à listagem inteira.
  const buildHref = (p: number) => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (location) sp.set('location', location)
    if (period) sp.set('period', period)
    if (sort !== 'recentes') sp.set('sort', sort)
    if (p > 1) sp.set('page', String(p))
    const query = sp.toString()
    return query ? `/projetos?${query}` : '/projetos'
  }

  return (
    <main className="min-h-screen bg-(--color-bg)">
      <Header variant="solid" />

      {/* ── Hero ── */}
      <div className="blog-index-hero blog-index-hero--banner" style={{ backgroundImage: 'url(/images/catalogo-bg.webp)' }}>
        <div className="blog-index-hero-inner">
          <h1 className="blog-index-title">Projetos</h1>
          <p className="blog-index-desc">
            Onde a luz encontra a arquitetura. Uma seleção dos nossos projetos.
          </p>
        </div>
      </div>

      {/* ── Body: sidebar + grid ── */}
      <div className="blog-index-body">
        <Suspense fallback={<aside className="blog-sidebar catalog-sidebar" />}>
          <ProjectsSidebar
            locations={locations}
            currentQ={q}
            currentLocation={location}
            currentPeriod={period}
          />
        </Suspense>

        <section className="blog-grid-section">
          <div className="catalog-toolbar">
            <Suspense fallback={<div className="catalog-controls" />}>
              <ProjectsControls total={total} currentSort={sort} />
            </Suspense>
          </div>

          {projects.length === 0 ? (
            <p className="blog-grid-empty">
              {hasFilters
                ? 'Nenhum projeto encontrado com esses filtros.'
                : 'Nenhum projeto publicado ainda.'}
            </p>
          ) : (
            <div className="projects-grid">
              {projects.map((project) => (
                <ProjectCard key={project.id} {...project} />
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
