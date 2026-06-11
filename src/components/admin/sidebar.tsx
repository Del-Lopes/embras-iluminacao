'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Sparkles, Tag, LogOut, Zap, ShoppingBag, Bot, Settings, HardDrive, ScrollText, Package, PackagePlus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { logoutAction } from '@/server/auth.actions'
import { AreaSwitcher } from '@/components/admin/area-switcher'
import type { UserRole } from '@/lib/db/schema'

type SidebarProps = {
  userName: string
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

// ---- Produtos area nav (isolated from blog) ----
const PRODUCT_MAIN_NAV: NavItem[] = [
  { label: 'Produtos', href: '/admin/products', icon: Package, exact: true },
  { label: 'Categorias', href: '/admin/products/product-categories', icon: Tag },
]

const PRODUCT_CREATE_NAV: NavItem[] = [
  { label: 'Novo Produto', href: '/admin/products/new', icon: PackagePlus },
]

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  ai_bot: 'Bot IA',
}

export const Sidebar = ({ userName, userRole }: SidebarProps) => {
  const pathname = usePathname()
  const area: 'blog' | 'products' = pathname.startsWith('/admin/products')
    ? 'products'
    : 'blog'

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
          </>
        ) : (
          <>
            {MAIN_NAV.map(renderLink)}

            <div className="sidebar-divider" />

            <span className="sidebar-section-label">Criação</span>
            {CREATE_NAV.map(renderLink)}

            {userRole !== 'ai_bot' && (
              <>
                <div className="sidebar-divider" />
                <span className="sidebar-section-label">Storage</span>
                {STORAGE_NAV.map(renderLink)}

                <div className="sidebar-divider" />
                <span className="sidebar-section-label">Logs</span>
                {LOGS_NAV.map(renderLink)}
              </>
            )}

            {userRole === 'admin' && (
              <>
                <div className="sidebar-divider" />
                <span className="sidebar-section-label">
                  <Bot size={13} strokeWidth={1.5} className="inline-block mr-1 opacity-70" />
                  Automação
                </span>
                {AUTOMATION_NAV.map(renderLink)}
              </>
            )}
          </>
        )}
      </nav>

      {/* User + Logout */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <span className="sidebar-user-name">{userName}</span>
          <span className="sidebar-user-role">{ROLE_LABEL[userRole]}</span>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="sidebar-logout" title="Sair">
            <LogOut size={16} strokeWidth={1.5} />
          </button>
        </form>
      </div>
    </aside>
  )
}
