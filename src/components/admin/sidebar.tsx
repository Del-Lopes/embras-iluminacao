'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Sparkles, Tag, LogOut, Zap, ShoppingBag, Bot, Settings } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { logoutAction } from '@/server/auth.actions'
import type { UserRole } from '@/lib/db/schema'

type SidebarProps = {
  userName: string
  userRole: UserRole
}

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
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

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  ai_bot: 'Bot IA',
}

export const Sidebar = ({ userName, userRole }: SidebarProps) => {
  const pathname = usePathname()

  const renderLink = ({ label, href, icon: Icon }: NavItem) => (
    <Link
      key={href}
      href={href}
      className={cn('sidebar-link', pathname.startsWith(href) && 'sidebar-link--active')}
    >
      <Icon size={16} strokeWidth={1.5} />
      <span>{label}</span>
    </Link>
  )

  return (
    <aside className="admin-sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <Zap size={18} strokeWidth={1.5} />
        <span>Embras Admin</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {MAIN_NAV.map(renderLink)}

        <div className="sidebar-divider" />

        <span className="sidebar-section-label">Criação</span>
        {CREATE_NAV.map(renderLink)}

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
