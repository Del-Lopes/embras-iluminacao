// ============================================================
// supabase-admin.ts
// Service-role Supabase client — bypasses RLS.
// Use ONLY in server-side code: Server Actions, Route Handlers.
// NEVER import this in Client Components or expose to the browser.
// ============================================================

import { createClient } from '@supabase/supabase-js'
import type { Database } from './schema'

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY')
}

export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
