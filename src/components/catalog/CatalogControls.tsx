'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

type Props = {
  total: number
  currentSort: string
  currentView: 'grid' | 'list'
}

const SORT_OPTIONS = [
  { label: 'Mais recentes', value: 'recentes' },
  { label: 'Mais antigos', value: 'antigos' },
  { label: 'Nome (A–Z)', value: 'az' },
  { label: 'Nome (Z–A)', value: 'za' },
]

export function CatalogControls({ total, currentSort, currentView }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const setParam = useCallback(
    (key: string, value: string, resetPage = false) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      if (resetPage) params.delete('page')
      startTransition(() => router.push(`${pathname}?${params.toString()}`))
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="catalog-controls">
      <p className="catalog-count">
        Exibindo {total} produto{total !== 1 ? 's' : ''}
      </p>

      <div className="catalog-controls-right">
        <select
          className="toolbar-select"
          value={currentSort}
          onChange={(e) => setParam('sort', e.target.value, true)}
          aria-label="Ordenar"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <div className="catalog-view-toggle" role="group" aria-label="Modo de exibição">
          <button
            type="button"
            className={`catalog-view-btn${currentView === 'grid' ? ' catalog-view-btn--active' : ''}`}
            onClick={() => setParam('view', 'grid')}
            aria-pressed={currentView === 'grid'}
            title="Grade"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </button>
          <button
            type="button"
            className={`catalog-view-btn${currentView === 'list' ? ' catalog-view-btn--active' : ''}`}
            onClick={() => setParam('view', 'list')}
            aria-pressed={currentView === 'list'}
            title="Lista"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
