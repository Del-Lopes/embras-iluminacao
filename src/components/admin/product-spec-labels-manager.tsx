'use client'

import { useRef, useState, useTransition } from 'react'
import {
  createProductSpecLabelAction,
  deleteProductSpecLabelAction,
  updateProductSpecLabelAction,
} from '@/server/product-spec-label.actions'
import { normalizeLabel } from '@/lib/utils/normalize-label'
import type { ProductSpecLabel } from '@/lib/db/schema'

type Props = { labels: ProductSpecLabel[] }

// CRUD dos rótulos de informações técnicas. Espelha o
// ProductCharacteristicsManager (adicionar no topo, lista abaixo), com a
// edição a mais: aqui renomear é operação comum, porque o rótulo entra
// automaticamente pelo editor de produto e costuma nascer com a caixa ou o
// acento que o usuário digitou na hora.
export function ProductSpecLabelsManager({ labels }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, startCreate] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const setRowError = (id: string, msg: string) =>
    setRowErrors((prev) => ({ ...prev, [id]: msg }))

  const handleAdd = () => {
    const name = inputRef.current?.value.trim() ?? ''
    if (!name) return

    // Checagem local antes de ir ao servidor: dá resposta imediata e evita um
    // round-trip para o caso mais comum, digitar algo que já existe com outra
    // acentuação. O servidor repete a verificação, que é quem de fato garante.
    const normalized = normalizeLabel(name)
    const clash = labels.find((l) => l.normalized === normalized)
    if (clash) {
      setError(`Já existe: “${clash.name}”`)
      return
    }

    const fd = new FormData()
    fd.set('name', name)
    setError(null)
    startCreate(async () => {
      const result = await createProductSpecLabelAction(fd)
      if ('error' in result) setError(result.error)
      else if (inputRef.current) inputRef.current.value = ''
    })
  }

  const handleDelete = async (id: string) => {
    setBusyId(id)
    setRowError(id, '')
    const result = await deleteProductSpecLabelAction(id)
    setBusyId(null)
    if ('error' in result) setRowError(id, result.error)
  }

  const handleRename = async (id: string) => {
    const name = editValue.trim()
    if (!name) return
    setBusyId(id)
    setRowError(id, '')
    const result = await updateProductSpecLabelAction(id, name)
    setBusyId(null)
    if ('error' in result) setRowError(id, result.error)
    else setEditingId(null)
  }

  return (
    <section className="editor-section characteristic-col">
      <div className="characteristic-col-head">
        <h2 className="editor-section-title">Rótulos</h2>
        <span className="field-hint field-hint--xs">
          Sugestões oferecidas ao preencher as informações técnicas do produto.
          Excluir um rótulo daqui não altera nenhum produto já salvo.
        </span>
      </div>

      <div className="characteristic-add">
        <input
          ref={inputRef}
          type="text"
          className="toolbar-input"
          placeholder="Ex: Tensão"
          maxLength={80}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button type="button" className="btn-secondary" onClick={handleAdd} disabled={isCreating}>
          {isCreating ? '...' : '+ Adicionar'}
        </button>
      </div>

      {error && <p className="field-error">{error}</p>}

      {labels.length === 0 ? (
        <p className="field-hint" style={{ margin: 0 }}>Nenhum rótulo cadastrado.</p>
      ) : (
        <ul className="characteristic-list">
          {labels.map((item) => (
            <li key={item.id} className="characteristic-item">
              {editingId === item.id ? (
                <input
                  type="text"
                  className="toolbar-input"
                  value={editValue}
                  autoFocus
                  maxLength={80}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(item.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                />
              ) : (
                <span>{item.name}</span>
              )}

              <div className="row-actions">
                {rowErrors[item.id] && (
                  <span className="cat-delete-error">{rowErrors[item.id]}</span>
                )}

                {editingId === item.id ? (
                  <>
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => handleRename(item.id)}
                      disabled={busyId === item.id}
                    >
                      {busyId === item.id ? '...' : 'Salvar'}
                    </button>
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => setEditingId(null)}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => {
                        setEditingId(item.id)
                        setEditValue(item.name)
                        setRowError(item.id, '')
                      }}
                    >
                      Renomear
                    </button>
                    <button
                      type="button"
                      className="action-btn action-btn--delete"
                      onClick={() => handleDelete(item.id)}
                      disabled={busyId === item.id}
                    >
                      {busyId === item.id ? '...' : 'Excluir'}
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
