'use client'

import { useEffect, useState } from 'react'
import { createLeadAction } from '@/server/lead.actions'
import type { LeadFileType } from '@/lib/db/schema'

export type LeadFile = {
  type: LeadFileType
  label: string
  url: string
}

type Props = {
  productId: string
  productName: string
  file: LeadFile | null // null = fechado
  onClose: () => void
}

// Popup de captura de lead exibido ao clicar num arquivo para download.
// Após registrar o lead, abre o arquivo em nova aba.
export function LeadCaptureModal({ productId, productName, file, onClose }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notRobot, setNotRobot] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fecha no ESC.
  useEffect(() => {
    if (!file) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [file, onClose])

  if (!file) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) return setError('Informe seu nome.')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError('E-mail inválido.')
    if (!phone.trim()) return setError('Informe seu telefone.')
    if (!notRobot) return setError('Confirme que você não é um robô.')

    setSubmitting(true)
    const res = await createLeadAction({
      product_id: productId,
      product_name: productName,
      file_type: file.type,
      name,
      email,
      phone,
    })
    setSubmitting(false)

    if ('error' in res) {
      setError(res.error)
      return
    }

    // Abre o arquivo (download) e fecha.
    window.open(file.url, '_blank', 'noopener,noreferrer')
    onClose()
  }

  return (
    <div className="lead-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="lead-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="lead-modal-close" onClick={onClose} aria-label="Fechar">
          ✕
        </button>

        <h3 className="lead-modal-title">Baixar {file.label}</h3>
        <p className="lead-modal-desc">
          Preencha seus dados para acessar o arquivo e receber novidades por e-mail.
        </p>

        <form className="lead-modal-form" onSubmit={handleSubmit} noValidate>
          <input
            type="text"
            className="lead-modal-input"
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <input
            type="email"
            className="lead-modal-input"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="tel"
            className="lead-modal-input"
            placeholder="Telefone / WhatsApp"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <label className="lead-modal-check">
            <input
              type="checkbox"
              checked={notRobot}
              onChange={(e) => setNotRobot(e.target.checked)}
            />
            <span>Não sou um robô</span>
          </label>

          <p className="lead-modal-privacy">
            Utilizaremos seus dados exclusivamente para comunicações da nossa empresa.
          </p>

          {error && <span className="lead-modal-error">{error}</span>}

          <button type="submit" className="lead-modal-submit" disabled={submitting}>
            {submitting ? 'Enviando…' : 'Baixar arquivo'}
          </button>
        </form>
      </div>
    </div>
  )
}
