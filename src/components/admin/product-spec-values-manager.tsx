'use client'

import { useRef, useState, useTransition } from 'react'
import {
  createProductSpecValueAction,
  deleteProductSpecValueAction,
  updateProductSpecValueAction,
} from '@/server/product-spec-value.actions'
import { normalizeLabel } from '@/lib/utils/normalize-label'
import { canonicalizeUnits } from '@/lib/utils/si-units'
import type { ProductSpecLabel, ProductSpecValue } from '@/lib/db/schema'

type Props = { values: ProductSpecValue[]; labels: ProductSpecLabel[] }

// CRUD dos valores presets. Mesma forma do gerenciador de rótulos, com uma
// diferença de conteúdo: aqui a maioria dos registros não foi digitada por
// ninguém — entrou pela promoção automática ao bater 10 produtos de uso.
// Por isso o aviso sobre a exclusão: apagar um valor ainda em uso não o
// remove de vez, a próxima promoção o traz de volta.
export function ProductSpecValuesManager({ values, labels }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  // Rótulo escolhido no formulário de adicionar. Sem ele o valor não teria a
  // que grandeza pertencer.
  const [labelName, setLabelName] = useState('')
  const labelNameByNormalized = new Map(labels.map((l) => [l.normalized, l.name]))
  const [error, setError] = useState<string | null>(null)
  const [isCreating, startCreate] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const setRowError = (id: string, msg: string) =>
    setRowErrors((prev) => ({ ...prev, [id]: msg }))

  const handleAdd = () => {
    // Canoniza ANTES da checagem local, e não só no servidor: sem isso,
    // digitar "220v" com "220 V" já cadastrado passaria pelo teste daqui
    // (formas normalizadas diferentes) e só o servidor barraria, gastando uma
    // ida e volta para dizer o que já dava para saber na tela. A action
    // canoniza de novo, que é quem de fato garante.
    const name = canonicalizeUnits(inputRef.current?.value.trim() ?? '')
    if (!name) return

    if (!labelName) {
      setError('Escolha o rótulo a que o valor pertence')
      return
    }

    // Colisão só dentro do mesmo rótulo: "2700" pode existir em Potência e em
    // Temperatura de Cor sem conflito.
    const normalized = normalizeLabel(name)
    const labelNorm = normalizeLabel(labelName)
    const clash = values.find(
      (v) => v.normalized === normalized && v.label_normalized === labelNorm
    )
    if (clash) {
      setError(`Já existe em ${labelName}: “${clash.name}”`)
      return
    }

    const fd = new FormData()
    fd.set('name', name)
    fd.set('label', labelName)
    setError(null)
    startCreate(async () => {
      const result = await createProductSpecValueAction(fd)
      if ('error' in result) setError(result.error)
      else if (inputRef.current) inputRef.current.value = ''
    })
  }

  const handleDelete = async (id: string) => {
    setBusyId(id)
    setRowError(id, '')
    const result = await deleteProductSpecValueAction(id)
    setBusyId(null)
    if ('error' in result) setRowError(id, result.error)
  }

  const handleRename = async (id: string) => {
    const name = canonicalizeUnits(editValue.trim())
    if (!name) return
    setBusyId(id)
    setRowError(id, '')
    const result = await updateProductSpecValueAction(id, name)
    setBusyId(null)
    if ('error' in result) setRowError(id, result.error)
    else setEditingId(null)
  }

  return (
    <section className="editor-section characteristic-col">
      <div className="characteristic-col-head">
        <h2 className="editor-section-title">Valores</h2>
        <span className="field-hint field-hint--xs">
          Entram sozinhos quando um valor é usado em 10 produtos. Você também
          pode cadastrar à mão, sem esperar a contagem. Excluir um valor ainda
          em uso é temporário: ele volta na próxima promoção.
        </span>
      </div>

      {labels.length === 0 ? (
        <p className="field-hint" style={{ margin: 0 }}>
          Cadastre um rótulo antes: todo valor pertence a um.
        </p>
      ) : (
        <div className="characteristic-add characteristic-add--triple">
          <select
            className="editor-select"
            value={labelName}
            onChange={(e) => setLabelName(e.target.value)}
          >
            <option value="">— Rótulo —</option>
            {labels.map((l) => (
              <option key={l.id} value={l.name}>{l.name}</option>
            ))}
          </select>
          {/* Ao sair do campo o texto já aparece na grafia do SI, para o
              usuário ver o que será gravado antes de confirmar, em vez de
              descobrir depois que "220v" virou outra coisa. */}
          <input
            ref={inputRef}
            type="text"
            className="toolbar-input"
            placeholder="Ex: 220 V"
            maxLength={120}
            onBlur={(e) => {
              e.target.value = canonicalizeUnits(e.target.value)
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button type="button" className="btn-secondary" onClick={handleAdd} disabled={isCreating}>
            {isCreating ? '...' : '+ Adicionar'}
          </button>
        </div>
      )}

      {error && <p className="field-error">{error}</p>}

      {values.length === 0 ? (
        <p className="field-hint" style={{ margin: 0 }}>Nenhum valor cadastrado.</p>
      ) : (
        <ul className="characteristic-list">
          {values.map((item) => (
            <li key={item.id} className="characteristic-item">
              {editingId === item.id ? (
                <input
                  type="text"
                  className="toolbar-input"
                  value={editValue}
                  autoFocus
                  maxLength={120}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(item.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                />
              ) : (
                // O rótulo aparece junto porque o mesmo texto pode existir em
                // grandezas diferentes; sem ele a lista teria itens repetidos
                // sem explicação.
                <span>
                  {item.name}
                  <span className="field-hint field-hint--xs" style={{ marginLeft: 8 }}>
                    {labelNameByNormalized.get(item.label_normalized) ?? item.label_normalized}
                  </span>
                </span>
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
