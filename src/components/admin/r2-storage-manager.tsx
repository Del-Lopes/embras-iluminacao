'use client'

import { useState, useEffect } from 'react'
import { Trash2, Copy, RefreshCw, FolderOpen, ChevronRight, Box } from 'lucide-react'
import {
  listR2Objects,
  deleteProductObject,
  deleteProductObjects,
  deleteR2Folder,
  type R2Object,
} from '@/server/upload.actions'

const PAGE_SIZE = 100

// Pastas-base do sistema — não podem ser excluídas pelo gerenciador.
const PROTECTED_FOLDERS = new Set(['modelos_3d/', 'produtos/'])

const isImageKey = (key: string) => /\.(jpe?g|png|webp|gif|avif)$/i.test(key)

type Entry =
  | { kind: 'folder'; prefix: string; name: string }
  | { kind: 'file'; file: R2Object }

export function R2StorageManager() {
  const [path, setPath] = useState('')
  const [folders, setFolders] = useState<string[]>([])
  const [allFiles, setAllFiles] = useState<R2Object[]>([])
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [deletingFolder, setDeletingFolder] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const load = async (atPath: string) => {
    setLoading(true)
    setError(null)
    setSelected(new Set())
    setPage(0)
    const res = await listR2Objects(atPath)
    if ('error' in res) {
      setError(res.error)
      setFolders([])
      setAllFiles([])
    } else {
      setFolders(res.folders)
      setAllFiles(res.files)
    }
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(path) }, [path])

  // Folders first, then files — paginated together (mirrors blog storage).
  const entries: Entry[] = [
    ...folders.map((prefix) => ({
      kind: 'folder' as const,
      prefix,
      name: prefix.slice(path.length),
    })),
    ...allFiles.map((file) => ({ kind: 'file' as const, file })),
  ]

  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageEntries = entries.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const pageFileKeys = pageEntries
    .filter((e): e is Extract<Entry, { kind: 'file' }> => e.kind === 'file')
    .map((e) => e.file.key)
  const allPageSelected = pageFileKeys.length > 0 && pageFileKeys.every((k) => selected.has(k))

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allPageSelected) pageFileKeys.forEach((k) => next.delete(k))
      else pageFileKeys.forEach((k) => next.add(k))
      return next
    })
  }

  const handleDelete = async (key: string) => {
    setDeletingKey(key)
    setError(null)
    const res = await deleteProductObject(key)
    if ('error' in res) setError(res.error)
    else {
      setAllFiles((prev) => prev.filter((f) => f.key !== key))
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
    setDeletingKey(null)
  }

  const handleDeleteFolder = async (prefix: string, name: string) => {
    if (
      !confirm(
        `Excluir a pasta "${name}" e TODO o seu conteúdo (arquivos e subpastas)?\nEsta ação não pode ser desfeita.`
      )
    )
      return
    setDeletingFolder(prefix)
    setError(null)
    const res = await deleteR2Folder(prefix)
    if ('error' in res) setError(res.error)
    else setFolders((prev) => prev.filter((f) => f !== prefix))
    setDeletingFolder(null)
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Excluir ${selected.size} arquivo(s)?\nEsta ação não pode ser desfeita.`)) return
    setBulkDeleting(true)
    setError(null)
    const keys = Array.from(selected)
    const res = await deleteProductObjects(keys)
    if ('error' in res) setError(res.error)
    else {
      const removed = new Set(keys)
      setAllFiles((prev) => prev.filter((f) => !removed.has(f.key)))
      setSelected(new Set())
    }
    setBulkDeleting(false)
  }

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const segments = path.split('/').filter(Boolean)
  const breadcrumbs = ['R2', ...segments]

  return (
    <div className="cat-manager">
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {breadcrumbs.map((crumb, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && (
              <ChevronRight size={12} strokeWidth={1.5} style={{ color: 'var(--color-muted)' }} />
            )}
            <button
              type="button"
              onClick={() => {
                if (i === 0) setPath('')
                else setPath(segments.slice(0, i).join('/') + '/')
              }}
              disabled={i === breadcrumbs.length - 1}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: i === breadcrumbs.length - 1 ? 'default' : 'pointer',
                color: i === breadcrumbs.length - 1 ? 'var(--color-primary)' : 'var(--color-accent)',
                fontSize: 13,
                fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
              }}
            >
              {crumb}
            </button>
          </span>
        ))}

        <button
          type="button"
          className="btn-secondary"
          onClick={() => load(path)}
          disabled={loading}
          title="Recarregar"
          style={{ marginLeft: 'auto' }}
        >
          <RefreshCw size={14} strokeWidth={1.5} />
        </button>
      </nav>

      {error && <p className="form-error" style={{ margin: '0 0 12px' }}>{error}</p>}

      {/* File list */}
      <section className="cat-list-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <h2 className="editor-section-title" style={{ margin: 0 }}>
            Conteúdo ({entries.length} {entries.length === 1 ? 'item' : 'itens'})
          </h2>
          {selected.size > 0 && (
            <button
              type="button"
              className="action-btn action-btn--delete"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Trash2 size={13} strokeWidth={1.5} />
              {bulkDeleting ? 'Excluindo...' : `Excluir selecionados (${selected.size})`}
            </button>
          )}
        </div>

        {loading ? (
          <p className="data-table-empty">Carregando...</p>
        ) : entries.length === 0 ? (
          <p className="data-table-empty">Pasta vazia.</p>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="data-table-head" style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAll}
                      disabled={pageFileKeys.length === 0}
                      aria-label="Selecionar todos"
                    />
                  </th>
                  <th className="data-table-head" style={{ width: 64 }}>Prévia</th>
                  <th className="data-table-head">Nome</th>
                  <th className="data-table-head">Tamanho</th>
                  <th className="data-table-head">Modificado em</th>
                  <th className="data-table-head" />
                </tr>
              </thead>
              <tbody>
                {pageEntries.map((entry) => {
                  if (entry.kind === 'folder') {
                    const isProtected = PROTECTED_FOLDERS.has(entry.prefix)
                    return (
                      <tr key={`folder:${entry.prefix}`} className="data-table-row">
                        <td className="data-table-cell" />
                        <td className="data-table-cell">
                          <FolderOpen
                            size={24}
                            strokeWidth={1.5}
                            style={{ color: 'var(--color-accent)', opacity: 0.7 }}
                          />
                        </td>
                        <td className="data-table-cell">
                          <button
                            type="button"
                            onClick={() => setPath(entry.prefix)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              color: 'var(--color-accent)',
                              fontSize: 13,
                              fontWeight: 500,
                            }}
                          >
                            {entry.name}
                          </button>
                        </td>
                        <td className="data-table-cell" style={{ color: 'var(--color-muted)' }}>—</td>
                        <td className="data-table-cell" style={{ color: 'var(--color-muted)' }}>—</td>
                        <td className="data-table-cell">
                          <div className="row-actions">
                            <button
                              type="button"
                              className="action-btn action-btn--delete"
                              onClick={() => handleDeleteFolder(entry.prefix, entry.name)}
                              disabled={deletingFolder === entry.prefix || isProtected}
                              title={
                                isProtected
                                  ? 'Pasta do sistema — não pode ser excluída'
                                  : 'Excluir pasta e todo o conteúdo'
                              }
                            >
                              {deletingFolder === entry.prefix ? '...' : <Trash2 size={13} strokeWidth={1.5} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  const file = entry.file
                  const image = isImageKey(file.key)
                  const name = file.key.slice(path.length)
                  return (
                    <tr key={file.key} className="data-table-row">
                      <td className="data-table-cell">
                        <input
                          type="checkbox"
                          checked={selected.has(file.key)}
                          onChange={() => toggleSelect(file.key)}
                          aria-label={`Selecionar ${name}`}
                        />
                      </td>
                      <td className="data-table-cell">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={file.url}
                            alt={name}
                            style={{
                              width: 56,
                              height: 40,
                              objectFit: 'cover',
                              borderRadius: 4,
                              display: 'block',
                            }}
                          />
                        ) : (
                          <Box
                            size={24}
                            strokeWidth={1.5}
                            style={{ color: 'var(--color-accent)', opacity: 0.7 }}
                          />
                        )}
                      </td>
                      <td className="data-table-cell">
                        <code
                          className="cat-slug"
                          style={{ wordBreak: 'break-all', fontSize: 11 }}
                        >
                          {name}
                        </code>
                      </td>
                      <td
                        className="data-table-cell"
                        style={{ color: 'var(--color-muted)', whiteSpace: 'nowrap' }}
                      >
                        {file.size ? formatSize(file.size) : '—'}
                      </td>
                      <td
                        className="data-table-cell"
                        style={{ color: 'var(--color-muted)', whiteSpace: 'nowrap' }}
                      >
                        {file.lastModified
                          ? new Date(file.lastModified).toLocaleDateString('pt-BR')
                          : '—'}
                      </td>
                      <td className="data-table-cell">
                        <div className="row-actions">
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() => handleCopy(file.url)}
                            title="Copiar URL"
                          >
                            {copiedUrl === file.url ? 'Copiado!' : <Copy size={13} strokeWidth={1.5} />}
                          </button>
                          <button
                            type="button"
                            className="action-btn action-btn--delete"
                            onClick={() => handleDelete(file.key)}
                            disabled={deletingKey === file.key}
                            title="Excluir"
                          >
                            {deletingKey === file.key ? '...' : <Trash2 size={13} strokeWidth={1.5} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && pageCount > 1 && (
          <div className="pagination">
            <button
              type="button"
              className={`pagination-btn${safePage <= 0 ? ' pagination-btn--disabled' : ''}`}
              onClick={() => setPage(safePage - 1)}
              disabled={safePage <= 0}
            >
              ← Anterior
            </button>
            <span className="pagination-pages" style={{ alignItems: 'center' }}>
              Página {safePage + 1} de {pageCount}
            </span>
            <button
              type="button"
              className={`pagination-btn${safePage >= pageCount - 1 ? ' pagination-btn--disabled' : ''}`}
              onClick={() => setPage(safePage + 1)}
              disabled={safePage >= pageCount - 1}
            >
              Próxima →
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
