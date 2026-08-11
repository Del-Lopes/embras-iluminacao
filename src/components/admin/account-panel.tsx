'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { X, User, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import {
  updateDisplayNameAction,
  changePasswordAction,
} from '@/server/account.actions'
import type { UserRole } from '@/lib/db/schema'

type Props = {
  open: boolean
  onClose: () => void
  userName: string
  userEmail: string
  userRole: UserRole
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  ai_bot: 'Bot IA',
}

export function AccountPanel({
  open,
  onClose,
  userName,
  userEmail,
  userRole,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(userName)
  const [nameError, setNameError] = useState<string | null>(null)
  const [isSavingName, startSaveName] = useTransition()

  const [pwdError, setPwdError] = useState<string | null>(null)
  const [isSavingPwd, startSavePwd] = useTransition()
  const pwdFormRef = useRef<HTMLFormElement>(null)

  // Reabrir depois de um cancelamento não deve ressuscitar o rascunho
  // anterior nem a mensagem de erro antiga.
  useEffect(() => {
    if (!open) return
    setName(userName)
    setNameError(null)
    setPwdError(null)
    pwdFormRef.current?.reset()
    // Foco no primeiro campo: o painel abre por clique, então o
    // teclado precisa chegar junto.
    const id = window.setTimeout(() => nameInputRef.current?.focus(), 50)
    return () => window.clearTimeout(id)
  }, [open, userName])

  // Esc fecha — expectativa padrão de qualquer modal.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleSaveName = () => {
    setNameError(null)
    const fd = new FormData()
    fd.set('full_name', name)

    startSaveName(async () => {
      const result = await updateDisplayNameAction(fd)
      if ('error' in result) {
        setNameError(result.error)
        return
      }
      toast.success('Nome atualizado.')
    })
  }

  const handleSavePassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPwdError(null)
    const fd = new FormData(e.currentTarget)

    startSavePwd(async () => {
      const result = await changePasswordAction(fd)
      if ('error' in result) {
        setPwdError(result.error)
        return
      }
      pwdFormRef.current?.reset()
      toast.success('Senha alterada com sucesso.')
    })
  }

  return (
    <div
      className="account-overlay"
      onMouseDown={(e) => {
        // Só fecha no clique fora do cartão — mousedown dentro e
        // soltar fora (seleção de texto) não deve fechar.
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="account-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-panel-title"
      >
        <header className="account-panel-header">
          <div>
            <h2 id="account-panel-title" className="account-panel-title">
              Minha conta
            </h2>
            <p className="account-panel-subtitle">
              {userEmail} · {ROLE_LABEL[userRole]}
            </p>
          </div>
          <button
            type="button"
            className="account-panel-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </header>

        <div className="account-panel-body">
          {/* ---- Nome de exibição ---- */}
          <section className="account-section">
            <h3 className="account-section-title">
              <User size={14} strokeWidth={1.5} />
              Nome de exibição
            </h3>

            <div className="field-group">
              <label htmlFor="account-name" className="cat-label">
                Nome
              </label>
              <Input
                id="account-name"
                ref={nameInputRef}
                type="text"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              />
            </div>

            {nameError && <p className="form-error">{nameError}</p>}

            <div className="account-section-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveName}
                disabled={isSavingName || name.trim() === userName.trim()}
              >
                {isSavingName ? 'Salvando…' : 'Salvar nome'}
              </button>
            </div>
          </section>

          <div className="account-divider" />

          {/* ---- Senha ---- */}
          <form ref={pwdFormRef} className="account-section" onSubmit={handleSavePassword}>
            <h3 className="account-section-title">
              <KeyRound size={14} strokeWidth={1.5} />
              Alterar senha
            </h3>

            {/* Campo oculto de usuário: sem ele os gerenciadores de
                senha não associam a alteração à conta certa. */}
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={userEmail}
              readOnly
              hidden
            />

            <div className="field-group">
              <label htmlFor="current-password" className="cat-label">
                Senha atual <span className="cat-required">*</span>
              </label>
              <Input
                id="current-password"
                name="current_password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="new-password" className="cat-label">
                Nova senha <span className="cat-required">*</span>
              </label>
              <Input
                id="new-password"
                name="new_password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <p className="account-hint">Mínimo de 8 caracteres.</p>
            </div>

            <div className="field-group">
              <label htmlFor="confirm-password" className="cat-label">
                Confirmar nova senha <span className="cat-required">*</span>
              </label>
              <Input
                id="confirm-password"
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            {pwdError && <p className="form-error">{pwdError}</p>}

            <div className="account-section-actions">
              <button type="submit" className="btn-primary" disabled={isSavingPwd}>
                {isSavingPwd ? 'Alterando…' : 'Alterar senha'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
