'use client'

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { getProductUploadUrl } from '@/server/upload.actions'
import { saveCatalogAction, removeCatalogAction } from '@/server/site-settings.actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, AlertTriangle } from 'lucide-react'

const MAX_BYTES = 30 * 1024 * 1024 // 30 MB

type Props = {
  initialUrl: string | null
  initialFilename: string | null
}

// Uploader do PDF do catálogo. Envia direto ao R2 via presigned PUT (mesmo fluxo
// seguro das imagens) e persiste a URL em site_settings via server action.
export const CatalogUploader = ({ initialUrl, initialFilename }: Props) => {
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [filename, setFilename] = useState<string | null>(initialFilename)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    if (file.type !== 'application/pdf') {
      setError('Envie um arquivo PDF.')
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Arquivo muito grande (máx. 30 MB).')
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const result = await getProductUploadUrl({
        kind: 'document',
        group: 'catalog',
        contentType: file.type,
        contentLength: file.size,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      const put = await fetch(result.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': result.contentType, 'Cache-Control': result.cacheControl },
        body: file,
      })
      if (!put.ok) {
        setError('Falha no envio para o storage.')
        return
      }
      const saved = await saveCatalogAction({ url: result.publicUrl, filename: file.name })
      if ('error' in saved) {
        setError(saved.error)
        return
      }
      setUrl(result.publicUrl)
      setFilename(file.name)
      toast.success('Catálogo atualizado!')
    } catch {
      setError('Erro inesperado no upload.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = () => {
    startTransition(async () => {
      const res = await removeCatalogAction()
      if ('error' in res) {
        toast.error(res.error)
        return
      }
      setUrl(null)
      setFilename(null)
      toast.success('Catálogo removido.')
    })
  }

  return (
    <div className="image-upload-v2" style={{ maxWidth: 520 }}>
      {url ? (
        <div className="img-preview-block">
          <a href={url} target="_blank" rel="noopener noreferrer" className="post-title-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} strokeWidth={1.5} />
            {filename || 'Catálogo (PDF)'}
          </a>
          <div className="img-preview-meta" style={{ marginTop: 12, display: 'flex', gap: 10 }}>
            <label className="image-upload-label" style={{ margin: 0 }}>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={handleFile}
                disabled={uploading || isPending}
              />
              {uploading ? 'Enviando...' : 'Substituir PDF'}
            </label>
            <button
              type="button"
              className="action-btn action-btn--delete"
              onClick={handleRemove}
              disabled={uploading || isPending}
            >
              {isPending ? 'Removendo…' : 'Remover'}
            </button>
          </div>
        </div>
      ) : (
        <label className="image-upload-label">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={handleFile}
            disabled={uploading}
          />
          {uploading ? 'Enviando...' : '+ Selecionar PDF do catálogo'}
        </label>
      )}

      {!url && !uploading && (
        <Alert variant="warning" style={{ marginTop: 12 }}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Nenhum catálogo enviado. O botão de download não aparece no site enquanto não houver um PDF.
          </AlertDescription>
        </Alert>
      )}

      {error && <span className="field-error">{error}</span>}
    </div>
  )
}
