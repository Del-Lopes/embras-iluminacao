'use client'

import { useState, useEffect, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/db/supabase-client'
import { Trash2, Copy, Upload, RefreshCw, FolderOpen, ChevronRight } from 'lucide-react'
import { useConfirm } from '@/components/ui/confirm-dialog'

const BUCKET = 'cover-images'
const PAGE_SIZE = 100
const BATCH_SIZE = 1000

type FileEntry = {
  name: string
  id: string | null
  created_at: string | null
  metadata: Record<string, unknown> | null
}

export function StorageManager() {
  const confirm = useConfirm()
  const [path, setPath] = useState('')
  const [allFiles, setAllFiles] = useState<FileEntry[]>([])
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingName, setDeletingName] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = async (atPath: string) => {
    setLoading(true)
    setError(null)
    setSelected(new Set())
    setPage(0)
    const supabase = createSupabaseBrowserClient()
    const all: FileEntry[] = []
    let offset = 0
    // Storage .list caps each call at 1000 entries — loop to fetch them all
    // so pagination and counts reflect the full folder.
    for (;;) {
      const { data, error: err } = await supabase.storage
        .from(BUCKET)
        .list(atPath, { limit: BATCH_SIZE, offset, sortBy: { column: 'created_at', order: 'desc' } })
      if (err) { setError('Erro ao carregar arquivos'); break }
      all.push(...(data ?? []).filter((f) => f.name !== '.emptyFolderPlaceholder'))
      if (!data || data.length < BATCH_SIZE) break
      offset += BATCH_SIZE
    }
    setAllFiles(all)
    setLoading(false)
  }

  useEffect(() => { load(path) }, [path])

  const fullPath = (name: string) => (path ? `${path}/${name}` : name)

  const pageCount = Math.max(1, Math.ceil(allFiles.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const files = allFiles.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const getPublicUrl = (name: string) => {
    const supabase = createSupabaseBrowserClient()
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(fullPath(name))
    return data.publicUrl
  }

  const isFolder = (f: FileEntry) => f.id === null

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Apenas imagens são permitidas'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Imagem muito grande (máx. 5 MB)'); return }
    setUploading(true)
    setError(null)
    const supabase = createSupabaseBrowserClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const uploadPath = fullPath(`${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`)
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(uploadPath, file, { cacheControl: '3600', upsert: false })
    if (uploadError) setError('Erro ao fazer upload')
    else await load(path)
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDelete = async (name: string) => {
    setDeletingName(name)
    const supabase = createSupabaseBrowserClient()
    const key = fullPath(name)
    const { error: delError } = await supabase.storage.from(BUCKET).remove([key])
    if (delError) setError('Erro ao excluir arquivo')
    else {
      setAllFiles((prev) => prev.filter((f) => f.name !== name))
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
    setDeletingName(null)
  }

  const toggleSelect = (name: string) => {
    const key = fullPath(name)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const pageFileKeys = files.filter((f) => f.id !== null).map((f) => fullPath(f.name))
  const allPageSelected = pageFileKeys.length > 0 && pageFileKeys.every((k) => selected.has(k))

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allPageSelected) pageFileKeys.forEach((k) => next.delete(k))
      else pageFileKeys.forEach((k) => next.add(k))
      return next
    })
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    const ok = await confirm({
      title: `Excluir ${selected.size} arquivo(s)?`,
      description: 'Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      destructive: true,
    })
    if (!ok) return
    setBulkDeleting(true)
    setError(null)
    const supabase = createSupabaseBrowserClient()
    const paths = Array.from(selected)
    const { error: delError } = await supabase.storage.from(BUCKET).remove(paths)
    if (delError) setError('Erro ao excluir arquivos')
    else {
      const removed = new Set(paths)
      setAllFiles((prev) => prev.filter((f) => !removed.has(fullPath(f.name))))
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

  const breadcrumbs = ['cover-images', ...path.split('/').filter(Boolean)]

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
                else setPath(breadcrumbs.slice(1, i + 1).join('/'))
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
      </nav>

      {/* Upload */}
      <section className="editor-section">
        <h2 className="editor-section-title">Upload de arquivo</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label
            className="btn-primary"
            style={{
              cursor: uploading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Upload size={14} strokeWidth={1.5} />
            {uploading ? 'Enviando...' : 'Selecionar imagem'}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => load(path)}
            disabled={loading}
            title="Recarregar"
          >
            <RefreshCw size={14} strokeWidth={1.5} />
          </button>
        </div>
        {error && <p className="form-error" style={{ margin: '8px 0 0' }}>{error}</p>}
      </section>

      {/* File list */}
      <section className="cat-list-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <h2 className="editor-section-title" style={{ margin: 0 }}>
            Conteúdo ({allFiles.length} {allFiles.length === 1 ? 'item' : 'itens'})
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
        ) : files.length === 0 ? (
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
                  <th className="data-table-head">Enviado em</th>
                  <th className="data-table-head" />
                </tr>
              </thead>
              <tbody>
                {files.map((file) => {
                  const folder = isFolder(file)
                  const url = folder ? '' : getPublicUrl(file.name)
                  const mimetype = file.metadata?.['mimetype'] as string | undefined
                  const size = file.metadata?.['size'] as number | undefined
                  return (
                    <tr key={`${path}/${file.name}`} className="data-table-row">
                      <td className="data-table-cell">
                        {!folder && (
                          <input
                            type="checkbox"
                            checked={selected.has(fullPath(file.name))}
                            onChange={() => toggleSelect(file.name)}
                            aria-label={`Selecionar ${file.name}`}
                          />
                        )}
                      </td>
                      <td className="data-table-cell">
                        {folder ? (
                          <FolderOpen
                            size={24}
                            strokeWidth={1.5}
                            style={{ color: 'var(--color-accent)', opacity: 0.7 }}
                          />
                        ) : mimetype?.startsWith('image/') ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={url}
                            alt={file.name}
                            style={{
                              width: 56,
                              height: 40,
                              objectFit: 'cover',
                              borderRadius: 4,
                              display: 'block',
                            }}
                          />
                        ) : null}
                      </td>
                      <td className="data-table-cell">
                        {folder ? (
                          <button
                            type="button"
                            onClick={() => setPath(fullPath(file.name))}
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
                            {file.name}/
                          </button>
                        ) : (
                          <code
                            className="cat-slug"
                            style={{ wordBreak: 'break-all', fontSize: 11 }}
                          >
                            {file.name}
                          </code>
                        )}
                      </td>
                      <td
                        className="data-table-cell"
                        style={{ color: 'var(--color-muted)', whiteSpace: 'nowrap' }}
                      >
                        {!folder && size ? formatSize(size) : '—'}
                      </td>
                      <td
                        className="data-table-cell"
                        style={{ color: 'var(--color-muted)', whiteSpace: 'nowrap' }}
                      >
                        {!folder && file.created_at
                          ? new Date(file.created_at).toLocaleDateString('pt-BR')
                          : '—'}
                      </td>
                      <td className="data-table-cell">
                        {!folder && (
                          <div className="row-actions">
                            <button
                              type="button"
                              className="action-btn"
                              onClick={() => handleCopy(url)}
                              title="Copiar URL"
                            >
                              {copiedUrl === url ? 'Copiado!' : <Copy size={13} strokeWidth={1.5} />}
                            </button>
                            <button
                              type="button"
                              className="action-btn action-btn--delete"
                              onClick={() => handleDelete(file.name)}
                              disabled={deletingName === file.name}
                              title="Excluir"
                            >
                              {deletingName === file.name ? '...' : <Trash2 size={13} strokeWidth={1.5} />}
                            </button>
                          </div>
                        )}
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
