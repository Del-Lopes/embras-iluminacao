'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import { AnimatedHeading, AnimatedPill } from '@/components/common/AnimatedTypography'
import { ProductLineCard, type LineProduct } from './ProductLineCard'

export type ProductLine = {
  id: string
  label: string
  products: LineProduct[]
}

export default function ProductLines({
  lines,
  defaultActive,
}: {
  lines: ProductLine[]
  defaultActive?: string
}) {
  const initial =
    (defaultActive && lines.some((l) => l.id === defaultActive) ? defaultActive : undefined) ??
    lines[0]?.id ??
    ''
  const [activeTab, setActiveTab] = useState(initial)
  const currentPage = 0
  const current = lines.find((l) => l.id === activeTab) || lines[0]
  const products = current?.products ?? []

  return (
    <section id="produtos" className="py-36 px-8 bg-(--color-bg) w-full relative">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        <div className="flex flex-col items-center gap-4 mb-20 text-center">
          <AnimatedPill className="text-(--color-muted) uppercase w-fit items-center">
            Linha de Produtos
          </AnimatedPill>
          <AnimatedHeading className="text-5xl md:text-7xl font-(--font-heading) uppercase leading-tight md:leading-[82px] tracking-tighter text-(--color-primary)">
            O design <br className="md:hidden" />{' '}
            <span className="text-(--color-highlight)">vira arte</span>
          </AnimatedHeading>
        </div>

        {/* Abas — Área Interna / Externa */}
        <div className="flex flex-wrap justify-center gap-4 mb-24">
          {lines.map((line) => (
            <button
              key={line.id}
              onClick={() => setActiveTab(line.id)}
              data-active={activeTab === line.id ? 'true' : undefined}
              className="pl-tab"
            >
              <span className="pl-tab-label">{line.label}</span>
              <svg
                className="pl-tab-arrow"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
              <svg
                className="pl-tab-corner-arrow"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </button>
          ))}
        </div>

        {/* Grid + setas */}
        <div className="w-full relative group">
          {products.length === 0 ? (
            <p className="text-center text-(--color-muted) text-sm py-16">
              Nenhum produto publicado nesta área.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 w-full">
              {products.map((product) => (
                <ProductLineCard
                  key={product.id}
                  product={product}
                  category={current?.label ?? ''}
                />
              ))}
            </div>
          )}

          {products.length > 0 && (
            <div className="hidden md:flex justify-between absolute top-1/2 -translate-y-1/2 -left-16 -right-16 pointer-events-none">
              <button
                className="p-4 text-(--color-accent)/40 hover:text-(--color-accent) transition-colors pointer-events-auto cursor-pointer"
                aria-label="Anterior"
              >
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                className="p-4 text-(--color-accent)/40 hover:text-(--color-accent) transition-colors pointer-events-auto cursor-pointer"
                aria-label="Próximo"
              >
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Dots */}
        {products.length > 0 && (
          <div className="flex gap-4 mt-20">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className={cn(
                  'h-[2px] w-8 transition-colors duration-500',
                  idx === currentPage ? 'bg-(--color-accent)' : 'bg-(--color-muted)'
                )}
              />
            ))}
          </div>
        )}

        <div className="mt-20">
          <Link
            href="/catalogo"
            className="inline-block px-12 py-5 border border-(--color-accent) text-[11px] uppercase tracking-[2px] font-semibold text-(--color-accent) hover:bg-(--color-accent) hover:text-(--color-bg) transition-all duration-700 cursor-pointer"
            style={{ borderRadius: 0 }}
          >
            Ver linha completa
          </Link>
        </div>
      </div>
    </section>
  )
}
