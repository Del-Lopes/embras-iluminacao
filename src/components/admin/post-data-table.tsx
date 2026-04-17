'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DeletePostButton } from '@/components/admin/delete-post-button'
import { bulkDeletePostsAction } from '@/server/admin.actions'
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

const Pagination = ({ page, pageCount, searchParams }: PaginationProps) => {
  if (pageCount <= 1) return null

  const buildHref = (p: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(p))
    return `?${params.toString()}`
  }

  const pages = buildPageList(page, pageCount)

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
// PostDataTable (Client Component)
// ----------------------------------------------------------------
type Props = {
  posts: PostWithRelations[]
  total: number
  page: number
  pageCount: number
  searchParams: Record<string, string>
}

export const PostDataTable = ({ posts, total, page, pageCount, searchParams }: Props) => {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  if (posts.length === 0) {
    return (
      <div className="data-table-empty">
        <p>Nenhum post encontrado.</p>
      </div>
    )
  }

  const allIds = posts.map((p) => p.id)
  const allSelected = allIds.every((id) => selected.has(id))
  const someSelected = selected.size > 0

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allIds))
    }
  }

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleBulkDelete = () => {
    if (!confirm(`Excluir ${selected.size} post${selected.size !== 1 ? 's' : ''}?\nEsta ação não pode ser desfeita.`)) return
    startTransition(async () => {
      await bulkDeletePostsAction(Array.from(selected))
      setSelected(new Set())
    })
  }

  return (
    <div className="data-table-container">
      <div className="bulk-action-bar">
        <p className="data-table-count" style={{ marginBottom: 0 }}>
          {total} post{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
        </p>
        {someSelected && (
          <button
            className="action-btn action-btn--delete"
            onClick={handleBulkDelete}
            disabled={isPending}
          >
            {isPending ? 'Excluindo…' : `Excluir selecionados (${selected.size})`}
          </button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style={{ width: 40 }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="bulk-checkbox"
                aria-label="Selecionar todos"
              />
            </TableHead>
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
            <TableRow key={post.id} data-selected={selected.has(post.id) ? 'true' : undefined}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selected.has(post.id)}
                  onChange={() => toggleOne(post.id)}
                  className="bulk-checkbox"
                  aria-label={`Selecionar "${post.title}"`}
                />
              </TableCell>
              <TableCell>
                {post.status === 'published' ? (
                  <a
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="post-title-cell post-title-link"
                  >
                    {post.title}
                  </a>
                ) : (
                  <span className="post-title-cell">{post.title}</span>
                )}
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

      {someSelected && (
        <div className="bulk-action-bar" style={{ marginTop: '12px', marginBottom: 0 }}>
          <span />
          <button
            className="action-btn action-btn--delete"
            onClick={handleBulkDelete}
            disabled={isPending}
          >
            {isPending ? 'Excluindo…' : `Excluir selecionados (${selected.size})`}
          </button>
        </div>
      )}

      <Pagination page={page} pageCount={pageCount} searchParams={searchParams} />
    </div>
  )
}
