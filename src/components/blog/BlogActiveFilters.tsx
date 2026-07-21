'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

type Category = { name: string; slug: string }

type Props = {
  q: string
  categorySlug: string
  categories: Category[]
}

// Chips dos filtros ativos do blog (busca + categorias), exibidos abaixo da
// linha de controles. Cada chip tem um X que remove aquele filtro específico.
export function BlogActiveFilters({ q, categorySlug, categories }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const parseList = (s: string) =>
    s ? s.split(',').map((v) => v.trim()).filter(Boolean) : []

  const update = useCallback(
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

  const nameFor = (slug: string) =>
    categories.find((c) => c.slug === slug)?.name ?? slug

  const chips: { key: string; label: string; onRemove: () => void }[] = []

  if (q) chips.push({ key: 'q', label: `"${q}"`, onRemove: () => update({ q: '' }) })
  parseList(categorySlug).forEach((slug) =>
    chips.push({
      key: `cat-${slug}`,
      label: nameFor(slug),
      onRemove: () =>
        update({ category: parseList(categorySlug).filter((v) => v !== slug).join(',') }),
    })
  )

  if (chips.length === 0) return null

  return (
    <div className="catalog-active-filters">
      {chips.map((c) => (
        <span key={c.key} className="catalog-chip">
          <span className="catalog-chip-label">{c.label}</span>
          <button
            type="button"
            className="catalog-chip-remove"
            onClick={c.onRemove}
            aria-label={`Remover filtro ${c.label}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </span>
      ))}
    </div>
  )
}
