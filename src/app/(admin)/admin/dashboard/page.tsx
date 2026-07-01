import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { getPosts } from '@/server/admin.actions'
import { DataTableToolbar } from '@/components/admin/data-table-toolbar'
import { PostDataTable } from '@/components/admin/post-data-table'
import { AiTopicModal } from '@/components/admin/ai-topic-modal'
import { SalesPostModal } from '@/components/admin/sales-post-modal'
import { publishScheduledPosts } from '@/lib/automation/publish-scheduler'
import type { PostStatus } from '@/lib/db/schema'

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
}

type SearchParams = Promise<{
  page?: string
  status?: string
  q?: string
  category_id?: string
  date_from?: string
  date_to?: string
}>

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  // Publish any scheduled posts whose time has arrived
  await publishScheduledPosts()

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const status = (params.status ?? 'all') as PostStatus | 'all'
  const q = params.q ?? ''
  const category_id = params.category_id ?? ''
  const date_from = params.date_from ?? ''
  const date_to = params.date_to ?? ''

  const supabase = await createSupabaseServerClient()

  const [
    { count: totalPosts },
    { count: publishedPosts },
    { count: draftPosts },
    { count: scheduledPosts },
    postsResult,
    { data: categories },
  ] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
    getPosts({ page, status, q, category_id, date_from, date_to }),
    supabase.from('categories').select('id, name').order('name'),
  ])

  // Preserve current filters for pagination links
  const rawParams: Record<string, string> = {}
  if (params.status) rawParams.status = params.status
  if (params.q) rawParams.q = params.q
  if (params.category_id) rawParams.category_id = params.category_id
  if (params.date_from) rawParams.date_from = params.date_from
  if (params.date_to) rawParams.date_to = params.date_to

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Publicações</h1>
          <p className="dashboard-subtitle">Gerenciar posts do blog</p>
        </div>
        <div className="dashboard-header-actions">
          <Link href="/admin/posts/new" className="action-btn action-btn--edit">
            + Novo Post
          </Link>
          <AiTopicModal categories={categories ?? []} />
          <SalesPostModal />
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total de Posts</span>
          <span className="stat-value">{totalPosts ?? 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Publicados</span>
          <span className="stat-value">{publishedPosts ?? 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Rascunhos</span>
          <span className="stat-value">{draftPosts ?? 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Agendados</span>
          <span className="stat-value">{scheduledPosts ?? 0}</span>
        </div>
      </div>

      <DataTableToolbar
        currentStatus={status}
        currentQ={q}
        currentCategoryId={category_id}
        currentDateFrom={date_from}
        currentDateTo={date_to}
        categories={categories ?? []}
      />

      <PostDataTable
        posts={postsResult.posts}
        total={postsResult.total}
        page={postsResult.page}
        pageCount={postsResult.pageCount}
        searchParams={rawParams}
      />
    </div>
  )
}
