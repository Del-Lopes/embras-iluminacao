// ============================================================
// permissions.ts — mapa único de rotas restritas.
//
// Importado pelo middleware (bloqueio real) e pela sidebar
// (esconder o link). Uma fonte só, para os dois nunca divergirem:
// link escondido sem rota bloqueada é falsa segurança, rota
// bloqueada com link visível é UX quebrada.
//
// Sem imports de servidor — o middleware roda no Edge.
// ============================================================

import type { UserRole } from '@/lib/db/schema'

// Prefixos que exigem papel 'admin'.
// A ordem importa: o match é por prefixo, então rotas mais
// específicas precisam vir antes das genéricas.
export const ADMIN_ONLY_PREFIXES = [
  '/admin/products/storage', // Produtos → Arquivos (R2)
  '/admin/storage',          // Blog → Arquivos
  '/admin/logs',             // Blog → Logs
  '/admin/automation',       // Blog → Automação
  '/admin/users',            // Gestão de usuários
] as const

export const isAdminOnlyPath = (pathname: string): boolean =>
  ADMIN_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

export const canAccessPath = (role: UserRole, pathname: string): boolean =>
  isAdminOnlyPath(pathname) ? role === 'admin' : true

// Rota de fallback quando o acesso é negado — a área padrão do editor.
export const FALLBACK_PATH = '/admin/dashboard'
