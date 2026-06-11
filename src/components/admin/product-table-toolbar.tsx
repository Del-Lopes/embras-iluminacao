'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import type { ProductStatus } from '@/lib/db/schema'

const STATUS_OPTIONS: { label: string; value: ProductStatus | 'all' }[] = [
  { label: 'Todos os status', value: 'all' },
  { label: 'Publicado', value: 'published' },
  { label: 'Rascunho', value: 'draft' },
]

type Category = { id: string; name: string; depth: number }

type Props = {
  currentStatus: ProductStatus | 'all'
  currentQ: string
  currentCategoryId: string
  currentDateFrom: string
  currentDateTo: string
  categories: Category[]
}

export const ProductTableToolbar = ({
  currentStatus,
  currentQ,
  currentCategoryId,
  currentDateFrom,
  currentDateTo,
  categories,
}: Props) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      params.delete('page')
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value
    updateParams({ q })
  }

  return (
    <div className="toolbar">
      {/* Search — name or SKU */}
      <form className="toolbar-search" onSubmit={handleSearch}>
        <input
          name="q"
          type="search"
          className="toolbar-input"
          placeholder="Buscar por nome ou SKU..."
          defaultValue={currentQ}
        />
        <button type="submit" className="toolbar-search-btn">Buscar</button>
      </form>

      {/* Status */}
      <select
        className="toolbar-select"
        value={currentStatus}
        onChange={(e) => updateParams({ status: e.target.value === 'all' ? '' : e.target.value })}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Category (hierarchical) */}
      <select
        className="toolbar-select"
        value={currentCategoryId}
        onChange={(e) => updateParams({ category_id: e.target.value })}
      >
        <option value="">Todas as categorias</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {`${'— '.repeat(cat.depth)}${cat.name}`}
          </option>
        ))}
      </select>

      {/* Date range (updated_at) */}
      <div className="toolbar-date-range">
        <input
          type="date"
          className="toolbar-input toolbar-date"
          value={currentDateFrom}
          onChange={(e) => updateParams({ date_from: e.target.value })}
          title="Data inicial"
        />
        <span className="toolbar-date-sep">→</span>
        <input
          type="date"
          className="toolbar-input toolbar-date"
          value={currentDateTo}
          onChange={(e) => updateParams({ date_to: e.target.value })}
          title="Data final"
        />
        {(currentDateFrom || currentDateTo) && (
          <button
            type="button"
            className="toolbar-clear-date"
            onClick={() => updateParams({ date_from: '', date_to: '' })}
            title="Limpar datas"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
