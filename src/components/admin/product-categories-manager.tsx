'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import {
  createProductCategoryAction,
  deleteProductCategoryAction,
} from '@/server/product-category.actions'
import { Input } from '@/components/ui/input'
import type { ProductCategory } from '@/lib/db/schema'

type Props = {
  categories: ProductCategory[]
}

// Flatten the parent_id tree into a depth-ordered list for rendering.
type FlatNode = { cat: ProductCategory; depth: number }

const buildTree = (categories: ProductCategory[]): FlatNode[] => {
  const byParent = new Map<string | null, ProductCategory[]>()
  for (const cat of categories) {
    const key = cat.parent_id
    const list = byParent.get(key) ?? []
    list.push(cat)
    byParent.set(key, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) =>
      a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'pt-BR')
    )
  }

  const out: FlatNode[] = []
  const walk = (parentId: string | null, depth: number) => {
    for (const cat of byParent.get(parentId) ?? []) {
      out.push({ cat, depth })
      walk(cat.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}

export function ProductCategoriesManager({ categories }: Props) {
  const nameRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLInputElement>(null)
  const [parentId, setParentId] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState(false)
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({})
  const [isCreating, startCreate] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const tree = useMemo(() => buildTree(categories), [categories])

  const handleCreate = () => {
    const fd = new FormData()
    fd.set('name', nameRef.current?.value ?? '')
    fd.set('description', descRef.current?.value ?? '')
    fd.set('parent_id', parentId)
    setCreateError(null)
    setCreateSuccess(false)
    startCreate(async () => {
      const result = await createProductCategoryAction(fd)
      if ('error' in result) {
        setCreateError(result.error)
      } else {
        setCreateSuccess(true)
        if (nameRef.current) nameRef.current.value = ''
        if (descRef.current) descRef.current.value = ''
        setParentId('')
      }
    })
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setDeleteErrors((prev) => ({ ...prev, [id]: '' }))
    const result = await deleteProductCategoryAction(id)
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

        <div className="editor-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div className="field-group">
            <label htmlFor="pcat-name" className="cat-label">
              Nome <span className="cat-required">*</span>
            </label>
            <Input
              id="pcat-name"
              ref={nameRef}
              type="text"
              placeholder="Ex: Luminárias"
              maxLength={80}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>

          <div className="field-group">
            <label htmlFor="pcat-parent" className="cat-label">
              Categoria pai <span className="cat-optional">(opcional)</span>
            </label>
            <select
              id="pcat-parent"
              className="editor-select"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">Nenhuma (raiz)</option>
              {tree.map(({ cat, depth }) => (
                <option key={cat.id} value={cat.id}>
                  {`${'— '.repeat(depth)}${cat.name}`}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="pcat-desc" className="cat-label">
              Descrição <span className="cat-optional">(opcional)</span>
            </label>
            <Input
              id="pcat-desc"
              ref={descRef}
              type="text"
              placeholder="Breve descrição"
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

      {/* ---- Category tree ---- */}
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
                  <th className="data-table-head" />
                </tr>
              </thead>
              <tbody>
                {tree.map(({ cat, depth }) => (
                  <tr key={cat.id} className="data-table-row">
                    <td className="data-table-cell">
                      <span
                        style={{
                          fontWeight: depth === 0 ? 600 : 400,
                          color: depth === 0 ? 'var(--color-accent)' : 'var(--color-foreground)',
                          paddingLeft: depth * 20,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {depth > 0 && <span style={{ opacity: 0.4 }}>└</span>}
                        {cat.name}
                      </span>
                    </td>
                    <td className="data-table-cell">
                      <code className="cat-slug">{cat.slug}</code>
                    </td>
                    <td className="data-table-cell" style={{ color: 'var(--color-muted)' }}>
                      {cat.description ?? '—'}
                    </td>
                    <td className="data-table-cell">
                      <div className="row-actions">
                        {deleteErrors[cat.id] && (
                          <span className="cat-delete-error">{deleteErrors[cat.id]}</span>
                        )}
                        <button
                          type="button"
                          className="action-btn action-btn--delete"
                          onClick={() => handleDelete(cat.id)}
                          disabled={deletingId === cat.id}
                        >
                          {deletingId === cat.id ? 'Excluindo…' : 'Excluir'}
                        </button>
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
