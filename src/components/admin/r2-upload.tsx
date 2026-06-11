'use client'

import { useState, useRef } from 'react'
import { getProductUploadUrl } from '@/server/upload.actions'

// Single-image uploader for product cover / carousel images.
// Mirrors the UX + validation of image-upload.tsx, but the bytes go
// straight to Cloudflare R2 via a presigned PUT (no credentials in the
// browser, file never passes through the serverless function).
//
// Flow:
//   1. Client validates MIME + size (fast feedback).
//   2. Server Action re-validates and returns a short-lived presigned URL.
//   3. Browser PUTs the file directly to R2 with the pinned Content-Type.
//   4. The public read URL is handed back to the form.

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

type Props = {
  value: string
  onChange: (url: string) => void
}

export const R2Upload = ({ value, onChange }: Props) => {
  const [tab, setTab] = useState<'upload' | 'url'>('upload')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. Client-side guard (server re-validates authoritatively)
    if (!ACCEPTED.includes(file.type)) {
      setError('Apenas JPG, PNG ou WebP são permitidos')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Imagem muito grande (máx. 5 MB)')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // 2. Ask the server for a presigned PUT URL (auth-gated)
      const result = await getProductUploadUrl({
        kind: 'image',
        contentType: file.type,
        contentLength: file.size,
      })

      if ('error' in result) {
        setError(result.error)
        setUploading(false)
        return
      }

      // 3. PUT straight to R2 — Content-Type must match the signed value
      const put = await fetch(result.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': result.contentType },
        body: file,
      })

      if (!put.ok) {
        setError('Falha no envio para o storage')
        setUploading(false)
        return
      }

      // 4. Hand the public read URL back to the form
      onChange(result.publicUrl)
    } catch {
      setError('Erro inesperado no upload')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleUrlCommit = () => {
    const url = urlInput.trim()
    if (!url) return
    try {
      new URL(url)
      onChange(url)
      setError(null)
    } catch {
      setError('URL inválida')
    }
  }

  const handleRemove = () => {
    onChange('')
    setUrlInput('')
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="image-upload-v2">
      {/* ---- Tab toggle ---- */}
      <div className="img-tabs">
        <button
          type="button"
          className={`img-tab${tab === 'upload' ? ' img-tab--active' : ''}`}
          onClick={() => { setTab('upload'); setError(null) }}
        >
          Upload arquivo
        </button>
        <button
          type="button"
          className={`img-tab${tab === 'url' ? ' img-tab--active' : ''}`}
          onClick={() => { setTab('url'); setError(null) }}
        >
          URL externa
        </button>
      </div>

      {/* ---- Input area (only shown when no image selected) ---- */}
      {!value && tab === 'upload' && (
        <label className="image-upload-label">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleFile}
            disabled={uploading}
          />
          {uploading ? 'Enviando...' : '+ Selecionar imagem'}
        </label>
      )}

      {!value && tab === 'url' && (
        <div className="img-url-row">
          <input
            type="url"
            className="toolbar-input"
            placeholder="https://exemplo.com/imagem.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlCommit()}
          />
          <button type="button" className="btn-secondary img-url-btn" onClick={handleUrlCommit}>
            Usar
          </button>
        </div>
      )}

      {/* ---- Preview ---- */}
      {value && (
        <div className="img-preview-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Imagem do produto" className="img-preview-img" />
          <div className="img-preview-meta">
            <button type="button" className="image-remove-btn" onClick={handleRemove}>
              Remover
            </button>
          </div>
        </div>
      )}

      {/* ---- Error ---- */}
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}
