'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export type LineProduct = {
  id: string
  name: string
  slug: string
  cover_image: string | null
  has_3d_model: boolean
  model_3d_url: string | null
  model_3d_poster: string | null
  model_3d_alt: string | null
}

export function ProductLineCard({
  product,
  category,
}: {
  product: LineProduct
  category: string
}) {
  const has3d = product.has_3d_model && !!product.model_3d_url
  const [show3d, setShow3d] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const mvRef = useRef<HTMLElement>(null)
  const href = `/catalogo/${product.slug}`

  const toggle3d = () => {
    if (show3d) {
      setShow3d(false)
      setLoaded(false)
    } else {
      setShow3d(true)
    }
  }

  useEffect(() => {
    if (!show3d) return
    let cancelled = false
    import('@google/model-viewer').catch(() => {})
    const el = mvRef.current
    if (!el) return
    const onLoad = () => {
      if (!cancelled) setLoaded(true)
    }
    el.addEventListener('load', onLoad)
    return () => {
      cancelled = true
      el.removeEventListener('load', onLoad)
    }
  }, [show3d])

  return (
    <div className="flex flex-col">
      {/* Container da imagem / visualizador 3D — hover próprio */}
      <div className="aspect-3/4 bg-[#0f0f0f] border border-(--color-border) mb-8 relative overflow-hidden group/img">
        {show3d && has3d ? (
          <>
            {!loaded && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#0f0f0f] pointer-events-none">
                <span className="w-9 h-9 rounded-full border-2 border-white/15 border-t-(--color-highlight) animate-spin" />
                <span className="text-(--color-muted) text-[11px] uppercase tracking-[0.12em]">
                  Carregando modelo
                </span>
              </div>
            )}
            <model-viewer
              ref={mvRef}
              src={product.model_3d_url ?? undefined}
              poster={product.model_3d_poster ?? product.cover_image ?? undefined}
              alt={product.model_3d_alt ?? product.name}
              camera-controls
              exposure="1"
              shadow-intensity="1"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                backgroundColor: '#ffffff',
              }}
            />
          </>
        ) : product.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.cover_image}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover/img:scale-110 group-hover/img:opacity-100 transition-all duration-700"
          />
        ) : (
          <div className="absolute inset-0 bg-[#0f0f0f]" />
        )}
        <div className="absolute inset-0 bg-linear-to-tr from-transparent to-white/5 opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none" />
      </div>

      {/* Categoria e nome — sem link */}
      <span className="product-category mb-3 block text-(--color-highlight)">{category}</span>
      <h3 className="text-base font-(--font-heading) uppercase text-(--color-accent) tracking-widest leading-tight mb-6">
        {product.name}
      </h3>

      {/* Botões */}
      <div className="flex items-center gap-3">
        {has3d ? (
          <>
            <button
              type="button"
              onClick={toggle3d}
              className="flex items-center gap-3 px-6 py-3 border border-(--color-border) text-[11px] uppercase tracking-[2px] font-semibold text-(--color-accent) hover:bg-(--color-accent) hover:text-(--color-bg) transition-all cursor-pointer group/btn"
              style={{ borderRadius: 0 }}
            >
              {show3d ? 'Fechar 3D' : 'Ver em 3D'}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover/btn:rotate-12">
                <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
                <path d="M12 12l8-4.5" />
                <path d="M12 12v9" />
                <path d="M12 12L4 7.5" />
              </svg>
            </button>
            <Link
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ver produto"
              className="flex items-center justify-center px-4 py-3 border border-(--color-border) text-(--color-accent) hover:bg-(--color-accent) hover:text-(--color-bg) transition-all"
              style={{ borderRadius: 0 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
          </>
        ) : (
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-6 py-3 border border-(--color-border) text-[11px] uppercase tracking-[2px] font-semibold text-(--color-accent) hover:bg-(--color-accent) hover:text-(--color-bg) transition-all"
            style={{ borderRadius: 0 }}
          >
            Ver produto
          </Link>
        )}
      </div>
    </div>
  )
}
