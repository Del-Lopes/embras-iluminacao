import Link from 'next/link'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DeletePostButton } from '@/components/admin/delete-post-button'
import type { PostStatus, PostWithRelations } from '@/lib/db/schema'
import type { VariantProps } from 'class-variance-authority'
import type { badgeVariants } from '@/components/ui/badge'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

const STATUS_VARIANT: Partial<Record<PostStatus, BadgeVariant>> = {
  published: 'published',
  draft: 'draft',
  scheduled: 'scheduled',
}

// ----------------------------------------------------------------
// Pagination
// ----------------------------------------------------------------
type PaginationProps = {
  page: number
  pageCount: number
  searchParams: Record<string, string>
}

const Pagination = ({ page, pageCount, searchParams }: PaginationProps) => {
  if (pageCount <= 1) return null

  const buildHref = (p: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(p))
    return `?${params.toString()}`
  }

  return (
    <div className="pagination">
      <Link
        href={buildHref(page - 1)}
        className={`pagination-btn${page <= 1 ? ' pagination-btn--disabled' : ''}`}
        aria-disabled={page <= 1}
        tabIndex={page <= 1 ? -1 : undefined}
      >
        ← Anterior
      </Link>

      <span className="pagination-info">
        Página {page} de {pageCount}
      </span>

      <Link
        href={buildHref(page + 1)}
        className={`pagination-btn${page >= pageCount ? ' pagination-btn--disabled' : ''}`}
        aria-disabled={page >= pageCount}
        tabIndex={page >= pageCount ? -1 : undefined}
      >
        Próxima →
      </Link>
    </div>
  )
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
const STATUS_LABEL: Partial<Record<PostStatus, string>> = {
  published: 'Publicado',
  draft: 'Rascunho',
  scheduled: 'Agendado',
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso))

const formatScheduledAt = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso))

// ----------------------------------------------------------------
// PostDataTable (Server Component)
// ----------------------------------------------------------------
type Props = {
  posts: PostWithRelations[]
  total: number
  page: number
  pageCount: number
  searchParams: Record<string, string>
}

export const PostDataTable = ({ posts, total, page, pageCount, searchParams }: Props) => {
  if (posts.length === 0) {
    return (
      <div className="data-table-empty">
        <p>Nenhum post encontrado.</p>
      </div>
    )
  }

  return (
    <div className="data-table-container">
      <p className="data-table-count">
        {total} post{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Autor</TableHead>
            <TableHead>Atualizado</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => (
            <TableRow key={post.id}>
              <TableCell>
                <span className="post-title-cell">{post.title}</span>
                <span className="post-slug-cell">/{post.slug}</span>
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[post.status]}>{STATUS_LABEL[post.status]}</Badge>
                {post.status === 'scheduled' && post.published_at && (
                  <span className="post-slug-cell mt-1" style={{ fontSize: '11px' }}>
                    {formatScheduledAt(post.published_at)}
                  </span>
                )}
              </TableCell>
              <TableCell>{post.category?.name ?? '—'}</TableCell>
              <TableCell>
                {(() => {
                  const name = post.author?.full_name?.trim()
                  return name && name.toLowerCase() !== 'unnamed' ? name : '—'
                })()}
              </TableCell>
              <TableCell>{formatDate(post.updated_at)}</TableCell>
              <TableCell className="text-right">
                <div className="row-actions">
                  <Link
                    href={`/admin/posts/${post.id}/edit`}
                    className="action-btn action-btn--edit"
                  >
                    Editar
                  </Link>
                  <DeletePostButton postId={post.id} postTitle={post.title} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination page={page} pageCount={pageCount} searchParams={searchParams} />
    </div>
  )
}
