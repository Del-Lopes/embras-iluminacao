import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { getPublishedProjects } from '@/server/project.actions'

export const metadata: Metadata = {
  title: 'Projetos',
  description:
    'Portfólio de projetos Embras — intervenções de iluminação que valorizam a arquitetura.',
}

const PAGE_SIZE = 9

type SearchParams = Promise<{ page?: string }>

export default async function ProjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))

  const { projects, total, pageCount } = await getPublishedProjects(page, PAGE_SIZE)

  const buildHref = (p: number) => (p > 1 ? `/projetos?page=${p}` : '/projetos')

  return (
    <main className="min-h-screen bg-(--color-bg)">
      <Header variant="solid" />

      {/* ── Hero ── */}
      <div className="blog-index-hero blog-index-hero--banner" style={{ backgroundImage: 'url(/images/catalogo-bg.webp)' }}>
        <div className="blog-index-hero-inner">
          <h1 className="blog-index-title">Projetos</h1>
          <p className="blog-index-desc">
            Onde a luz encontra a arquitetura — uma seleção dos nossos projetos.
          </p>
        </div>
      </div>

      {/* ── Grid ── */}
      <section className="projects-index-body">
        {total === 0 ? (
          <p className="blog-grid-empty">Nenhum projeto publicado ainda.</p>
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

      <Footer />
    </main>
  )
}
