import type { NavItem } from '@/types'

export const navItems: NavItem[] = [
  { label: 'Projetos', href: '/#projetos' },
  { label: 'Quem Somos', href: '/#quem-somos' },
  { label: 'Manifesto', href: '/#manifesto' },
  { label: 'Catálogo', href: '/catalogo' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contato', href: '', disabled: true },
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
