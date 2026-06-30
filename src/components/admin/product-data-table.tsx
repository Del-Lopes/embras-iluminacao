'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DeleteProductButton } from '@/components/admin/delete-product-button'
import { AdminPagination } from '@/components/admin/admin-pagination'
import { bulkDeleteProductsAction } from '@/server/product.actions'
import type { ProductRow } from '@/server/product.actions'
import type { ProductStatus } from '@/lib/db/schema'
import type { VariantProps } from 'class-variance-authority'
import type { badgeVariants } from '@/components/ui/badge'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

const STATUS_VARIANT: Record<ProductStatus, BadgeVariant> = {
  published: 'published',
  draft: 'draft',
}

const STATUS_LABEL: Record<ProductStatus, string> = {
  published: 'Publicado',
  draft: 'Rascunho',
}

const ENV_LABEL: Record<string, string> = {
  interno: 'Interno',
  externo: 'Externo',
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

  // Clicking the active column toggles direction; a new column starts at its default.
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
// ProductDataTable
// ----------------------------------------------------------------
type Props = {
  products: ProductRow[]
  total: number
  page: number
  pageCount: number
  searchParams: Record<string, string>
}

export const ProductDataTable = ({ products, total, page, pageCount, searchParams }: Props) => {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  if (products.length === 0) {
    return (
      <div className="data-table-empty">
        <p>Nenhum produto encontrado.</p>
      </div>
    )
  }

  const allIds = products.map((p) => p.id)
  const allSelected = allIds.every((id) => selected.has(id))
  const someSelected = selected.size > 0

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(allIds))

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const handleBulkDelete = () => {
    if (!confirm(`Excluir ${selected.size} produto${selected.size !== 1 ? 's' : ''}?\nEsta ação não pode ser desfeita.`)) return
    startTransition(async () => {
      await bulkDeleteProductsAction(Array.from(selected))
      setSelected(new Set())
    })
  }

  return (
    <div className="data-table-container">
      <div className="bulk-action-bar">
        <p className="data-table-count" style={{ marginBottom: 0 }}>
          {total} produto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
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
            <TableHead>Categoria</TableHead>
            <SortHeader label="Publicação" sortKey="published_at" defaultDir="desc" searchParams={searchParams} />
            <SortHeader label="Atualizado" sortKey="updated_at" defaultDir="desc" searchParams={searchParams} />
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id} data-selected={selected.has(product.id) ? 'true' : undefined}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selected.has(product.id)}
                  onChange={() => toggleOne(product.id)}
                  className="bulk-checkbox"
                  aria-label={`Selecionar "${product.name}"`}
                />
              </TableCell>
              <TableCell>
                <div className="product-thumb">
                  {product.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.cover_image} alt={product.name} className="product-thumb-img" />
                  ) : (
                    <span className="product-thumb-empty" aria-hidden="true" />
                  )}
                </div>
              </TableCell>
              <TableCell>
                {product.status === 'published' ? (
                  <a
                    href={`/catalogo/${product.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="post-title-cell post-title-link"
                  >
                    {product.name}
                  </a>
                ) : (
                  <span className="post-title-cell">{product.name}</span>
                )}
                <span className="post-slug-cell">
                  SKU: {product.sku} · {ENV_LABEL[product.environment] ?? product.environment}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[product.status]}>{STATUS_LABEL[product.status]}</Badge>
              </TableCell>
              <TableCell>
                {product.categories.length > 0
                  ? product.categories.map((c) => c.name).join(', ')
                  : '—'}
              </TableCell>
              <TableCell>{formatDate(product.published_at)}</TableCell>
              <TableCell>{formatDate(product.updated_at)}</TableCell>
              <TableCell className="text-right">
                <div className="row-actions">
                  <Link href={`/admin/products/${product.id}/edit`} className="action-btn action-btn--edit">
                    Editar
                  </Link>
                  <DeleteProductButton productId={product.id} productName={product.name} />
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
