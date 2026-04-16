// ============================================================
// supabase-client.ts
// Browser Supabase client — singleton pattern.
// Use ONLY in Client Components ('use client').
// ============================================================

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './schema'

export const createSupabaseBrowserClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
