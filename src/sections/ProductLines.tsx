'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ScrollTrigger } from '@/lib/gsap'
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
  const [currentPage, setCurrentPage] = useState(0)
  const [perPage, setPerPage] = useState(4)
  const current = lines.find((l) => l.id === activeTab) || lines[0]
  const products = current?.products ?? []

  // Itens por página acompanham as colunas do grid: 1 (mobile) / 2 (sm) / 4 (lg+).
  useEffect(() => {
    const calc = () =>
      setPerPage(
        window.innerWidth >= 1024 ? 4 : window.innerWidth >= 640 ? 2 : 1
      )
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  const totalPages = Math.max(1, Math.ceil(products.length / perPage))
  // Volta para a primeira página ao trocar de aba…
  useEffect(() => {
    setCurrentPage(0)
  }, [activeTab])
  // …e mantém a página dentro dos limites quando o breakpoint (perPage) muda.
  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages - 1))
  }, [totalPages])

  const pageProducts = products.slice(
    currentPage * perPage,
    currentPage * perPage + perPage
  )
  const goPrev = () => setCurrentPage((p) => (p - 1 + totalPages) % totalPages)
  const goNext = () => setCurrentPage((p) => (p + 1) % totalPages)

  // Trocar de aba muda a ALTURA desta seção (interno sem produtos encolhe muito).
  // O ScrollTrigger cacheia as posições de start/end no refresh e NÃO recalcula
  // sozinho numa mudança de layout que não seja resize de janela — então o pin do
  // Manifesto (e qualquer trigger abaixo) fica defasado e pina na posição errada.
  // Um refresh após o novo layout pintar realinha todos. Pula a montagem: lá o
  // ScrollTrigger já se posiciona sozinho no load.
  const primeiraRenderizacao = useRef(true)
  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false
      return
    }
    const id = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(id)
  }, [activeTab])

  return (
    <section id="produtos" className="py-20 md:py-36 bg-(--color-bg) w-full relative">
      <div className="max-w-7xl mx-auto w-full px-6 md:px-8 lg:px-12 flex flex-col items-center">
        <div className="flex flex-col items-center gap-4 mb-12 md:mb-20 text-center">
          <AnimatedPill className="text-(--color-muted) uppercase w-fit items-center">
            Linha de Produtos
          </AnimatedPill>
          <AnimatedHeading className="text-5xl md:text-7xl font-(--font-heading) uppercase leading-tight md:leading-[82px] tracking-tighter text-(--color-primary)">
            O design <br className="md:hidden" />{' '}
            <span className="text-(--color-highlight)">vira arte</span>
          </AnimatedHeading>
        </div>

        {/* Abas — Área Interna / Externa */}
        <div className="flex flex-wrap justify-center gap-4 mb-12 md:mb-24">
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
            <div
              key={currentPage}
              className="pl-page grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 w-full"
            >
              {pageProducts.map((product) => (
                <ProductLineCard
                  key={product.id}
                  product={product}
                  category={current?.label ?? ''}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-between absolute top-1/2 -translate-y-1/2 -left-8 -right-8 lg:-left-2 lg:-right-2 xl:-left-16 xl:-right-16 pointer-events-none">
              <button
                onClick={goPrev}
                className="p-4 text-(--color-accent)/40 hover:text-(--color-accent) transition-colors pointer-events-auto cursor-pointer"
                aria-label="Anterior"
              >
                <svg width="44" height="44" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                onClick={goNext}
                className="p-4 text-(--color-accent)/40 hover:text-(--color-accent) transition-colors pointer-events-auto cursor-pointer"
                aria-label="Próximo"
              >
                <svg width="44" height="44" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Dots — um por página, clicáveis */}
        {totalPages > 1 && (
          <div className="flex gap-4 mt-20">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPage(idx)}
                aria-label={`Página ${idx + 1}`}
                aria-current={idx === currentPage}
                className={cn(
                  'h-[2px] w-8 transition-colors duration-500 cursor-pointer',
                  idx === currentPage
                    ? 'bg-(--color-accent)'
                    : 'bg-(--color-muted) hover:bg-(--color-accent)/60'
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
