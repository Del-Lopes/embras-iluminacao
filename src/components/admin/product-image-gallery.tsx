'use client'

import { useRef, useState } from 'react'
import { getProductUploadUrl } from '@/server/upload.actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

export type GalleryImage = { url: string; alt: string }

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/tif']
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

type Props = {
  value: GalleryImage[]
  onChange: (images: GalleryImage[]) => void
  // Subpasta no R2 (nome do item). Vazio = upload bloqueado.
  folder?: string
  // Destino no R2: 'product' → produtos/, 'project' → projetos/
  group?: 'product' | 'project'
}

// Carousel image manager. Each file is uploaded straight to R2 via a
// presigned PUT (same secure flow as r2-upload.tsx). Order is the carousel
// order (persisted as sort_order on save).
export const ProductImageGallery = ({ value, onChange, folder = '', group = 'product' }: Props) => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadOne = async (file: File): Promise<GalleryImage | null> => {
    if (!ACCEPTED.includes(file.type)) {
      setError(`"${file.name}": apenas JPG, PNG ou WebP`)
      return null
    }
    if (file.size > MAX_BYTES) {
      setError(`"${file.name}": imagem muito grande (máx. 5 MB)`)
      return null
    }
    const result = await getProductUploadUrl({
      kind: 'image',
      group,
      folder,
      contentType: file.type,
      contentLength: file.size,
    })
    if ('error' in result) {
      setError(result.error)
      return null
    }
    const put = await fetch(result.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': result.contentType, 'Cache-Control': result.cacheControl },
      body: file,
    })
    if (!put.ok) {
      setError('Falha no envio para o storage')
      return null
    }
    return { url: result.publicUrl, alt: '' }
  }

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    setError(null)

    const added: GalleryImage[] = []
    for (const file of files) {
      const img = await uploadOne(file)
      if (img) added.push(img)
    }
    if (added.length) onChange([...value, ...added])

    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const updateAlt = (index: number, alt: string) => {
    onChange(value.map((img, i) => (i === index ? { ...img, alt } : img)))
  }

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= value.length) return
    const next = [...value]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="gallery">
      {!folder && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Informe o nome antes de enviar imagens.
          </AlertDescription>
        </Alert>
      )}
      <label className={`image-upload-label${!folder ? ' image-upload-label--disabled' : ''}`}>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/tiff,.tif,.tiff"
          multiple
          className="sr-only"
          onChange={handleFiles}
          disabled={uploading || !folder}
        />
        {uploading ? 'Enviando...' : '+ Selecionar imagens'}
      </label>

      {error && <span className="field-error">{error}</span>}

      {value.length > 0 && (
        <ul className="gallery-list">
          {value.map((img, i) => (
            <li key={img.url} className="gallery-item">
              <span className="gallery-order">{i + 1}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt || `Imagem ${i + 1}`} className="gallery-thumb" />
              <input
                type="text"
                className="toolbar-input gallery-alt"
                placeholder="Texto alternativo (acessibilidade)"
                value={img.alt}
                onChange={(e) => updateAlt(i, e.target.value)}
              />
              <div className="gallery-actions">
                <button type="button" className="action-btn" onClick={() => move(i, -1)} disabled={i === 0} title="Mover para cima">
                  ↑
                </button>
                <button type="button" className="action-btn" onClick={() => move(i, 1)} disabled={i === value.length - 1} title="Mover para baixo">
                  ↓
                </button>
                <button type="button" className="action-btn action-btn--delete" onClick={() => remove(i)} title="Remover">
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
