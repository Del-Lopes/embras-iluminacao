'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

type CategoryOption = { id: string; name: string; slug: string; depth: number }

type MaterialOption = { slug: string; name: string }

type Props = {
  categories: CategoryOption[]
  materials: MaterialOption[]
  soquetes: MaterialOption[]
  currentQ: string
  currentEnvironment: string
  currentTipo: string
  currentMaterial: string
  currentSoquete: string
}

const ENVIRONMENTS = [
  { label: 'Todas', value: '' },
  { label: 'Área interna', value: 'interno' },
  { label: 'Área externa', value: 'externo' },
]

export function CatalogSidebar({
  categories,
  materials,
  soquetes,
  currentQ,
  currentEnvironment,
  currentTipo,
  currentMaterial,
  currentSoquete,
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

  const parseList = (s: string) =>
    s ? s.split(',').map((v) => v.trim()).filter(Boolean) : []

  // Multi-seleção (checkbox): adiciona/remove o valor da lista
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

  const hasFilters =
    currentQ || currentEnvironment || currentTipo || currentMaterial || currentSoquete

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

      {/* Área de uso — seleção única (radio) */}
      <nav className="blog-sidebar-cats">
        <p className="blog-sidebar-cats-label">Área de uso</p>
        <ul>
          {ENVIRONMENTS.map((env) => (
            <li key={env.value}>
              <label className="blog-cat-label">
                <input
                  type="radio"
                  name="environment"
                  className="blog-cat-radio"
                  checked={currentEnvironment === env.value}
                  onChange={() => updateParams({ environment: env.value })}
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
                    checked={parseList(currentTipo).includes(cat.slug)}
                    onChange={() => toggleMulti('tipo', currentTipo, cat.slug)}
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
                    checked={parseList(currentMaterial).includes(mat.slug)}
                    onChange={() => toggleMulti('material', currentMaterial, mat.slug)}
                  />
                  <span className="blog-cat-name">{mat.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Tipo de soquete */}
      {soquetes.length > 0 && (
        <nav className="blog-sidebar-cats">
          <p className="blog-sidebar-cats-label">Tipo de soquete</p>
          <ul>
            {soquetes.map((soq) => (
              <li key={soq.slug}>
                <label className="blog-cat-label">
                  <input
                    type="checkbox"
                    className="blog-cat-check"
                    checked={parseList(currentSoquete).includes(soq.slug)}
                    onChange={() => toggleMulti('soquete', currentSoquete, soq.slug)}
                  />
                  <span className="blog-cat-name">{soq.name}</span>
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
          onClick={() =>
            updateParams({ q: '', environment: '', tipo: '', material: '', soquete: '' })
          }
        >
          Limpar filtros
        </button>
      )}
    </aside>
  )
}
