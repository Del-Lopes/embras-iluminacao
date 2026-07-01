'use client'

import { useRef, useState } from 'react'
import { getProductUploadUrl } from '@/server/upload.actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

// .glb uploader for the 3D model field. Reuses the same secure presigned-PUT
// flow as image uploads, but with kind='model'. Browsers often report an empty
// or octet-stream MIME for .glb, so we validate the extension client-side and
// send the canonical 'model/gltf-binary' content type (matched in the signature).
const MAX_BYTES = 50 * 1024 * 1024 // 50 MB
const MODEL_CONTENT_TYPE = 'model/gltf-binary'

type Props = {
  value: string
  onChange: (url: string) => void
  // Subpasta no R2 dentro de modelos_3d/ (nome do produto). Vazio = bloqueado.
  folder?: string
}

export const R2ModelUpload = ({ value, onChange, folder = '' }: Props) => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.glb')) {
      setError('Envie um arquivo .glb')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Modelo muito grande (máx. 50 MB)')
      return
    }

    setUploading(true)
    setError(null)
    try {
      const result = await getProductUploadUrl({
        kind: 'model',
        group: 'model',
        folder,
        contentType: MODEL_CONTENT_TYPE,
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
      onChange(result.publicUrl)
    } catch {
      setError('Erro inesperado no upload')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const commitUrl = () => {
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

  if (value) {
    return (
      <div className="model-upload">
        <div className="model-upload-current">
          <span className="model-upload-file">📦 {value.split('/').pop()}</span>
          <button type="button" className="image-remove-btn" onClick={() => onChange('')}>
            Remover
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="model-upload">
      {!folder && (
        <Alert variant="warning" className="mb-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Informe o nome do produto antes de enviar o modelo.
          </AlertDescription>
        </Alert>
      )}
      <label className={`image-upload-label${!folder ? ' image-upload-label--disabled' : ''}`}>
        <input
          ref={inputRef}
          type="file"
          accept=".glb,model/gltf-binary"
          className="sr-only"
          onChange={handleFile}
          disabled={uploading || !folder}
        />
        {uploading ? 'Enviando...' : '+ Enviar modelo .glb'}
      </label>

      <div className="img-url-row">
        <input
          type="url"
          className="toolbar-input"
          placeholder="ou cole a URL de um .glb / .gltf"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commitUrl())}
        />
        <button type="button" className="btn-secondary img-url-btn" onClick={commitUrl}>
          Usar
        </button>
      </div>

      {error && <span className="field-error">{error}</span>}
    </div>
  )
}
