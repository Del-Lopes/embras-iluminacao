'use client'

import { useState, useRef } from 'react'
import { getProductUploadUrl } from '@/server/upload.actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, FileText } from 'lucide-react'

// Uploader de arquivo (PDF/ZIP) para os slots de download do produto.
// Mesmo fluxo presigned das imagens, mas sem preview de imagem: mostra o nome
// do arquivo com link. Também permite colar uma URL externa.

const ACCEPTED = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
]
const MAX_BYTES = 50 * 1024 * 1024 // 50 MB

type Props = {
  value: string
  filename?: string
  onChange: (url: string, filename: string) => void
  group?: 'product' | 'catalog'
  folder?: string
}

export const R2FileUpload = ({ value, filename = '', onChange, group = 'product', folder = '' }: Props) => {
  const [tab, setTab] = useState<'upload' | 'url'>('upload')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isZip =
      ACCEPTED.includes(file.type) || file.name.toLowerCase().endsWith('.zip')
    if (!isPdf && !isZip) {
      setError('Apenas PDF ou ZIP são permitidos')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Arquivo muito grande (máx. 50 MB)')
      return
    }

    setUploading(true)
    setError(null)
    try {
      // Alguns navegadores mandam .zip como octet-stream; normaliza p/ o allowlist.
      const contentType = file.type || (isPdf ? 'application/pdf' : 'application/zip')
      const result = await getProductUploadUrl({
        kind: 'document',
        group,
        folder,
        contentType,
        contentLength: file.size,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      const put = await fetch(result.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': result.contentType },
        body: file,
      })
      if (!put.ok) {
        setError('Falha no envio para o storage')
        return
      }
      onChange(result.publicUrl, file.name)
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
      const name = url.split('/').pop() || 'arquivo'
      onChange(url, name)
      setError(null)
    } catch {
      setError('URL inválida')
    }
  }

  const handleRemove = () => {
    onChange('', '')
    setUrlInput('')
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="image-upload-v2">
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

      {!value && tab === 'upload' && (
        <>
          {!folder && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Informe o nome do produto antes de enviar arquivos.</AlertDescription>
            </Alert>
          )}
          <label className={`image-upload-label${!folder ? ' image-upload-label--disabled' : ''}`}>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf,application/zip,.zip"
              className="sr-only"
              onChange={handleFile}
              disabled={uploading || !folder}
            />
            {uploading ? 'Enviando...' : '+ Selecionar arquivo (PDF/ZIP)'}
          </label>
        </>
      )}

      {!value && tab === 'url' && (
        <div className="img-url-row">
          <input
            type="url"
            className="toolbar-input"
            placeholder="https://exemplo.com/arquivo.pdf"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlCommit()}
          />
          <button type="button" className="btn-secondary img-url-btn" onClick={handleUrlCommit}>
            Usar
          </button>
        </div>
      )}

      {value && (
        <div className="img-preview-block">
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="post-title-link"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <FileText size={16} strokeWidth={1.5} />
            {filename || 'Arquivo enviado'}
          </a>
          <div className="img-preview-meta" style={{ marginTop: 10 }}>
            <button type="button" className="image-remove-btn" onClick={handleRemove}>
              Remover
            </button>
          </div>
        </div>
      )}

      {error && <span className="field-error">{error}</span>}
    </div>
  )
}
