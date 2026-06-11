'use client'

import { useEffect, useState } from 'react'

type Props = {
  src: string
  poster?: string | null
  alt?: string | null
}

// Thin wrapper around the <model-viewer> web component. The (heavy) library
// is imported lazily on mount, so it never enters the bundle of routes that
// don't render a 3D model (e.g. the /catalogo listing).
export function ProductModelViewer({ src, poster, alt }: Props) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    import('@google/model-viewer')
      .then(() => active && setReady(true))
      .catch(() => active && setReady(false))
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="product-3d-viewer">
      {!ready && (
        <div className="product-3d-loading" aria-hidden="true">
          Carregando visualização 3D…
        </div>
      )}
      <model-viewer
        src={src}
        poster={poster || undefined}
        alt={alt || 'Modelo 3D do produto'}
        camera-controls
        auto-rotate
        ar
        shadow-intensity="1"
        loading="eager"
        style={{ width: '100%', height: '100%', visibility: ready ? 'visible' : 'hidden' }}
      />
    </div>
  )
}
