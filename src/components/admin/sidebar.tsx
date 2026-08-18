'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, LayoutDashboard, FileText, Sparkles, Tag, LogOut, Zap, ShoppingBag, Settings, HardDrive, ScrollText, PackagePlus, SlidersHorizontal, Users, FolderPlus, FolderKanban, FileDown, Inbox, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { logoutAction } from '@/server/auth.actions'
import { AreaSwitcher } from '@/components/admin/area-switcher'
import { AccountPanel } from '@/components/admin/account-panel'
import type { UserRole } from '@/lib/db/schema'

type SidebarProps = {
  userName: string
  userEmail: string
  userRole: UserRole
}

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  exact?: boolean
  // Pinta o item na cor de destaque, para a ação principal de um grupo.
  accent?: boolean
}

const MAIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Categorias', href: '/admin/categories', icon: Tag },
]

const CREATE_NAV: NavItem[] = [
  { label: 'Novo Post', href: '/admin/publish', icon: FileText },
  { label: 'Criar com IA', href: '/admin/publish-ai', icon: Sparkles },
  { label: 'Artigo para Vendas', href: '/admin/publish-sales', icon: ShoppingBag },
]

const AUTOMATION_NAV: NavItem[] = [
  { label: 'Configurações', href: '/admin/automation/settings', icon: Settings },
]

const STORAGE_NAV: NavItem[] = [
  { label: 'Arquivos', href: '/admin/storage', icon: HardDrive },
]

const LOGS_NAV: NavItem[] = [
  { label: 'Todos', href: '/admin/logs', icon: ScrollText },
]

const USERS_NAV: NavItem[] = [
  { label: 'Usuários', href: '/admin/users', icon: Users },
]

// ---- Área Produtos (isolada do blog) ----
// Quatro grupos por assunto, em vez da divisão anterior por tipo de ação
// (listagens de um lado, criação de outro): assim cada entidade fica com a
// listagem e o "novo" lado a lado, e o que não pertence a nenhuma das duas
// cai em Outros.
const PRODUCT_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin/products', icon: LayoutDashboard, exact: true },
  // accent: é a ação mais frequente da área e ganha destaque de cor.
  { label: 'Novo Produto', href: '/admin/products/new', icon: PackagePlus, accent: true },
  { label: 'Categorias', href: '/admin/products/product-categories', icon: Tag },
  { label: 'Filtros', href: '/admin/products/characteristics', icon: SlidersHorizontal },
  { label: 'Informações Técnicas', href: '/admin/products/specifications', icon: ListChecks },
]

const PRODUCT_STORAGE_NAV: NavItem[] = [
  { label: 'Arquivos (R2)', href: '/admin/products/storage', icon: HardDrive },
]

const PROJECTS_NAV: NavItem[] = [
  { label: 'Projetos', href: '/admin/projects', icon: FolderKanban, exact: true },
  { label: 'Novo Projeto', href: '/admin/projects/new', icon: FolderPlus, accent: true },
]

const OTHERS_NAV: NavItem[] = [
  { label: 'Leads', href: '/admin/leads', icon: Inbox, accent: true },
  { label: 'Catálogo (PDF)', href: '/admin/catalog', icon: FileDown },
]

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  ai_bot: 'Bot IA',
}

export const Sidebar = ({ userName, userEmail, userRole }: SidebarProps) => {
  const pathname = usePathname()
  const [accountOpen, setAccountOpen] = useState(false)

  // Indicador de que a lista continua abaixo do corte. Sem ele, um item
  // parcialmente visível no pé da área rolável passa por item cortado por
  // acaso, e não por "tem mais coisa aqui".
  const navRef = useRef<HTMLElement>(null)
  const [hasMore, setHasMore] = useState(false)

  const updateHasMore = useCallback(() => {
    const el = navRef.current
    if (!el) return
    // 1px de tolerância: alturas fracionárias impedem o scrollTop de alcançar
    // exatamente o limite.
    setHasMore(el.scrollHeight - el.clientHeight - el.scrollTop > 1)
  }, [])

  useEffect(() => {
    updateHasMore()
    const el = navRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(updateHasMore)
    ro.observe(el)
    return () => ro.disconnect()
    // pathname entra na lista porque a navegação muda de tamanho ao trocar de área.
  }, [updateHasMore, pathname])
  // Projetos, Catálogo e Leads vivem dentro da área Site (ex-Produtos), então
  // /admin/projects, /admin/catalog e /admin/leads também ativam 'products'.
  const area: 'blog' | 'products' =
    pathname.startsWith('/admin/products') ||
    pathname.startsWith('/admin/projects') ||
    pathname.startsWith('/admin/catalog') ||
    pathname.startsWith('/admin/leads')
      ? 'products'
      : 'blog'

  // Espelha ADMIN_ONLY_PREFIXES de lib/auth/permissions. O middleware
  // é quem bloqueia de fato; aqui é só para não exibir um link que
  // levaria a um redirect.
  const isAdmin = userRole === 'admin'

  const renderLink = ({ label, href, icon: Icon, exact, accent }: NavItem) => {
    const isActive = exact ? pathname === href : pathname.startsWith(href)
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          'sidebar-link',
          accent && 'sidebar-link--accent',
          isActive && 'sidebar-link--active'
        )}
      >
        <Icon size={16} strokeWidth={1.5} />
        <span>{label}</span>
      </Link>
    )
  }

  return (
    <aside className="admin-sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <Zap size={18} strokeWidth={1.5} />
        <span>Embras Admin</span>
      </div>

      {/* Area switcher — Blog ↔ Produtos */}
      <AreaSwitcher area={area} />

      {/* Navigation — isolated per area */}
      <nav className="sidebar-nav" ref={navRef} onScroll={updateHasMore}>
        {area === 'products' ? (
          <>
            <span className="sidebar-section-label">Produtos</span>
            {PRODUCT_NAV.map(renderLink)}

            <span className="sidebar-section-label">Projetos</span>
            {PROJECTS_NAV.map(renderLink)}

            <span className="sidebar-section-label">Outros</span>
            {OTHERS_NAV.map(renderLink)}

            {/* Storage por último: é ferramenta de manutenção, não fluxo de
                trabalho, e só admin enxerga. */}
            {isAdmin && (
              <>
                <span className="sidebar-section-label">Storage</span>
                {PRODUCT_STORAGE_NAV.map(renderLink)}
              </>
            )}
          </>
        ) : (
          <>
            {MAIN_NAV.map(renderLink)}

            <span className="sidebar-section-label">Criação</span>
            {CREATE_NAV.map(renderLink)}

            {isAdmin && (
              <>
                <span className="sidebar-section-label">Storage</span>
                {STORAGE_NAV.map(renderLink)}

                <span className="sidebar-section-label">Logs</span>
                {LOGS_NAV.map(renderLink)}

                <span className="sidebar-section-label">Automação</span>
                {AUTOMATION_NAV.map(renderLink)}

              </>
            )}
          </>
        )}
      </nav>

      {hasMore && (
        <div className="sidebar-more" aria-hidden="true">
          <ChevronDown size={16} strokeWidth={1.5} />
        </div>
      )}

      {/* Acesso fica no pé da barra, logo acima do usuário: é configuração de
          quem entra no painel, não uma das áreas de trabalho. Vale para as
          duas áreas, e não só para o blog, onde estava antes. */}
      {isAdmin && <div className="sidebar-access">{USERS_NAV.map(renderLink)}</div>}

      {/* User + Logout */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-user"
          onClick={() => setAccountOpen(true)}
          title="Minha conta"
          aria-haspopup="dialog"
        >
          <span className="sidebar-user-name">{userName}</span>
          <span className="sidebar-user-role">{ROLE_LABEL[userRole]}</span>
        </button>
        <form action={logoutAction}>
          <button type="submit" className="sidebar-logout" title="Sair">
            <LogOut size={16} strokeWidth={1.5} />
          </button>
        </form>
      </div>

      <AccountPanel
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
      />
    </aside>
  )
}
