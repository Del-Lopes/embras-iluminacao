import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
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

export default async function LogsPage() {
  const supabase = await createSupabaseServerClient()

  const { data: logs } = await supabase
    .from('ai_automation_logs')
    .select('id, post_id, model_version, token_usage, generation_date, posts(id, title, slug)')
    .order('generation_date', { ascending: false })
    .limit(200)

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
              {logs.length} registro{logs.length !== 1 ? 's' : ''} encontrado{logs.length !== 1 ? 's' : ''}
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
        </div>
      )}
    </div>
  )
}
