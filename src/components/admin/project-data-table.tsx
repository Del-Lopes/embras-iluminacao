'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DeleteProjectButton } from '@/components/admin/delete-project-button'
import { AdminPagination } from '@/components/admin/admin-pagination'
import { bulkDeleteProjectsAction } from '@/server/project.actions'
import { useConfirm } from '@/components/ui/confirm-dialog'
import type { ProjectRow } from '@/server/project.actions'
import type { ProjectStatus } from '@/lib/db/schema'
import type { VariantProps } from 'class-variance-authority'
import type { badgeVariants } from '@/components/ui/badge'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

const STATUS_VARIANT: Record<ProjectStatus, BadgeVariant> = {
  published: 'published',
  draft: 'draft',
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  published: 'Publicado',
  draft: 'Rascunho',
}

const formatDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(iso))
    : '—'

// ----------------------------------------------------------------
// Sortable column header
// ----------------------------------------------------------------
type SortHeaderProps = {
  label: string
  sortKey: string
  defaultDir: 'asc' | 'desc'
  searchParams: Record<string, string>
  className?: string
}

const SortHeader = ({ label, sortKey, defaultDir, searchParams, className }: SortHeaderProps) => {
  const activeSort = searchParams.sort || 'updated_at'
  const activeDir = (searchParams.dir as 'asc' | 'desc') || 'desc'
  const isActive = activeSort === sortKey

  const nextDir = isActive ? (activeDir === 'asc' ? 'desc' : 'asc') : defaultDir

  const params = new URLSearchParams(searchParams)
  params.set('sort', sortKey)
  params.set('dir', nextDir)
  params.delete('page')

  const arrow = isActive ? (activeDir === 'asc' ? '↑' : '↓') : ''

  return (
    <TableHead className={className}>
      <Link href={`?${params.toString()}`} className="sort-header">
        <span>{label}</span>
        <span className="sort-header-arrow">{arrow}</span>
      </Link>
    </TableHead>
  )
}

// ----------------------------------------------------------------
// ProjectDataTable
// ----------------------------------------------------------------
type Props = {
  projects: ProjectRow[]
  total: number
  page: number
  pageCount: number
  searchParams: Record<string, string>
}

export const ProjectDataTable = ({ projects, total, page, pageCount, searchParams }: Props) => {
  const confirm = useConfirm()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  if (projects.length === 0) {
    return (
      <div className="data-table-empty">
        <p>Nenhum projeto encontrado.</p>
      </div>
    )
  }

  const allIds = projects.map((p) => p.id)
  const allSelected = allIds.every((id) => selected.has(id))
  const someSelected = selected.size > 0

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allIds))

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const handleBulkDelete = async () => {
    const ok = await confirm({
      title: `Excluir ${selected.size} projeto${selected.size !== 1 ? 's' : ''}?`,
      description: 'Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      destructive: true,
    })
    if (!ok) return
    startTransition(async () => {
      await bulkDeleteProjectsAction(Array.from(selected))
      setSelected(new Set())
    })
  }

  return (
    <div className="data-table-container">
      <div className="bulk-action-bar">
        <p className="data-table-count" style={{ marginBottom: 0 }}>
          {total} projeto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
        </p>
        {someSelected && (
          <button className="action-btn action-btn--delete" onClick={handleBulkDelete} disabled={isPending}>
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
            <TableHead style={{ width: 64 }}>Capa</TableHead>
            <SortHeader label="Nome" sortKey="name" defaultDir="asc" searchParams={searchParams} />
            <TableHead>Status</TableHead>
            <TableHead>Local</TableHead>
            <SortHeader label="Publicação" sortKey="published_at" defaultDir="desc" searchParams={searchParams} />
            <SortHeader label="Atualizado" sortKey="updated_at" defaultDir="desc" searchParams={searchParams} />
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id} data-selected={selected.has(project.id) ? 'true' : undefined}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selected.has(project.id)}
                  onChange={() => toggleOne(project.id)}
                  className="bulk-checkbox"
                  aria-label={`Selecionar "${project.name}"`}
                />
              </TableCell>
              <TableCell>
                <div className="product-thumb">
                  {project.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={project.cover_image} alt={project.name} className="product-thumb-img" />
                  ) : (
                    <span className="product-thumb-empty" aria-hidden="true" />
                  )}
                </div>
              </TableCell>
              <TableCell>
                {project.status === 'published' ? (
                  <a
                    href={`/projetos/${project.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="post-title-cell post-title-link"
                  >
                    {project.name}
                  </a>
                ) : (
                  <span className="post-title-cell">{project.name}</span>
                )}
                <span className="post-slug-cell">
                  /projetos/{project.slug}
                  {project.is_featured ? ' · ★ destaque' : ''}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[project.status]}>{STATUS_LABEL[project.status]}</Badge>
              </TableCell>
              <TableCell>{project.location || '—'}</TableCell>
              <TableCell>{formatDate(project.published_at)}</TableCell>
              <TableCell>{formatDate(project.updated_at)}</TableCell>
              <TableCell className="text-right">
                <div className="row-actions">
                  <Link href={`/admin/projects/${project.id}/edit`} className="action-btn action-btn--edit">
                    Editar
                  </Link>
                  <DeleteProjectButton projectId={project.id} projectName={project.name} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {someSelected && (
        <div className="bulk-action-bar" style={{ marginTop: '12px', marginBottom: 0 }}>
          <span />
          <button className="action-btn action-btn--delete" onClick={handleBulkDelete} disabled={isPending}>
            {isPending ? 'Excluindo…' : `Excluir selecionados (${selected.size})`}
          </button>
        </div>
      )}

      <AdminPagination page={page} pageCount={pageCount} searchParams={searchParams} />
    </div>
  )
}
