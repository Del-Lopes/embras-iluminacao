'use server'

import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

type LoginResult = { error: string }

export const loginAction = async (
  formData: FormData
): Promise<LoginResult> => {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  // Generic error — no field-level hints to prevent user enumeration
  const INVALID = { error: 'Credenciais inválidas.' }

  if (!parsed.success) return INVALID

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error || !data.user) return INVALID

  // Verify role — must be admin or editor
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  if (!profile || !['admin', 'editor'].includes(profile.role)) {
    await supabase.auth.signOut()
    return INVALID
  }

  redirect('/admin/dashboard')
}

export const logoutAction = async (): Promise<void> => {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}
