'use client'

import { useRef, useState, useTransition } from 'react'
import { Lock } from 'lucide-react'
import { createCategoryAction, deleteCategoryAction } from '@/server/category.actions'
import { Input } from '@/components/ui/input'
import type { Category, UserRole } from '@/lib/db/schema'

type Props = {
  categories: Category[]
  currentUserId: string
  currentUserRole: UserRole
}

export function CategoriesManager({
  categories,
  currentUserId,
  currentUserRole,
}: Props) {
  const nameRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLInputElement>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState(false)
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({})
  const [isCreating, startCreate] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleCreate = () => {
    const fd = new FormData()
    fd.set('name', nameRef.current?.value ?? '')
    fd.set('description', descRef.current?.value ?? '')
    setCreateError(null)
    setCreateSuccess(false)
    startCreate(async () => {
      const result = await createCategoryAction(fd)
      if ('error' in result) {
        setCreateError(result.error)
      } else {
        setCreateSuccess(true)
        if (nameRef.current) nameRef.current.value = ''
        if (descRef.current) descRef.current.value = ''
      }
    })
  }

  // Admin exclui qualquer uma. Editor, só as que ele criou —
  // created_by NULL são as pré-existentes, que ficam travadas.
  const canDelete = (cat: Category) =>
    currentUserRole === 'admin' || cat.created_by === currentUserId

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setDeleteErrors((prev) => ({ ...prev, [id]: '' }))
    const result = await deleteCategoryAction(id)
    setDeletingId(null)
    if ('error' in result) {
      setDeleteErrors((prev) => ({ ...prev, [id]: result.error }))
    }
  }

  return (
    <div className="cat-manager">
      {/* ---- Create form ---- */}
      <section className="editor-section">
        <h2 className="editor-section-title">Nova Categoria</h2>

        <div className="editor-row" style={{ gridTemplateColumns: '1fr 2fr' }}>
          <div className="field-group">
            <label htmlFor="cat-name" className="cat-label">
              Nome <span className="cat-required">*</span>
            </label>
            <Input
              id="cat-name"
              ref={nameRef}
              type="text"
              placeholder="Ex: Iluminação Comercial"
              maxLength={80}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>

          <div className="field-group">
            <label htmlFor="cat-desc" className="cat-label">
              Descrição <span className="cat-optional">(opcional)</span>
            </label>
            <Input
              id="cat-desc"
              ref={descRef}
              type="text"
              placeholder="Breve descrição da categoria"
              maxLength={255}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
        </div>

        {createError && <p className="form-error" style={{ margin: 0 }}>{createError}</p>}
        {createSuccess && <p className="form-success" style={{ margin: 0 }}>Categoria criada com sucesso!</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? 'Salvando...' : '+ Criar categoria'}
          </button>
        </div>
      </section>

      {/* ---- Category list ---- */}
      <section className="cat-list-section">
        <h2 className="editor-section-title" style={{ marginBottom: 12 }}>
          Categorias cadastradas ({categories.length})
        </h2>

        {categories.length === 0 ? (
          <p className="data-table-empty">Nenhuma categoria cadastrada ainda.</p>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="data-table-head">Nome</th>
                  <th className="data-table-head">Slug</th>
                  <th className="data-table-head">Descrição</th>
                  <th className="data-table-head">Criada em</th>
                  <th className="data-table-head" />
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="data-table-row">
                    <td className="data-table-cell">
                      <span style={{ fontWeight: 500, color: 'var(--color-accent)' }}>
                        {cat.name}
                      </span>
                    </td>
                    <td className="data-table-cell">
                      <code className="cat-slug">{cat.slug}</code>
                    </td>
                    <td className="data-table-cell" style={{ color: 'var(--color-muted)' }}>
                      {cat.description ?? '—'}
                    </td>
                    <td className="data-table-cell" style={{ color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(cat.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="data-table-cell">
                      <div className="row-actions">
                        {deleteErrors[cat.id] && (
                          <span className="cat-delete-error">{deleteErrors[cat.id]}</span>
                        )}
                        {canDelete(cat) ? (
                          <button
                            type="button"
                            className="action-btn action-btn--delete"
                            onClick={() => handleDelete(cat.id)}
                            disabled={deletingId === cat.id}
                          >
                            {deletingId === cat.id ? 'Excluindo…' : 'Excluir'}
                          </button>
                        ) : (
                          <span
                            className="cat-locked"
                            title="Somente um administrador pode excluir categorias que você não criou"
                          >
                            <Lock size={12} strokeWidth={1.5} />
                            Protegida
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
