// ============================================================
// guards.ts — sessão + papel, em um lugar só.
//
// Antes disso cada server action repetia o par
// getUser() + select('role') na mão. Além de verboso, era fácil
// esquecer — e um guard esquecido é uma rota aberta.
//
// getSessionUser() é embrulhado em cache() do React: várias
// chamadas no mesmo request (layout + página + action) fazem
// uma consulta só.
// ============================================================

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { FALLBACK_PATH } from '@/lib/auth/permissions'
import type { UserRole } from '@/lib/db/schema'

export type SessionUser = {
  id: string
  email: string
  fullName: string
  role: UserRole
  isActive: boolean
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return {
    id: user.id,
    email: user.email ?? '',
    fullName: profile.full_name,
    role: profile.role,
    isActive: profile.is_active,
  }
})

// Para páginas (Server Components): redireciona quando não passa.
export const requireUser = async (): Promise<SessionUser> => {
  const user = await getSessionUser()
  if (!user || !user.isActive) redirect('/admin/login')
  return user
}

export const requireAdmin = async (): Promise<SessionUser> => {
  const user = await requireUser()
  if (user.role !== 'admin') redirect(FALLBACK_PATH)
  return user
}

// Para server actions: devolve erro em vez de redirecionar, porque
// um redirect no meio de uma action vira navegação silenciosa e o
// usuário não entende o que aconteceu.
export type GuardFailure = { error: string }

export const guardUser = async (): Promise<SessionUser | GuardFailure> => {
  const user = await getSessionUser()
  if (!user || !user.isActive) return { error: 'Sessão expirada. Faça login novamente.' }
  return user
}

export const guardAdmin = async (): Promise<SessionUser | GuardFailure> => {
  const user = await guardUser()
  if ('error' in user) return user
  if (user.role !== 'admin') {
    return { error: 'Ação restrita a administradores.' }
  }
  return user
}

export const isGuardFailure = (
  value: SessionUser | GuardFailure
): value is GuardFailure => 'error' in value
