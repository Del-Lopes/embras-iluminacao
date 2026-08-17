import type { NavItem } from '@/types'

export const navItems: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Produtos', href: '/catalogo' },
  // Páginas próprias, e não mais âncoras para seções da home.
  { label: 'Projetos', href: '/projetos' },
  { label: 'Quem Somos', href: '/quem-somos' },
  { label: 'Postes', href: '/postes' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contato', href: '/#contato' },
]

export const socialLinks: NavItem[] = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/embrasiluminacao/',
    isExternal: true,
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/embras-ilumina%C3%A7%C3%A3o/',
    isExternal: true,
  },
]
