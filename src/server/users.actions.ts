'use server'

import { supabaseAdmin } from '@/lib/db/supabase-admin'
import { guardAdmin, isGuardFailure } from '@/lib/auth/guards'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { UserRole } from '@/lib/db/schema'

export type UsersResult = { error: string } | { ok: true }

export type ManagedUser = {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
  last_sign_in_at: string | null
}

// Papéis atribuíveis pela UI. 'ai_bot' fica de fora de propósito:
// é uma conta de serviço da automação, não algo para se escolher
// num <select> e acidentalmente aplicar a uma pessoa.
const ASSIGNABLE_ROLES = ['admin', 'editor'] as const

// ================================================================
// listUsersAction
// ================================================================
export const listUsersAction = async (): Promise<
  { error: string } | { ok: true; users: ManagedUser[] }
> => {
  const session = await guardAdmin()
  if (isGuardFailure(session)) return session

  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role, is_active, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[listUsersAction]', error.message)
    return { error: 'Não foi possível carregar os usuários.' }
  }

  // profiles não guarda e-mail — ele vive em auth.users, acessível
  // só via service-role. Uma listagem e um Map, para não fazer
  // uma chamada por usuário.
  const { data: authList, error: authError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })

  if (authError) {
    console.error('[listUsersAction:auth]', authError.message)
    return { error: 'Não foi possível carregar os dados de acesso.' }
  }

  const authById = new Map(authList.users.map((u) => [u.id, u]))

  const users: ManagedUser[] = (profiles ?? []).map((p) => {
    const authUser = authById.get(p.id)
    return {
      id: p.id,
      email: authUser?.email ?? '—',
      full_name: p.full_name,
      role: p.role,
      is_active: p.is_active,
      created_at: p.created_at,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
    }
  })

  return { ok: true, users }
}

// ================================================================
// createUserAction
// ================================================================
const CreateSchema = z.object({
  email: z.string().trim().email('E-mail inválido'),
  full_name: z.string().trim().min(2, 'O nome deve ter ao menos 2 caracteres').max(80),
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres').max(72),
  role: z.enum(ASSIGNABLE_ROLES),
})

export const createUserAction = async (formData: FormData): Promise<UsersResult> => {
  const session = await guardAdmin()
  if (isGuardFailure(session)) return session

  const parsed = CreateSchema.safeParse({
    email: formData.get('email'),
    full_name: formData.get('full_name'),
    password: formData.get('password'),
    role: formData.get('role'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { email, full_name, password, role } = parsed.data

  const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // acesso interno — sem fluxo de confirmação por e-mail
  })

  if (authError || !created.user) {
    console.error('[createUserAction:auth]', authError?.message)
    if (authError?.message.toLowerCase().includes('already')) {
      return { error: 'Já existe um usuário com esse e-mail.' }
    }
    return { error: 'Não foi possível criar o usuário.' }
  }

  // O perfil pode já existir se houver trigger on_auth_user_created;
  // upsert cobre os dois casos sem duplicar.
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: created.user.id, full_name, role, is_active: true })

  if (profileError) {
    console.error('[createUserAction:profile]', profileError.message)
    // Sem perfil o login é rejeitado de qualquer forma, então a conta
    // auth órfã viraria lixo silencioso. Desfaz.
    await supabaseAdmin.auth.admin.deleteUser(created.user.id)
    return { error: 'Não foi possível criar o perfil do usuário.' }
  }

  revalidatePath('/admin/users')
  return { ok: true }
}

// ================================================================
// updateUserRoleAction
// ================================================================
const RoleSchema = z.object({
  user_id: z.string().uuid('Usuário inválido'),
  role: z.enum(ASSIGNABLE_ROLES),
})

export const updateUserRoleAction = async (
  userId: string,
  role: string
): Promise<UsersResult> => {
  const session = await guardAdmin()
  if (isGuardFailure(session)) return session

  const parsed = RoleSchema.safeParse({ user_id: userId, role })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Rebaixar a si mesmo tira o acesso à própria tela no meio da ação.
  if (parsed.data.user_id === session.id) {
    return { error: 'Você não pode alterar o próprio papel.' }
  }

  if (await wouldRemoveLastAdmin(parsed.data.user_id, parsed.data.role !== 'admin')) {
    return { error: 'É preciso manter ao menos um administrador ativo.' }
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ role: parsed.data.role })
    .eq('id', parsed.data.user_id)

  if (error) {
    console.error('[updateUserRoleAction]', error.message)
    return { error: 'Não foi possível alterar o papel.' }
  }

  revalidatePath('/admin/users')
  return { ok: true }
}

// ================================================================
// setUserActiveAction — ativa / desativa o acesso
// ================================================================
export const setUserActiveAction = async (
  userId: string,
  isActive: boolean
): Promise<UsersResult> => {
  const session = await guardAdmin()
  if (isGuardFailure(session)) return session

  if (!z.string().uuid().safeParse(userId).success) {
    return { error: 'Usuário inválido' }
  }

  if (userId === session.id) {
    return { error: 'Você não pode desativar a própria conta.' }
  }

  if (!isActive && (await wouldRemoveLastAdmin(userId, true))) {
    return { error: 'É preciso manter ao menos um administrador ativo.' }
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)

  if (error) {
    console.error('[setUserActiveAction]', error.message)
    return { error: 'Não foi possível alterar o status.' }
  }

  revalidatePath('/admin/users')
  return { ok: true }
}

// ================================================================
// resetUserPasswordAction — admin define nova senha de terceiro
// ================================================================
const ResetSchema = z.object({
  user_id: z.string().uuid('Usuário inválido'),
  new_password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres').max(72),
})

export const resetUserPasswordAction = async (
  formData: FormData
): Promise<UsersResult> => {
  const session = await guardAdmin()
  if (isGuardFailure(session)) return session

  const parsed = ResetSchema.safeParse({
    user_id: formData.get('user_id'),
    new_password: formData.get('new_password'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(parsed.data.user_id, {
    password: parsed.data.new_password,
  })

  if (error) {
    console.error('[resetUserPasswordAction]', error.message)
    return { error: 'Não foi possível redefinir a senha.' }
  }

  revalidatePath('/admin/users')
  return { ok: true }
}

// ----------------------------------------------------------------
// Trava de último admin.
//
// Sem isso, desativar ou rebaixar o único admin deixa o painel sem
// ninguém capaz de gerenciar usuários — e a saída seria mexer no
// banco na mão.
// ----------------------------------------------------------------
const wouldRemoveLastAdmin = async (
  targetId: string,
  isLosingAdmin: boolean
): Promise<boolean> => {
  if (!isLosingAdmin) return false

  const { data: target } = await supabaseAdmin
    .from('profiles')
    .select('role, is_active')
    .eq('id', targetId)
    .single()

  // Só é problema se o alvo é um admin ativo hoje.
  if (!target || target.role !== 'admin' || !target.is_active) return false

  const { count } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin')
    .eq('is_active', true)

  return (count ?? 0) <= 1
}
