// ============================================================
// supabase-server.ts
// SSR Supabase client — uses cookies for session management.
// Use in Server Components, Server Actions, and Route Handlers.
// ============================================================

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './schema'

export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                httpOnly: true,     // VULN-004: prevent JS access to session cookies
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
              })
            )
          } catch {
            // setAll called from a Server Component — safe to ignore.
            // Middleware handles session refresh in this case.
          }
        },
      },
    }
  )
}
