import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { getProjects, getProjectLocations } from '@/server/project.actions'
import { ProjectTableToolbar } from '@/components/admin/project-table-toolbar'
import { ProjectDataTable } from '@/components/admin/project-data-table'
import type { ProjectStatus } from '@/lib/db/schema'

export const metadata: Metadata = {
  title: 'Projetos',
  robots: { index: false, follow: false },
}

type SearchParams = Promise<{
  page?: string
  status?: string
  q?: string
  sort?: string
  dir?: string
  location?: string
  from?: string
  to?: string
  featured?: string
}>

export default async function ProjectsDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const status = (params.status ?? 'all') as ProjectStatus | 'all'
  const q = params.q ?? ''
  const sort = params.sort ?? ''
  const dir = params.dir ?? ''
  const location = params.location ?? ''
  const from = params.from ?? ''
  const to = params.to ?? ''
  const featured = params.featured ?? ''

  const supabase = await createSupabaseServerClient()

  const [
    { count: totalProjects },
    { count: publishedProjects },
    { count: draftProjects },
    projectsResult,
    locations,
  ] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    getProjects({ page, status, q, sort, dir, location, from, to, featured }),
    // Opções do filtro de local: sempre a lista completa, e não só a dos
    // projetos filtrados, senão escolher um local esvaziaria o próprio select.
    getProjectLocations(),
  ])

  // Preserva filtros + sort para os links de paginação / ordenação.
  const rawParams: Record<string, string> = {}
  if (params.status) rawParams.status = params.status
  if (params.q) rawParams.q = params.q
  if (params.sort) rawParams.sort = params.sort
  if (params.dir) rawParams.dir = params.dir
  if (params.location) rawParams.location = params.location
  if (params.from) rawParams.from = params.from
  if (params.to) rawParams.to = params.to
  if (params.featured) rawParams.featured = params.featured

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Projetos</h1>
          <p className="dashboard-subtitle">Gerenciar o portfólio de projetos exibido na home</p>
        </div>
        <div className="dashboard-header-actions">
          <Link href="/admin/projects/new" className="action-btn action-btn--edit">
            + Novo Projeto
          </Link>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total de Projetos</span>
          <span className="stat-value">{totalProjects ?? 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Publicados</span>
          <span className="stat-value">{publishedProjects ?? 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Rascunhos</span>
          <span className="stat-value">{draftProjects ?? 0}</span>
        </div>
      </div>

      <ProjectTableToolbar
        currentStatus={status}
        currentQ={q}
        currentLocation={location}
        currentFrom={from}
        currentTo={to}
        currentFeatured={featured}
        locations={locations}
      />

      <ProjectDataTable
        projects={projectsResult.projects}
        total={projectsResult.total}
        page={projectsResult.page}
        pageCount={projectsResult.pageCount}
        searchParams={rawParams}
      />
    </div>
  )
}
