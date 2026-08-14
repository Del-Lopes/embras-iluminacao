'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import type { ProjectStatus } from '@/lib/db/schema'

const STATUS_OPTIONS: { label: string; value: ProjectStatus | 'all' }[] = [
  { label: 'Todos os status', value: 'all' },
  { label: 'Publicado', value: 'published' },
  { label: 'Rascunho', value: 'draft' },
]

type Props = {
  currentStatus: ProjectStatus | 'all'
  currentQ: string
}

export const ProjectTableToolbar = ({ currentStatus, currentQ }: Props) => {
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
    </div>
  )
}
