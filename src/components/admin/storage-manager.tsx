'use client'

import { useState, useEffect, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/db/supabase-client'
import { Trash2, Copy, Upload, RefreshCw, FolderOpen, ChevronRight } from 'lucide-react'

const BUCKET = 'cover-images'

type FileEntry = {
  name: string
  id: string | null
  created_at: string | null
  metadata: Record<string, unknown> | null
}

export function StorageManager() {
  const [path, setPath] = useState('')
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingName, setDeletingName] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = async (atPath: string) => {
    setLoading(true)
    setError(null)
    const supabase = createSupabaseBrowserClient()
    const { data, error: err } = await supabase.storage
      .from(BUCKET)
      .list(atPath, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } })
    if (err) setError('Erro ao carregar arquivos')
    else setFiles((data ?? []).filter((f) => f.name !== '.emptyFolderPlaceholder'))
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(path) }, [path])

  const fullPath = (name: string) => (path ? `${path}/${name}` : name)

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
    const { error: delError } = await supabase.storage.from(BUCKET).remove([fullPath(name)])
    if (delError) setError('Erro ao excluir arquivo')
    else setFiles((prev) => prev.filter((f) => f.name !== name))
    setDeletingName(null)
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
                color: i === breadcrumbs.length - 1 ? 'var(--color-foreground)' : 'var(--color-accent)',
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
        <h2 className="editor-section-title" style={{ marginBottom: 12 }}>
          Conteúdo ({files.length} {files.length === 1 ? 'item' : 'itens'})
        </h2>

        {loading ? (
          <p className="data-table-empty">Carregando...</p>
        ) : files.length === 0 ? (
          <p className="data-table-empty">Pasta vazia.</p>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
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
      </section>
    </div>
  )
}
