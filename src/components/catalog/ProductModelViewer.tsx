'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  Model3dArScale,
  Model3dMaterialLabels,
  Model3dObjectType,
  Model3dVariation,
} from '@/lib/db/schema'

type Props = {
  src: string
  poster?: string | null
  alt?: string | null
  variations?: Model3dVariation[] | null
  materialLabels?: Model3dMaterialLabels | null
  objectType?: Model3dObjectType | null
  arScale?: Model3dArScale | null
}

// Minimal shape of the model-viewer material API we touch at runtime.
type MvMaterial = {
  name: string
  pbrMetallicRoughness: {
    baseColorFactor: number[]
    baseColorTexture: { texture: unknown; setTexture: (t: unknown) => void }
    setBaseColorFactor: (v: number[]) => void
  }
}
type MvElement = HTMLElement & {
  updateComplete: Promise<unknown>
  model?: { materials?: MvMaterial[] }
  createTexture: (url: string) => Promise<unknown>
  requestRender?: () => void
}

// #RRGGBB → linear RGB (model-viewer expects a linear baseColorFactor).
function hexToLinearRGB(hex: string): [number, number, number] {
  const int = parseInt(hex.replace('#', ''), 16)
  const toLinear = (v: number) =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  return [
    toLinear(((int >> 16) & 255) / 255),
    toLinear(((int >> 8) & 255) / 255),
    toLinear((int & 255) / 255),
  ]
}

// Thin wrapper around the <model-viewer> web component. The (heavy) library
// is imported lazily on mount, so it never enters the bundle of routes that
// don't render a 3D model (e.g. the /catalogo listing). When the product has
// material variations, it also renders a selector that swaps the base color /
// texture of a material live (createTexture/setBaseColorFactor).
export function ProductModelViewer({
  src,
  poster,
  alt,
  variations,
  materialLabels,
  objectType,
  arScale,
}: Props) {
  const [ready, setReady] = useState(false)
  const mvRef = useRef<MvElement | null>(null)
  // Original texture + color per material, captured on load, for "Padrão".
  const originalsRef = useRef<Record<string, { texture: unknown; color: number[] }>>({})

  // Group variations by material (only materials that actually have options).
  const groups = useMemo(() => {
    const byMat = new Map<string, { label: string; items: Model3dVariation[] }>()
    for (const v of variations ?? []) {
      const valid = v.type === 'color' ? !!v.color : !!v.texture_url
      if (!valid) continue
      if (!byMat.has(v.material)) {
        byMat.set(v.material, { label: materialLabels?.[v.material] || v.material, items: [] })
      }
      byMat.get(v.material)!.items.push(v)
    }
    return [...byMat.entries()].map(([material, g]) => ({ material, ...g }))
  }, [variations, materialLabels])

  useEffect(() => {
    let active = true
    import('@google/model-viewer')
      .then(() => active && setReady(true))
      .catch(() => active && setReady(false))
    return () => {
      active = false
    }
  }, [])

  // Capture originals once the model has loaded, so variations can be reset.
  useEffect(() => {
    const mv = mvRef.current
    if (!ready || !mv || groups.length === 0) return
    const onLoad = async () => {
      await mv.updateComplete
      const originals: Record<string, { texture: unknown; color: number[] }> = {}
      for (const m of mv.model?.materials ?? []) {
        originals[m.name] = {
          texture: m.pbrMetallicRoughness.baseColorTexture?.texture ?? null,
          color: m.pbrMetallicRoughness.baseColorFactor,
        }
      }
      originalsRef.current = originals
    }
    mv.addEventListener('load', onLoad)
    return () => mv.removeEventListener('load', onLoad)
  }, [ready, groups])

  const onSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const opt = e.currentTarget.selectedOptions[0]
    const mv = mvRef.current
    if (!opt || !mv) return
    const material = opt.dataset.material
    const kind = opt.dataset.kind
    const mat = (mv.model?.materials ?? []).find((m) => m.name === material)
    if (!mat) return

    if (kind === 'padrao') {
      const o = material ? originalsRef.current[material] : undefined
      if (o) {
        mat.pbrMetallicRoughness.baseColorTexture.setTexture(o.texture)
        mat.pbrMetallicRoughness.setBaseColorFactor(o.color)
      }
    } else if (kind === 'color') {
      const rgb = hexToLinearRGB(opt.dataset.color || '#ffffff')
      mat.pbrMetallicRoughness.setBaseColorFactor([...rgb, 1])
      mat.pbrMetallicRoughness.baseColorTexture.setTexture(null)
    } else if (opt.dataset.url) {
      try {
        const texture = await mv.createTexture(opt.dataset.url)
        mat.pbrMetallicRoughness.baseColorTexture.setTexture(texture)
      } catch {
        /* ignore texture load failures */
      }
    }
    mv.requestRender?.()
  }

  return (
    <div className="product-3d-viewer">
      {!ready && (
        <div className="product-3d-loading" aria-hidden="true">
          Carregando visualização 3D…
        </div>
      )}
      <model-viewer
        ref={mvRef as unknown as React.Ref<HTMLElement>}
        src={src}
        poster={poster || undefined}
        alt={alt || 'Modelo 3D do produto'}
        camera-controls
        auto-rotate
        ar
        ar-modes="webxr scene-viewer quick-look"
        ar-placement={objectType || 'floor'}
        ar-scale={arScale || 'fixed'}
        shadow-intensity="1"
        loading="eager"
        style={{ width: '100%', height: '100%', visibility: ready ? 'visible' : 'hidden' }}
      />

      {groups.length > 0 && (
        <div className="product-3d-variations">
          <label htmlFor="product-3d-selector" className="product-3d-variations-label">
            Variações
          </label>
          <select
            id="product-3d-selector"
            className="product-3d-variations-select"
            defaultValue=""
            onChange={onSelect}
          >
            <option value="" disabled>
              Selecione…
            </option>
            {groups.map((g) => (
              <optgroup key={g.material} label={g.label}>
                <option value={`padrao::${g.material}`} data-material={g.material} data-kind="padrao">
                  Padrão
                </option>
                {g.items.map((v, idx) => (
                  <option
                    key={idx}
                    value={`${g.material}::${idx}`}
                    data-material={g.material}
                    data-kind={v.type}
                    data-color={v.color ?? ''}
                    data-url={v.texture_url ?? ''}
                  >
                    {v.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
