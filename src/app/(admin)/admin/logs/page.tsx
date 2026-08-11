import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { requireAdmin } from '@/lib/auth/guards'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { DeleteLogButton, DeleteAllLogsButton } from '@/components/admin/delete-log-buttons'

export const metadata: Metadata = {
  title: 'Logs de Geração | Embras Admin',
  robots: { index: false, follow: false },
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso))

type LogRow = {
  id: string
  post_id: string | null
  model_version: string | null
  token_usage: number | null
  generation_date: string
  posts: { id: string; title: string; slug: string } | { id: string; title: string; slug: string }[] | null
}

const PAGE_SIZE = 100

const buildPageList = (page: number, pageCount: number): (number | '…')[] => {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  const left = Math.max(2, page - 2)
  const right = Math.min(pageCount - 1, page + 2)
  if (left > 2) pages.push('…')
  for (let i = left; i <= right; i++) pages.push(i)
  if (right < pageCount - 1) pages.push('…')
  pages.push(pageCount)
  return pages
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  await requireAdmin()

  const params = await searchParams
  const supabase = await createSupabaseServerClient()

  const { count } = await supabase
    .from('ai_automation_logs')
    .select('*', { count: 'exact', head: true })

  const total = count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(pageCount, Math.max(1, parseInt(params.page ?? '1', 10) || 1))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: logs } = await (supabase
    .from('ai_automation_logs')
    .select('id, post_id, model_version, token_usage, generation_date, posts(id, title, slug)')
    .order('generation_date', { ascending: false })
    .range(from, to) as unknown as Promise<{ data: LogRow[] | null }>)

  const pages = buildPageList(page, pageCount)
  const buildHref = (p: number) => `?page=${p}`

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Logs de Geração</h1>
          <p className="dashboard-subtitle">Histórico de criações por IA — modelos utilizados e consumo de tokens</p>
        </div>
      </header>

      {!logs || logs.length === 0 ? (
        <div className="data-table-empty">
          <p>Nenhum log encontrado.</p>
        </div>
      ) : (
        <div className="data-table-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <p className="data-table-count" style={{ marginBottom: 0 }}>
              {total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
              {pageCount > 1 ? ` — página ${page} de ${pageCount}` : ''}
            </p>
            <DeleteAllLogsButton />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Post</TableHead>
                <TableHead>Modelo IA</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const post = Array.isArray(log.posts) ? log.posts[0] : log.posts
                return (
                  <TableRow key={log.id}>
                    <TableCell style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(log.generation_date)}
                    </TableCell>
                    <TableCell>
                      {post ? (
                        <>
                          <Link
                            href={`/admin/posts/${post.id}/edit`}
                            className="post-title-cell post-title-link"
                          >
                            {post.title}
                          </Link>
                          <span className="post-slug-cell">/{post.slug}</span>
                        </>
                      ) : (
                        <span className="post-slug-cell">Post removido</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <code style={{ fontSize: '12px' }}>{log.model_version ?? '—'}</code>
                    </TableCell>
                    <TableCell className="text-right">
                      {log.token_usage != null
                        ? log.token_usage.toLocaleString('pt-BR')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteLogButton logId={log.id} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {pageCount > 1 && (
            <div className="pagination">
              <Link
                href={buildHref(page - 1)}
                className={`pagination-btn${page <= 1 ? ' pagination-btn--disabled' : ''}`}
                aria-disabled={page <= 1}
                tabIndex={page <= 1 ? -1 : undefined}
              >
                ← Anterior
              </Link>

              <div className="pagination-pages">
                {pages.map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
                  ) : (
                    <Link
                      key={p}
                      href={buildHref(p)}
                      className={`pagination-page${p === page ? ' pagination-page--active' : ''}`}
                      aria-current={p === page ? 'page' : undefined}
                    >
                      {p}
                    </Link>
                  )
                )}
              </div>

              <Link
                href={buildHref(page + 1)}
                className={`pagination-btn${page >= pageCount ? ' pagination-btn--disabled' : ''}`}
                aria-disabled={page >= pageCount}
                tabIndex={page >= pageCount ? -1 : undefined}
              >
                Próxima →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
