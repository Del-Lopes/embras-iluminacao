// ============================================================
// supabase-public.ts
// Cliente de leitura ANÔNIMA, sem cookies.
//
// O createSupabaseServerClient lê os cookies da requisição, e no App Router
// isso marca a página como dinâmica: ela passa a ser renderizada a cada
// visita, com Cache-Control: no-store, sem cache de CDN e sem bf-cache.
//
// Para o conteúdo público da home nada disso é necessário: ninguém está
// logado, a RLS já libera a leitura do que está publicado e a página pode ser
// gerada uma vez e revalidada por tempo. Este cliente existe para essas
// leituras, e só para elas.
//
// NUNCA use este cliente onde a identidade importa (painel, ações de escrita,
// qualquer coisa atrás de login): sem cookies não há sessão, e a RLS trataria
// a chamada como anônima.
// ============================================================

import { createClient } from '@supabase/supabase-js'
import type { Database } from './schema'

export const createSupabasePublicClient = () =>
	createClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{ auth: { persistSession: false, autoRefreshToken: false } }
	)
