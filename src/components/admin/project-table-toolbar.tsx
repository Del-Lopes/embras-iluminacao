'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import type { ProjectStatus } from '@/lib/db/schema'

const FEATURED_OPTIONS = [
  { label: 'Todos os projetos', value: '' },
  { label: 'Somente destaques', value: 'featured' },
  { label: 'Sem destaque', value: 'normal' },
]

const STATUS_OPTIONS: { label: string; value: ProjectStatus | 'all' }[] = [
  { label: 'Todos os status', value: 'all' },
  { label: 'Publicado', value: 'published' },
  { label: 'Rascunho', value: 'draft' },
]

type Props = {
  currentStatus: ProjectStatus | 'all'
  currentQ: string
  currentLocation: string
  currentFrom: string
  currentTo: string
  currentFeatured: string
  locations: string[]
}

export const ProjectTableToolbar = ({
  currentStatus,
  currentQ,
  currentLocation,
  currentFrom,
  currentTo,
  currentFeatured,
  locations,
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
      <form className="toolbar-search" onSubmit={handleSearch}>
        <input
          name="q"
          type="search"
          className="toolbar-input"
          placeholder="Buscar por nome ou local..."
          defaultValue={currentQ}
        />
        <button type="submit" className="toolbar-search-btn">Buscar</button>
      </form>

      <select
        className="toolbar-select"
        value={currentStatus}
        onChange={(e) => updateParams({ status: e.target.value === 'all' ? '' : e.target.value })}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Local: lista fechada com os locais já cadastrados. O filtro compara
          por igualdade, então digitar livremente só produziria resultado vazio. */}
      <select
        className="toolbar-select"
        value={currentLocation}
        aria-label="Filtrar por local"
        onChange={(e) => updateParams({ location: e.target.value })}
      >
        <option value="">Todos os locais</option>
        {locations.map((loc) => (
          <option key={loc} value={loc}>{loc}</option>
        ))}
      </select>

      <select
        className="toolbar-select"
        value={currentFeatured}
        aria-label="Filtrar por destaque"
        onChange={(e) => updateParams({ featured: e.target.value })}
      >
        {FEATURED_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Intervalo de publicação, inclusivo nas duas pontas. Mesmo par de
          campos usado nas toolbars de produtos e posts. */}
      <div className="toolbar-date-range">
        <input
          type="date"
          className="toolbar-input toolbar-date"
          value={currentFrom}
          onChange={(e) => updateParams({ from: e.target.value })}
          title="Publicado a partir de"
          aria-label="Publicado a partir de"
        />
        <span className="toolbar-date-sep">→</span>
        <input
          type="date"
          className="toolbar-input toolbar-date"
          value={currentTo}
          onChange={(e) => updateParams({ to: e.target.value })}
          title="Publicado até"
          aria-label="Publicado até"
        />
        {(currentFrom || currentTo) && (
          <button
            type="button"
            className="toolbar-clear-date"
            onClick={() => updateParams({ from: '', to: '' })}
            title="Limpar datas"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
