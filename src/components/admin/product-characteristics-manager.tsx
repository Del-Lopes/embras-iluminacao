'use client'

import { useRef, useState, useTransition } from 'react'
import {
  createProductCharacteristicAction,
  deleteProductCharacteristicAction,
} from '@/server/product-characteristic.actions'
import type { ProductCharacteristic, ProductCharacteristicType } from '@/lib/db/schema'

type ColumnDef = {
  type: ProductCharacteristicType
  label: string
  hint?: string
  placeholder: string
}

const COLUMNS: ColumnDef[] = [
  { type: 'material', label: 'Materiais', hint: 'Lista única de materiais', placeholder: 'Ex: aço' },
  { type: 'soquete', label: 'Tipo de Soquete', hint: 'Lista para tipos de soquete', placeholder: 'Ex: E27' },
]

type Props = { characteristics: ProductCharacteristic[] }

export function ProductCharacteristicsManager({ characteristics }: Props) {
  return (
    <div className="characteristics-grid">
      {COLUMNS.map((col) => (
        <CharacteristicColumn
          key={col.type}
          column={col}
          items={characteristics.filter((c) => c.type === col.type)}
        />
      ))}
    </div>
  )
}

function CharacteristicColumn({ column, items }: { column: ColumnDef; items: ProductCharacteristic[] }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, startCreate] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({})

  const handleAdd = () => {
    const name = inputRef.current?.value.trim() ?? ''
    if (!name) return
    const fd = new FormData()
    fd.set('name', name)
    fd.set('type', column.type)
    setError(null)
    startCreate(async () => {
      const result = await createProductCharacteristicAction(fd)
      if ('error' in result) setError(result.error)
      else if (inputRef.current) inputRef.current.value = ''
    })
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setDeleteErrors((p) => ({ ...p, [id]: '' }))
    const result = await deleteProductCharacteristicAction(id)
    setDeletingId(null)
    if ('error' in result) setDeleteErrors((p) => ({ ...p, [id]: result.error }))
  }

  return (
    <section className="editor-section characteristic-col">
      <div className="characteristic-col-head">
        <h2 className="editor-section-title">{column.label}</h2>
        {column.hint && <span className="field-hint field-hint--xs">{column.hint}</span>}
      </div>

      <div className="characteristic-add">
        <input
          ref={inputRef}
          type="text"
          className="toolbar-input"
          placeholder={column.placeholder}
          maxLength={80}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button type="button" className="btn-secondary" onClick={handleAdd} disabled={isCreating}>
          {isCreating ? '...' : '+ Adicionar'}
        </button>
      </div>

      {error && <p className="field-error">{error}</p>}

      {items.length === 0 ? (
        <p className="field-hint" style={{ margin: 0 }}>Nenhum valor cadastrado.</p>
      ) : (
        <ul className="characteristic-list">
          {items.map((item) => (
            <li key={item.id} className="characteristic-item">
              <span>{item.name}</span>
              <div className="row-actions">
                {deleteErrors[item.id] && (
                  <span className="cat-delete-error">{deleteErrors[item.id]}</span>
                )}
                <button
                  type="button"
                  className="action-btn action-btn--delete"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id ? '...' : 'Excluir'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
