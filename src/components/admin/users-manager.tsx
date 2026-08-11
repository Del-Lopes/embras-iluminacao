'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, KeyRound, ShieldCheck, ShieldOff } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { useConfirm } from '@/components/ui/confirm-dialog'
import {
  createUserAction,
  updateUserRoleAction,
  setUserActiveAction,
  resetUserPasswordAction,
  type ManagedUser,
} from '@/server/users.actions'
import type { UserRole } from '@/lib/db/schema'

type Props = {
  users: ManagedUser[]
  currentUserId: string
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  ai_bot: 'Bot IA',
}

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('pt-BR') : '—'

export function UsersManager({ users, currentUserId }: Props) {
  const router = useRouter()
  const confirm = useConfirm()
  const createFormRef = useRef<HTMLFormElement>(null)

  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, startCreate] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [resetFor, setResetFor] = useState<string | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)
  const [isResetting, startReset] = useTransition()

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreateError(null)
    const fd = new FormData(e.currentTarget)

    startCreate(async () => {
      const result = await createUserAction(fd)
      if ('error' in result) {
        setCreateError(result.error)
        return
      }
      createFormRef.current?.reset()
      toast.success('Usuário criado.')
      router.refresh()
    })
  }

  const handleRoleChange = async (user: ManagedUser, role: string) => {
    setBusyId(user.id)
    const result = await updateUserRoleAction(user.id, role)
    setBusyId(null)

    if ('error' in result) {
      toast.error(result.error)
      // O <select> já mudou visualmente; refresh devolve o valor real.
      router.refresh()
      return
    }
    toast.success(`${user.full_name} agora é ${ROLE_LABEL[role as UserRole]}.`)
    router.refresh()
  }

  const handleToggleActive = async (user: ManagedUser) => {
    if (user.is_active) {
      const ok = await confirm({
        title: 'Desativar acesso',
        description: `${user.full_name} não conseguirá mais entrar no painel. Os posts e produtos criados por ele continuam intactos.`,
        confirmText: 'Desativar',
        destructive: true,
      })
      if (!ok) return
    }

    setBusyId(user.id)
    const result = await setUserActiveAction(user.id, !user.is_active)
    setBusyId(null)

    if ('error' in result) {
      toast.error(result.error)
      return
    }
    toast.success(user.is_active ? 'Acesso desativado.' : 'Acesso reativado.')
    router.refresh()
  }

  const handleReset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setResetError(null)
    const fd = new FormData(e.currentTarget)

    startReset(async () => {
      const result = await resetUserPasswordAction(fd)
      if ('error' in result) {
        setResetError(result.error)
        return
      }
      setResetFor(null)
      toast.success('Senha redefinida. Informe a nova senha ao usuário.')
    })
  }

  return (
    <div className="cat-manager">
      {/* ---- Novo usuário ---- */}
      <section className="editor-section">
        <h2 className="editor-section-title">
          <UserPlus size={15} strokeWidth={1.5} className="inline-block mr-2 opacity-70" />
          Novo usuário
        </h2>

        <form ref={createFormRef} onSubmit={handleCreate}>
          <div className="editor-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field-group">
              <label htmlFor="new-user-name" className="cat-label">
                Nome <span className="cat-required">*</span>
              </label>
              <Input
                id="new-user-name"
                name="full_name"
                type="text"
                placeholder="Ex: Maria Souza"
                maxLength={80}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="new-user-email" className="cat-label">
                E-mail <span className="cat-required">*</span>
              </label>
              <Input
                id="new-user-email"
                name="email"
                type="email"
                placeholder="maria@empresa.com.br"
                autoComplete="off"
                required
              />
            </div>
          </div>

          <div className="editor-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field-group">
              <label htmlFor="new-user-password" className="cat-label">
                Senha inicial <span className="cat-required">*</span>
              </label>
              <Input
                id="new-user-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <p className="account-hint">
                Mínimo de 8 caracteres. O usuário poderá trocar depois em “Minha conta”.
              </p>
            </div>

            <div className="field-group">
              <label htmlFor="new-user-role" className="cat-label">
                Papel <span className="cat-required">*</span>
              </label>
              <select id="new-user-role" name="role" className="editor-select" defaultValue="editor">
                <option value="editor">Editor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>

          {createError && <p className="form-error" style={{ margin: 0 }}>{createError}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="submit" className="btn-primary" disabled={isCreating}>
              {isCreating ? 'Criando…' : '+ Criar usuário'}
            </button>
          </div>
        </form>
      </section>

      {/* ---- Lista ---- */}
      <section className="cat-list-section">
        <h2 className="editor-section-title" style={{ marginBottom: 12 }}>
          Usuários cadastrados ({users.length})
        </h2>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th className="data-table-head">Usuário</th>
                <th className="data-table-head">Papel</th>
                <th className="data-table-head">Status</th>
                <th className="data-table-head">Último acesso</th>
                <th className="data-table-head" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === currentUserId
                const isBot = user.role === 'ai_bot'
                const isBusy = busyId === user.id

                return (
                  <tr key={user.id} className="data-table-row">
                    <td className="data-table-cell">
                      <div className="user-cell">
                        <span className="user-cell-name">
                          {user.full_name}
                          {isSelf && <span className="user-self-tag">você</span>}
                        </span>
                        <span className="user-cell-email">{user.email}</span>
                      </div>
                    </td>

                    <td className="data-table-cell">
                      {isBot || isSelf ? (
                        // Bot é conta de serviço; a própria conta é
                        // bloqueada para não haver auto-rebaixamento.
                        <span className="user-role-static">{ROLE_LABEL[user.role]}</span>
                      ) : (
                        <select
                          className="editor-select editor-select--sm"
                          value={user.role}
                          disabled={isBusy}
                          onChange={(e) => handleRoleChange(user, e.target.value)}
                          aria-label={`Papel de ${user.full_name}`}
                        >
                          <option value="editor">Editor</option>
                          <option value="admin">Administrador</option>
                        </select>
                      )}
                    </td>

                    <td className="data-table-cell">
                      <span
                        className={
                          user.is_active ? 'user-status user-status--on' : 'user-status user-status--off'
                        }
                      >
                        {user.is_active ? 'Ativo' : 'Desativado'}
                      </span>
                    </td>

                    <td
                      className="data-table-cell"
                      style={{ color: 'var(--color-muted)', whiteSpace: 'nowrap' }}
                    >
                      {formatDate(user.last_sign_in_at)}
                    </td>

                    <td className="data-table-cell">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => {
                            setResetError(null)
                            setResetFor(resetFor === user.id ? null : user.id)
                          }}
                        >
                          <KeyRound size={13} strokeWidth={1.5} />
                          Senha
                        </button>

                        {!isSelf && !isBot && (
                          <button
                            type="button"
                            className={
                              user.is_active
                                ? 'action-btn action-btn--delete'
                                : 'action-btn'
                            }
                            onClick={() => handleToggleActive(user)}
                            disabled={isBusy}
                          >
                            {user.is_active ? (
                              <>
                                <ShieldOff size={13} strokeWidth={1.5} />
                                Desativar
                              </>
                            ) : (
                              <>
                                <ShieldCheck size={13} strokeWidth={1.5} />
                                Reativar
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {resetFor === user.id && (
                        <form className="user-reset-form" onSubmit={handleReset}>
                          <input type="hidden" name="user_id" value={user.id} />
                          <Input
                            name="new_password"
                            type="password"
                            placeholder="Nova senha (mín. 8)"
                            autoComplete="new-password"
                            minLength={8}
                            required
                          />
                          <button type="submit" className="btn-primary" disabled={isResetting}>
                            {isResetting ? 'Salvando…' : 'Definir'}
                          </button>
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() => setResetFor(null)}
                          >
                            Cancelar
                          </button>
                          {resetError && <p className="form-error">{resetError}</p>}
                        </form>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
