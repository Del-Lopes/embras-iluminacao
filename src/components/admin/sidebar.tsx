'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Sparkles, Tag, LogOut, Zap, ShoppingBag, Bot, Settings, HardDrive, ScrollText, PackagePlus, SlidersHorizontal, Users, FolderPlus, FolderKanban, FileDown } from 'lucide-react'
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

// ---- Produtos area nav (isolated from blog) — Projetos vive aqui dentro ----
const PRODUCT_MAIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin/products', icon: LayoutDashboard, exact: true },
  { label: 'Projetos', href: '/admin/projects', icon: FolderKanban },
  { label: 'Categorias', href: '/admin/products/product-categories', icon: Tag },
  { label: 'Especificações', href: '/admin/products/characteristics', icon: SlidersHorizontal },
  { label: 'Catálogo (PDF)', href: '/admin/catalog', icon: FileDown },
]

const PRODUCT_CREATE_NAV: NavItem[] = [
  { label: 'Novo Produto', href: '/admin/products/new', icon: PackagePlus },
  { label: 'Novo Projeto', href: '/admin/projects/new', icon: FolderPlus },
]

const PRODUCT_STORAGE_NAV: NavItem[] = [
  { label: 'Arquivos (R2)', href: '/admin/products/storage', icon: HardDrive },
]

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  ai_bot: 'Bot IA',
}

export const Sidebar = ({ userName, userEmail, userRole }: SidebarProps) => {
  const pathname = usePathname()
  const [accountOpen, setAccountOpen] = useState(false)
  // Projetos e Catálogo vivem dentro da área Site (ex-Produtos), então
  // /admin/projects e /admin/catalog também ativam 'products'.
  const area: 'blog' | 'products' =
    pathname.startsWith('/admin/products') ||
    pathname.startsWith('/admin/projects') ||
    pathname.startsWith('/admin/catalog')
      ? 'products'
      : 'blog'

  // Espelha ADMIN_ONLY_PREFIXES de lib/auth/permissions. O middleware
  // é quem bloqueia de fato; aqui é só para não exibir um link que
  // levaria a um redirect.
  const isAdmin = userRole === 'admin'

  const renderLink = ({ label, href, icon: Icon, exact }: NavItem) => {
    const isActive = exact ? pathname === href : pathname.startsWith(href)
    return (
      <Link
        key={href}
        href={href}
        className={cn('sidebar-link', isActive && 'sidebar-link--active')}
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
      <nav className="sidebar-nav">
        {area === 'products' ? (
          <>
            {PRODUCT_MAIN_NAV.map(renderLink)}

            <div className="sidebar-divider" />

            <span className="sidebar-section-label">Criação</span>
            {PRODUCT_CREATE_NAV.map(renderLink)}

            {isAdmin && (
              <>
                <div className="sidebar-divider" />
                <span className="sidebar-section-label">Storage</span>
                {PRODUCT_STORAGE_NAV.map(renderLink)}
              </>
            )}
          </>
        ) : (
          <>
            {MAIN_NAV.map(renderLink)}

            <div className="sidebar-divider" />

            <span className="sidebar-section-label">Criação</span>
            {CREATE_NAV.map(renderLink)}

            {isAdmin && (
              <>
                <div className="sidebar-divider" />
                <span className="sidebar-section-label">Storage</span>
                {STORAGE_NAV.map(renderLink)}

                <div className="sidebar-divider" />
                <span className="sidebar-section-label">Logs</span>
                {LOGS_NAV.map(renderLink)}

                <div className="sidebar-divider" />
                <span className="sidebar-section-label">
                  <Bot size={13} strokeWidth={1.5} className="inline-block mr-1 opacity-70" />
                  Automação
                </span>
                {AUTOMATION_NAV.map(renderLink)}

                <div className="sidebar-divider" />
                <span className="sidebar-section-label">Acesso</span>
                {USERS_NAV.map(renderLink)}
              </>
            )}
          </>
        )}
      </nav>

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
