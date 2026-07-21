'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

type Option = { slug: string; name: string }

type Props = {
  q: string
  environment: string
  tipo: string
  material: string
  soquete: string
  categories: Option[]
  materials: Option[]
  soquetes: Option[]
}

const ENV_LABELS: Record<string, string> = {
  interno: 'Área interna',
  externo: 'Área externa',
}

// Chips dos filtros ativos, exibidos abaixo da linha de controles. Cada chip tem
// um X que remove aquele filtro específico (atualizando a URL). Filtros multi
// (tipo/material/soquete) removem só o slug clicado; environment/busca zeram.
export function CatalogActiveFilters({
  q,
  environment,
  tipo,
  material,
  soquete,
  categories,
  materials,
  soquetes,
}: Props) {
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

  const removeFromList = (key: string, current: string, slug: string) =>
    update({ [key]: parseList(current).filter((v) => v !== slug).join(',') })

  const nameFor = (list: Option[], slug: string) =>
    list.find((o) => o.slug === slug)?.name ?? slug

  const chips: { key: string; label: string; onRemove: () => void }[] = []

  if (q) chips.push({ key: 'q', label: `"${q}"`, onRemove: () => update({ q: '' }) })
  if (environment && ENV_LABELS[environment])
    chips.push({
      key: 'env',
      label: ENV_LABELS[environment],
      onRemove: () => update({ environment: '' }),
    })
  parseList(tipo).forEach((slug) =>
    chips.push({
      key: `tipo-${slug}`,
      label: nameFor(categories, slug),
      onRemove: () => removeFromList('tipo', tipo, slug),
    })
  )
  parseList(material).forEach((slug) =>
    chips.push({
      key: `material-${slug}`,
      label: nameFor(materials, slug),
      onRemove: () => removeFromList('material', material, slug),
    })
  )
  parseList(soquete).forEach((slug) =>
    chips.push({
      key: `soquete-${slug}`,
      label: nameFor(soquetes, slug),
      onRemove: () => removeFromList('soquete', soquete, slug),
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
