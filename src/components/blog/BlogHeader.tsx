'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils/cn'
import ThemeToggle from '@/components/common/ThemeToggle'

const NAV = [
  { label: 'Projetos', href: '/#projetos' },
  { label: 'Quem Somos', href: '/#quem-somos' },
  { label: 'Manifesto', href: '/#manifesto' },
  { label: 'Catálogo', href: '/catalogo' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contato', href: '', disabled: true },
]

export function BlogHeader() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="blog-header">
      <div className="blog-header-inner">
        {/* Logo */}
        <Link href="/" className="blog-header-logo-link">
          <div className="blog-header-logo-wrap">
            <Image
              src="/images/embras-logo-w.png"
              alt="Embras Iluminação"
              fill
              sizes="110px"
              className="object-contain"
            />
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="blog-header-nav">
          {NAV.map((item) =>
            item.disabled ? (
              <span key={item.label} className="blog-header-link blog-header-link--disabled">
                {item.label}
              </span>
            ) : (
              <Link key={item.label} href={item.href} className="blog-header-link">
                {item.label}
              </Link>
            )
          )}
          <ThemeToggle themed />
        </nav>

        {/* Hamburger — mobile only */}
        <button
          onClick={() => setIsOpen(true)}
          className="blog-header-burger"
          aria-label="Abrir menu"
        >
          <span />
          <span />
        </button>
      </div>

      {/* Mobile overlay */}
      <div className={cn('blog-header-mobile', isOpen && 'blog-header-mobile--open')}>
        <button
          onClick={() => setIsOpen(false)}
          className="blog-header-mobile-close"
          aria-label="Fechar menu"
        >
          Fechar
        </button>
        {NAV.map((item) =>
          item.disabled ? (
            <span
              key={item.label}
              className="blog-header-mobile-link blog-header-mobile-link--disabled"
            >
              {item.label}
            </span>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              className="blog-header-mobile-link"
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          )
        )}
        <ThemeToggle themed />
      </div>
    </header>
  )
}
