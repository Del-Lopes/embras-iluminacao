'use client'

import { useState, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/db/supabase-client'
import { DEFAULT_COVER } from '@/lib/utils/hf-image'

const ORIGIN_LABELS: Record<string, string> = {
  flux: 'FLUX (IA)',
  imagen4: 'Imagen 4 (IA)',
  ai: 'IA Gerada',
  unsplash: 'Unsplash',
  default: 'Padrão',
  upload: 'Upload',
  url: 'URL externa',
}

type Props = {
  value: string
  onChange: (url: string) => void
  imageOrigin?: string | null
  onOriginChange?: (origin: string) => void
}

export const ImageUpload = ({ value, onChange, imageOrigin, onOriginChange }: Props) => {
  const [tab, setTab] = useState<'upload' | 'url'>('upload')
  const [localOrigin, setLocalOrigin] = useState<string>(imageOrigin ?? '')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const effectiveOrigin = imageOrigin ?? localOrigin

  const setOrigin = (o: string) => {
    setLocalOrigin(o)
    onOriginChange?.(o)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setUploadError('Apenas imagens são permitidas')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Imagem muito grande (máx. 5 MB)')
      return
    }

    setUploading(true)
    setUploadError(null)

    const supabase = createSupabaseBrowserClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage
      .from('cover-images')
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (error) {
      setUploadError('Erro ao fazer upload. Verifique o bucket "cover-images".')
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('cover-images').getPublicUrl(path)
    onChange(data.publicUrl)
    setOrigin('upload')
    setUploading(false)

    if (inputRef.current) inputRef.current.value = ''
  }

  const handleUrlCommit = () => {
    const url = urlInput.trim()
    if (!url) return
    try {
      new URL(url)
      onChange(url)
      setOrigin('url')
      setUploadError(null)
    } catch {
      setUploadError('URL inválida')
    }
  }

  const handleRemove = () => {
    onChange('')
    setOrigin('')
    setUrlInput('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleUseDefault = () => {
    onChange(DEFAULT_COVER)
    setOrigin('default')
    setUploadError(null)
  }

  return (
    <div className="image-upload-v2">
      {/* ---- Tab toggle ---- */}
      <div className="img-tabs">
        <button
          type="button"
          className={`img-tab${tab === 'upload' ? ' img-tab--active' : ''}`}
          onClick={() => { setTab('upload'); setUploadError(null) }}
        >
          Upload arquivo
        </button>
        <button
          type="button"
          className={`img-tab${tab === 'url' ? ' img-tab--active' : ''}`}
          onClick={() => { setTab('url'); setUploadError(null) }}
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
            accept="image/*"
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
          <img src={value} alt="Capa do post" className="img-preview-img" />
          <div className="img-preview-meta">
            {effectiveOrigin && (
              <span className="img-origin-label">
                Origem: <strong>{ORIGIN_LABELS[effectiveOrigin] ?? effectiveOrigin}</strong>
              </span>
            )}
            <button type="button" className="image-remove-btn" onClick={handleRemove}>
              Remover
            </button>
          </div>
        </div>
      )}

      {/* ---- Error ---- */}
      {uploadError && <span className="field-error">{uploadError}</span>}

      {/* ---- Default image fallback button ---- */}
      <button type="button" className="img-default-btn" onClick={handleUseDefault}>
        Usar imagem padrão
      </button>
    </div>
  )
}
