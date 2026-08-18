'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

type Props = {
  total: number
  currentSort: string
}

const SORT_OPTIONS = [
  { label: 'Mais recentes', value: 'recentes' },
  { label: 'Mais antigos', value: 'antigos' },
  { label: 'Nome (A–Z)', value: 'az' },
  { label: 'Nome (Z–A)', value: 'za' },
]

// Linha acima do grid: quantos projetos o filtro atual devolveu + ordenação.
export function ProjectsControls({ total, currentSort }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const setSort = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set('sort', value)
      else params.delete('sort')
      // Trocar a ordem embaralha o que cai em cada página: volta para a primeira.
      params.delete('page')
      startTransition(() => router.push(`${pathname}?${params.toString()}`))
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="catalog-controls">
      <p className="catalog-count">
        Exibindo {total} projeto{total !== 1 ? 's' : ''}
      </p>

      <div className="catalog-controls-right">
        <select
          className="toolbar-select"
          value={currentSort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Ordenar"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
