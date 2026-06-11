'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'

type GalleryImage = { url: string; alt: string }

type Props = {
  coverImage: string | null
  images: GalleryImage[]
  name: string
}

// Cover photo + vertical thumbnail carousel. The cover is the first thumb;
// product_images follow. Selecting a thumb swaps the main view.
export function ProductGallery({ coverImage, images, name }: Props) {
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
      </div>
    </div>
  )
}
