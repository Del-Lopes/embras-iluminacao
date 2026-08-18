'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils/cn'

type GalleryImage = { url: string; alt: string }

type Props = {
  coverImage: string | null
  images: GalleryImage[]
  name: string
  // Quando true, exibe o botão "Ver em 3D" no canto inferior direito da imagem.
  has3d?: boolean
}

// Ícone de VR (headset) — inline para não depender de biblioteca de ícones.
function VrIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7h18a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-5.2a2 2 0 0 1-1.7-1l-.8-1.3a1.5 1.5 0 0 0-2.6 0L9.9 15a2 2 0 0 1-1.7 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
    </svg>
  )
}

// Chevron apontando para baixo. Quem gira é o CSS, conforme o botão seja o
// anterior ou o próximo e conforme o carrossel esteja na vertical (desktop) ou
// na horizontal (celular).
function ChevronIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

// Cover photo + vertical thumbnail carousel. The cover is the first thumb;
// product_images follow. Selecting a thumb swaps the main view.
export function ProductGallery({ coverImage, images, name, has3d = false }: Props) {
  // Carrossel vertical das miniaturas: a trilha rola, e as setas andam de uma
  // miniatura por clique. O passo é medido no DOM (altura do primeiro item +
  // gap) em vez de fixado em código, para não descolar do CSS.
  const trackRef = useRef<HTMLDivElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  // O eixo é lido do próprio elemento em vez de um breakpoint em JS: no
  // desktop a trilha é uma coluna e transborda na vertical; no celular vira
  // linha e transborda na horizontal. Assim a lógica segue o CSS sem duplicar
  // a media query aqui.
  const readAxis = (el: HTMLDivElement): 'x' | 'y' =>
    el.scrollWidth - el.clientWidth > 1 ? 'x' : 'y'

  const updateEdges = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const axis = readAxis(el)
    // 1px de tolerância: medidas fracionárias impedem que a rolagem chegue
    // exatamente ao limite.
    const max = axis === 'x' ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight
    const pos = axis === 'x' ? el.scrollLeft : el.scrollTop
    setOverflowing(max > 1)
    setAtStart(pos <= 1)
    setAtEnd(pos >= max - 1)
  }, [])

  useEffect(() => {
    updateEdges()
    const el = trackRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(updateEdges)
    ro.observe(el)
    return () => ro.disconnect()
  }, [updateEdges, images.length, coverImage])

  const scrollByStep = (direction: 1 | -1) => {
    const el = trackRef.current
    if (!el) return
    const axis = readAxis(el)
    const first = el.firstElementChild as HTMLElement | null
    const style = getComputedStyle(el)
    const gap = parseFloat((axis === 'x' ? style.columnGap : style.rowGap) || '0') || 0
    const size = first
      ? axis === 'x'
        ? first.offsetWidth
        : first.offsetHeight
      : axis === 'x'
        ? el.clientWidth
        : el.clientHeight
    const step = (first ? size + gap : size) * direction
    el.scrollBy(axis === 'x' ? { left: step, behavior: 'smooth' } : { top: step, behavior: 'smooth' })
  }

  const goTo3d = () => {
    const el = document.getElementById('produto-3d-viewer')
    if (!el) return
    // A página usa Lenis (smooth scroll) — scrollIntoView nativo não é suave.
    const lenis = (
      window as unknown as {
        __lenis?: { scrollTo: (t: HTMLElement, o?: { offset?: number; duration?: number }) => void }
      }
    ).__lenis
    if (lenis) lenis.scrollTo(el, { offset: -90, duration: 1.2 })
    else el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const btn3d = has3d ? (
    <button type="button" className="gallery-3d-btn" onClick={goTo3d}>
      <VrIcon />
      Ver em 3D
    </button>
  ) : null

  const thumbs: GalleryImage[] = []
  const seen = new Set<string>()
  if (coverImage) {
    thumbs.push({ url: coverImage, alt: name })
    seen.add(coverImage)
  }
  for (const img of images) {
    if (!seen.has(img.url)) {
      thumbs.push({ url: img.url, alt: img.alt || name })
      seen.add(img.url)
    }
  }

  const [active, setActive] = useState(0)

  if (thumbs.length === 0) {
    return (
      <div className="product-gallery">
        <div className="product-gallery-main">
          <div className="catalog-card-img-placeholder product-gallery-placeholder" />
          {btn3d}
        </div>
      </div>
    )
  }

  const main = thumbs[active] ?? thumbs[0]

  return (
    <div className={cn('product-gallery', thumbs.length > 1 && 'product-gallery--has-thumbs')}>
      {thumbs.length > 1 && (
        <div className="product-gallery-rail">
          {/* As setas só aparecem quando a trilha não cabe inteira: com poucas
              imagens elas seriam dois botões inertes ocupando espaço. */}
          {overflowing && (
            <button
              type="button"
              className="product-gallery-nav product-gallery-nav--prev"
              onClick={() => scrollByStep(-1)}
              disabled={atStart}
              aria-label="Imagens anteriores"
            >
              <ChevronIcon />
            </button>
          )}

          <div
            ref={trackRef}
            className="product-gallery-thumbs"
            role="listbox"
            aria-label="Imagens do produto"
            onScroll={updateEdges}
          >
            {thumbs.map((t, i) => (
              <button
                key={t.url}
                type="button"
                className={cn('product-gallery-thumb', active === i && 'product-gallery-thumb--active')}
                onClick={() => setActive(i)}
                aria-selected={active === i}
                role="option"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.url} alt={t.alt} />
              </button>
            ))}
          </div>

          {overflowing && (
            <button
              type="button"
              className="product-gallery-nav product-gallery-nav--next"
              onClick={() => scrollByStep(1)}
              disabled={atEnd}
              aria-label="Próximas imagens"
            >
              <ChevronIcon />
            </button>
          )}
        </div>
      )}

      <div className="product-gallery-main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={main.url} alt={main.alt} className="product-gallery-main-img" />
        {btn3d}
      </div>
    </div>
  )
}