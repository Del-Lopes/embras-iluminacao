import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guards'
import { listUsersAction } from '@/server/users.actions'
import { UsersManager } from '@/components/admin/users-manager'

export const metadata: Metadata = {
  title: 'Usuários',
  robots: { index: false, follow: false },
}

export default async function UsersPage() {
  // Redundante com o middleware de propósito: se um dia o matcher
  // mudar, a página continua fechada.
  const session = await requireAdmin()
  const result = await listUsersAction()

  return (
    <div className="editor-page">
      <div className="editor-header">
        <Link href="/admin/dashboard" className="editor-back">← Dashboard</Link>
        <h1 className="dashboard-title">Usuários</h1>
        <p className="dashboard-subtitle">
          Controle quem acessa o painel e com qual nível de permissão
        </p>
      </div>

      {'error' in result ? (
        <p className="form-error">{result.error}</p>
      ) : (
        <UsersManager users={result.users} currentUserId={session.id} />
      )}
    </div>
  )
}
