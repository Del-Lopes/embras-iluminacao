import type { NavItem } from '@/types'

export const navItems: NavItem[] = [
  { label: 'Projetos', href: '/#projetos' },
  { label: 'Produtos', href: '/#produtos' },
  { label: 'Manifesto', href: '/#manifesto' },
  { label: 'Catálogo', href: '/catalogo' },
  { label: 'Blog', href: '/blog' },
]

export const socialLinks: NavItem[] = [
  {
    label: 'Instagram',
    href: 'https://instagram.com/embras',
    isExternal: true,
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/company/embras',
    isExternal: true,
  },
  {
    label: 'Pinterest',
    href: 'https://pinterest.com/embras',
    isExternal: true,
  },
]
