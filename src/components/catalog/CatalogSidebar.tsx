'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

type CategoryOption = { id: string; name: string; slug: string; depth: number }

type MaterialOption = { slug: string; name: string }

type Props = {
  categories: CategoryOption[]
  materials: MaterialOption[]
  currentQ: string
  currentEnvironment: string
  currentTipo: string
  currentMaterial: string
}

const ENVIRONMENTS = [
  { label: 'Área interna', value: 'interno' },
  { label: 'Área externa', value: 'externo' },
]

export function CatalogSidebar({
  categories,
  materials,
  currentQ,
  currentEnvironment,
  currentTipo,
  currentMaterial,
}: Props) {
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
      startTransition(() => router.push(`${pathname}?${params.toString()}`))
    },
    [router, pathname, searchParams]
  )

  // Each facet is single-select; clicking the active value clears it.
  const toggle = (key: string, current: string, value: string) =>
    updateParams({ [key]: current === value ? '' : value })

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value.trim()
    updateParams({ q })
  }

  const hasFilters = currentQ || currentEnvironment || currentTipo || currentMaterial

  return (
    <aside className="blog-sidebar catalog-sidebar">
      {/* Busca */}
      <form onSubmit={handleSearch} className="blog-sidebar-search">
        <input
          name="q"
          type="search"
          defaultValue={currentQ}
          placeholder="Buscar produtos"
          className="blog-sidebar-search-input"
        />
      </form>

      {/* Área de uso */}
      <nav className="blog-sidebar-cats">
        <p className="blog-sidebar-cats-label">Área de uso</p>
        <ul>
          {ENVIRONMENTS.map((env) => (
            <li key={env.value}>
              <label className="blog-cat-label">
                <input
                  type="checkbox"
                  className="blog-cat-check"
                  checked={currentEnvironment === env.value}
                  onChange={() => toggle('environment', currentEnvironment, env.value)}
                />
                <span className="blog-cat-name">{env.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </nav>

      {/* Tipo de produto (árvore de categorias) */}
      {categories.length > 0 && (
        <nav className="blog-sidebar-cats">
          <p className="blog-sidebar-cats-label">Tipo de produto</p>
          <ul>
            {categories.map((cat) => (
              <li key={cat.id} style={{ paddingLeft: cat.depth * 14 }}>
                <label className="blog-cat-label">
                  <input
                    type="checkbox"
                    className="blog-cat-check"
                    checked={currentTipo === cat.slug}
                    onChange={() => toggle('tipo', currentTipo, cat.slug)}
                  />
                  <span className="blog-cat-name">{cat.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Material */}
      {materials.length > 0 && (
        <nav className="blog-sidebar-cats">
          <p className="blog-sidebar-cats-label">Material</p>
          <ul>
            {materials.map((mat) => (
              <li key={mat.slug}>
                <label className="blog-cat-label">
                  <input
                    type="checkbox"
                    className="blog-cat-check"
                    checked={currentMaterial === mat.slug}
                    onChange={() => toggle('material', currentMaterial, mat.slug)}
                  />
                  <span className="blog-cat-name">{mat.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {hasFilters && (
        <button
          type="button"
          className="catalog-clear-filters"
          onClick={() => updateParams({ q: '', environment: '', tipo: '', material: '' })}
        >
          Limpar filtros
        </button>
      )}
    </aside>
  )
}
