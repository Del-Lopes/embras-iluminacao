'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import LineCard from './LineCard'

export type CarouselProduct = {
  id: string
  name: string
  slug: string
  cover_image: string | null
  has_3d_model: boolean
  model_3d_url: string | null
  model_3d_poster: string | null
  model_3d_alt: string | null
}

export type CarouselLine = {
  id: string
  label: string
  products: CarouselProduct[]
}

export default function LineCarousel({ lines }: { lines: CarouselLine[] }) {
  const [activeTab, setActiveTab] = useState(lines[0]?.id ?? '')
  const currentPage = 0
  const current = lines.find((l) => l.id === activeTab) || lines[0]

  if (!lines.length) return null

  const products = current?.products ?? []

  return (
    <div className="flex flex-col items-center w-full">
      {/* Tabs — Aço / Alumínio */}
      <div className="flex flex-wrap justify-center gap-4 mb-24">
        {lines.map((line) => (
          <button
            key={line.id}
            onClick={() => setActiveTab(line.id)}
            data-active={activeTab === line.id ? 'true' : undefined}
            className="lp-tab"
          >
            <span className="lp-tab-label">{line.label}</span>
            {/* Seta inline — surge no hover */}
            <svg
              className="lp-tab-arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
            {/* Seta do canto dourado — no estado ativo */}
            <svg
              className="lp-tab-corner-arrow"
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

      {/* Grid + arrows */}
      <div className="w-full relative group">
        {products.length === 0 ? (
          <p className="text-center text-(--color-muted) text-sm py-16">
            Nenhum produto cadastrado nesta linha.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 w-full">
            {products.map((product) => (
              <LineCard key={product.id} product={product} category={current?.label ?? ''} />
            ))}
          </div>
        )}

        {products.length > 0 && (
          <div className="hidden md:flex justify-between absolute top-1/2 -translate-y-1/2 -left-16 -right-16 pointer-events-none">
            <button className="p-4 text-(--color-accent)/40 hover:text-(--color-accent) transition-colors pointer-events-auto cursor-pointer" aria-label="Anterior">
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button className="p-4 text-(--color-accent)/40 hover:text-(--color-accent) transition-colors pointer-events-auto cursor-pointer" aria-label="Próximo">
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Pagination dots */}
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
    </div>
  )
}
