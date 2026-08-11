'use server'

import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { guardUser, isGuardFailure } from '@/lib/auth/guards'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type AccountResult = { error: string } | { ok: true }

// ================================================================
// updateDisplayNameAction — nome de exibição
// ================================================================
const NameSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'O nome deve ter ao menos 2 caracteres')
    .max(80, 'O nome deve ter no máximo 80 caracteres'),
})

export const updateDisplayNameAction = async (
  formData: FormData
): Promise<AccountResult> => {
  const session = await guardUser()
  if (isGuardFailure(session)) return session

  const parsed = NameSchema.safeParse({ full_name: formData.get('full_name') })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createSupabaseServerClient()

  // Só full_name no update. Mandar o objeto inteiro tocaria `role` e
  // `is_active`, que o trigger da migration 013 rejeita para quem não
  // é service-role — mesmo enviando o valor igual ao atual.
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: parsed.data.full_name })
    .eq('id', session.id)

  if (error) {
    console.error('[updateDisplayNameAction]', error.message)
    return { error: 'Não foi possível salvar o nome.' }
  }

  revalidatePath('/admin', 'layout')
  return { ok: true }
}

// ================================================================
// changePasswordAction — troca de senha do próprio usuário
// ================================================================
const PasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Informe a senha atual'),
    new_password: z
      .string()
      .min(8, 'A nova senha deve ter ao menos 8 caracteres')
      .max(72, 'A nova senha deve ter no máximo 72 caracteres'),
    confirm_password: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'A confirmação não confere com a nova senha',
    path: ['confirm_password'],
  })
  .refine((d) => d.new_password !== d.current_password, {
    message: 'A nova senha deve ser diferente da atual',
    path: ['new_password'],
  })

export const changePasswordAction = async (
  formData: FormData
): Promise<AccountResult> => {
  const session = await guardUser()
  if (isGuardFailure(session)) return session

  const parsed = PasswordSchema.safeParse({
    current_password: formData.get('current_password'),
    new_password: formData.get('new_password'),
    confirm_password: formData.get('confirm_password'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createSupabaseServerClient()

  // Reautentica antes de trocar. Sem isso, uma sessão esquecida aberta
  // numa máquina compartilhada bastaria para seqüestrar a conta —
  // o updateUser do Supabase não pede a senha atual por conta própria.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: session.email,
    password: parsed.data.current_password,
  })

  if (reauthError) return { error: 'Senha atual incorreta.' }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  })

  if (error) {
    console.error('[changePasswordAction]', error.message)
    // O Supabase recusa senhas vazadas quando a proteção está ativa.
    if (error.message.toLowerCase().includes('weak') || error.message.toLowerCase().includes('pwned')) {
      return { error: 'Senha muito fraca ou exposta em vazamentos. Escolha outra.' }
    }
    return { error: 'Não foi possível alterar a senha.' }
  }

  return { ok: true }
}
