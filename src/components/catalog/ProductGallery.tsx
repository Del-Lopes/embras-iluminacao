'use client'

import { useState } from 'react'
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

// Cover photo + vertical thumbnail carousel. The cover is the first thumb;
// product_images follow. Selecting a thumb swaps the main view.
export function ProductGallery({ coverImage, images, name, has3d = false }: Props) {
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
        <div className="product-gallery-thumbs" role="listbox" aria-label="Imagens do produto">
          {thumbs.map((t, i) => (
            <button
              key={t.url}
              type="button"
              className={cn('product-gallery-thumb', active === i && 'product-gallery-thumb--active')}
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              aria-selected={active === i}
              role="option"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.url} alt={t.alt} />
            </button>
          ))}
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
