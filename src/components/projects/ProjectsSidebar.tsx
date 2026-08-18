'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { PROJECT_PERIODS } from '@/lib/utils/project-periods'

type Props = {
  locations: string[]
  currentQ: string
  currentLocation: string
  currentPeriod: string
}

// Sidebar de filtros da listagem de projetos. Mesma estrutura da CatalogSidebar
// (inline no desktop, drawer no tablet/mobile), com os filtros que fazem
// sentido aqui: busca, local e período.
export function ProjectsSidebar({
  locations,
  currentQ,
  currentLocation,
  currentPeriod,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [open, setOpen] = useState(false)

  // Trava o scroll do body enquanto o drawer está aberto (só tem efeito no
  // tablet/mobile, onde ele é overlay).
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      params.delete('page')
      startTransition(() => router.push(`${pathname}?${params.toString()}`))
    },
    [router, pathname, searchParams]
  )

  const parseList = (s: string) =>
    s ? s.split(',').map((v) => v.trim()).filter(Boolean) : []

  const toggleMulti = (key: string, current: string, value: string) => {
    const list = parseList(current)
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    updateParams({ [key]: next.join(',') })
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value.trim()
    updateParams({ q })
  }

  const hasFilters = !!(currentQ || currentLocation || currentPeriod)
  const clearAll = () => updateParams({ q: '', location: '', period: '' })

  const filterGroups = (
    <>
      {locations.length > 0 && (
        <nav className="blog-sidebar-cats">
          <p className="blog-sidebar-cats-label">Local</p>
          <ul>
            {locations.map((loc) => (
              <li key={loc}>
                <label className="blog-cat-label">
                  <input
                    type="checkbox"
                    className="blog-cat-check"
                    checked={parseList(currentLocation).includes(loc)}
                    onChange={() => toggleMulti('location', currentLocation, loc)}
                  />
                  <span className="blog-cat-name">{loc}</span>
                </label>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Períodos marcados juntos somam (união): "Este mês" + "Mais de 3 anos"
          traz os dois conjuntos, e não a interseção, que seria sempre vazia. */}
      <nav className="blog-sidebar-cats">
        <p className="blog-sidebar-cats-label">Data do projeto</p>
        <ul>
          {PROJECT_PERIODS.map((period) => (
            <li key={period.value}>
              <label className="blog-cat-label">
                <input
                  type="checkbox"
                  className="blog-cat-check"
                  checked={parseList(currentPeriod).includes(period.value)}
                  onChange={() => toggleMulti('period', currentPeriod, period.value)}
                />
                <span className="blog-cat-name">{period.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </nav>

      {hasFilters && (
        <button type="button" className="catalog-clear-filters" onClick={clearAll}>
          Limpar filtros
        </button>
      )}
    </>
  )

  return (
    <aside className="blog-sidebar catalog-sidebar">
      <form onSubmit={handleSearch} className="blog-sidebar-search">
        <input
          name="q"
          type="search"
          defaultValue={currentQ}
          placeholder="Buscar projetos"
          className="blog-sidebar-search-input"
        />
      </form>

      {/* Botão FILTROS: a linha inteira só aparece no tablet/mobile, via CSS. */}
      <div className="catalog-filter-bar">
        <button
          type="button"
          className="catalog-filter-btn"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filtros
        </button>

        {hasFilters && (
          <button
            type="button"
            className="catalog-clear-filters catalog-clear-filters--bar"
            onClick={clearAll}
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div
        className={`catalog-filter-backdrop${open ? ' is-open' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div
        className={`catalog-filters${open ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
      >
        <div className="catalog-filters-head">
          <span className="catalog-filters-title">Filtros</span>
          <button
            type="button"
            className="catalog-filter-close"
            onClick={() => setOpen(false)}
            aria-label="Fechar filtros"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="catalog-filters-scroll">{filterGroups}</div>
      </div>
    </aside>
  )
}
