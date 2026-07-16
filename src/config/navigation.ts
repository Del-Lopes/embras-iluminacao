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
    href: 'https://www.instagram.com/embrasiluminacao/',
    isExternal: true,
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/embras-ilumina%C3%A7%C3%A3o/',
    isExternal: true,
  },
]
