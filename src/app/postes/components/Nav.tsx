import Link from 'next/link'
import type { NavItem } from '@/types'
import ThemeToggle from '@/components/common/ThemeToggle'
import MobileMenu from '@/components/common/MobileMenu'

// Home leva à página principal (/); os demais são âncoras das seções da LP.
const LP_NAV: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Cenário', href: '#dores' },
  { label: 'Solução', href: '#solucao' },
  { label: 'Produtos', href: '#produtos' },
  { label: 'Projetos', href: '#prova' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contato', href: '#contato' },
]

export default function Nav() {
  return (
    <nav className="lp-nav">
      <div className="nav-brand">
        <Link href="/" aria-label="Ir para a home">
          <img src="/images/embras-logo-w.png" alt="Embras" className="nav-logo" />
        </Link>
      </div>
      <div className="nav-links">
        {LP_NAV.map((item) =>
          item.href.startsWith('#') ? (
            <a key={item.label} className="m-link" href={item.href}>
              {item.label}
            </a>
          ) : (
            <Link key={item.label} className="m-link" href={item.href}>
              {item.label}
            </Link>
          )
        )}
      </div>
      <div className="nav-cta">
        <ThemeToggle />
        <MobileMenu items={LP_NAV} barClass="bg-(--color-accent)" />
      </div>
    </nav>
  )
}
