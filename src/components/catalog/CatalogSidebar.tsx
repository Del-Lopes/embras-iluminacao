'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

type CategoryOption = { id: string; name: string; slug: string; depth: number }

type Props = {
  categories: CategoryOption[]
  materials: string[]
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

  const hasFilters = currentEnvironment || currentTipo || currentMaterial

  return (
    <aside className="blog-sidebar catalog-sidebar">
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
              <li key={mat}>
                <label className="blog-cat-label">
                  <input
                    type="checkbox"
                    className="blog-cat-check"
                    checked={currentMaterial === mat}
                    onChange={() => toggle('material', currentMaterial, mat)}
                  />
                  <span className="blog-cat-name">{mat}</span>
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
          onClick={() => updateParams({ environment: '', tipo: '', material: '' })}
        >
          Limpar filtros
        </button>
      )}
    </aside>
  )
}
