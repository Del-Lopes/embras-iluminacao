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

export function BlogControls({ total, currentSort }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      params.delete('page')
      startTransition(() => router.push(`${pathname}?${params.toString()}`))
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="catalog-controls">
      <p className="catalog-count">
        Exibindo {total} post{total !== 1 ? 's' : ''}
      </p>

      <div className="catalog-controls-right">
        <select
          className="toolbar-select"
          value={currentSort}
          onChange={(e) => setParam('sort', e.target.value)}
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
