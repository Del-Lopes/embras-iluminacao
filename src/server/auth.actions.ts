'use server'

import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

type LoginResult = { error: string }

// ================================================================
// Rate limiting (in-memory, per-process)
// VULN-003 fix: prevent brute-force login attempts
// ================================================================
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

const loginAttempts = new Map<string, { count: number; firstAttempt: number }>()

function isLoginRateLimited(email: string): boolean {
  const key = email.toLowerCase()
  const now = Date.now()
  const entry = loginAttempts.get(key)

  if (!entry || now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttempt: now })
    return false
  }

  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

function resetLoginAttempts(email: string): void {
  loginAttempts.delete(email.toLowerCase())
}

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

  // Rate limit check
  if (isLoginRateLimited(parsed.data.email)) {
    return { error: 'Muitas tentativas. Tente novamente em 15 minutos.' }
  }

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

  // Successful login — reset rate limiter
  resetLoginAttempts(parsed.data.email)

  redirect('/admin/dashboard')
}

// VULN-010 fix: ensure cookies are cleared on logout
export const logoutAction = async (): Promise<void> => {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()

  // Explicitly clear all Supabase auth cookies
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  for (const cookie of allCookies) {
    if (cookie.name.includes('sb-') || cookie.name.includes('supabase')) {
      cookieStore.delete(cookie.name)
    }
  }

  redirect('/admin/login')
}
