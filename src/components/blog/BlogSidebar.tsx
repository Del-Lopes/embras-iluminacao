'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

type Category = { id: string; name: string; slug: string }

type Props = {
  categories: Category[]
  currentQ: string
  currentCategorySlug: string
}

export function BlogSidebar({ categories, currentQ, currentCategorySlug }: Props) {
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

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value.trim()
    updateParams({ q })
  }

  const parseList = (s: string) =>
    s ? s.split(',').map((v) => v.trim()).filter(Boolean) : []

  // Multi-seleção (checkbox): adiciona/remove a categoria da lista
  const toggleCategory = (slug: string) => {
    const list = parseList(currentCategorySlug)
    const next = list.includes(slug) ? list.filter((v) => v !== slug) : [...list, slug]
    updateParams({ category: next.join(',') })
  }

  const hasFilters = !!currentQ || !!currentCategorySlug

  return (
    <aside className="blog-sidebar">
      {/* Search */}
      <form onSubmit={handleSearch} className="blog-sidebar-search">
        <input
          name="q"
          type="search"
          defaultValue={currentQ}
          placeholder="Pesquisar posts"
          className="blog-sidebar-search-input"
        />
      </form>

      {/* Categories as checkboxes */}
      {categories.length > 0 && (
        <nav className="blog-sidebar-cats">
          <p className="blog-sidebar-cats-label">Categorias</p>
          <ul>
            {categories.map((cat) => {
              const checked = parseList(currentCategorySlug).includes(cat.slug)
              return (
                <li key={cat.id}>
                  <label className="blog-cat-label">
                    <input
                      type="checkbox"
                      className="blog-cat-check"
                      checked={checked}
                      onChange={() => toggleCategory(cat.slug)}
                    />
                    <span className="blog-cat-name">{cat.name}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </nav>
      )}

      {hasFilters && (
        <button
          type="button"
          className="catalog-clear-filters"
          onClick={() => updateParams({ q: '', category: '' })}
        >
          Limpar filtros
        </button>
      )}
    </aside>
  )
}
