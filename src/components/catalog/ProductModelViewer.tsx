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

// Minimal shape of the model-viewer APIs we touch at runtime.
type MvMaterial = {
  name: string
  pbrMetallicRoughness: {
    baseColorFactor: number[]
    baseColorTexture: { texture: unknown; setTexture: (t: unknown) => void }
    setBaseColorFactor: (v: number[]) => void
  }
}
type MvOrbit = { theta: number; phi: number; radius: number }
type MvElement = HTMLElement & {
  updateComplete: Promise<unknown>
  model?: { materials?: MvMaterial[] }
  createTexture: (url: string) => Promise<unknown>
  requestRender?: () => void
  getCameraOrbit: () => MvOrbit
  cameraOrbit: string
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

// Thin wrapper around the <model-viewer> web component. The (heavy) library is
// imported lazily on mount, so it never enters the bundle of routes that don't
// render a 3D model. When the product has material variations it also renders a
// selector that swaps the base color / texture of a material live.
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
  const [showHint, setShowHint] = useState(false)
  // Which variation is active per material (for the "Ativas: nome[i]" line).
  const [active, setActive] = useState<Record<string, string>>({})

  const mvRef = useRef<MvElement | null>(null)
  // Original texture + baseColorFactor per material, captured on load, so the
  // "Padrão" option restores the model's REAL default instead of clearing it.
  const originalsRef = useRef<Record<string, { texture: unknown; color: number[] }>>({})
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    let alive = true
    import('@google/model-viewer')
      .then(() => alive && setReady(true))
      .catch(() => alive && setReady(false))
    return () => {
      alive = false
    }
  }, [])

  // Silence three.js's benign "Couldn't load texture blob:" console.error — some
  // models embed a texture three logs about but that doesn't affect rendering.
  // Scoped to this component's lifetime and only that exact message.
  useEffect(() => {
    const original = console.error
    console.error = (...args: unknown[]) => {
      const first = args[0]
      if (typeof first === 'string' && first.includes("Couldn't load texture")) return
      original(...(args as []))
    }
    return () => {
      console.error = original
    }
  }, [])

  // Capture the model's original materials once loaded, so variations reset.
  useEffect(() => {
    const mv = mvRef.current
    if (!ready || !mv) return
    const capture = async () => {
      await mv.updateComplete
      const originals: Record<string, { texture: unknown; color: number[] }> = {}
      for (const m of mv.model?.materials ?? []) {
        originals[m.name] = {
          texture: m.pbrMetallicRoughness.baseColorTexture?.texture ?? null,
          color: [...m.pbrMetallicRoughness.baseColorFactor],
        }
      }
      originalsRef.current = originals
      setActive({})
    }
    if (mv.model) capture()
    mv.addEventListener('load', capture)
    return () => mv.removeEventListener('load', capture)
  }, [ready, src])

  // Zoom only with Ctrl/Cmd + scroll; a plain scroll passes through to the page.
  useEffect(() => {
    const mv = mvRef.current
    if (!ready || !mv) return
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) {
        // Let the page scroll; nudge the user toward Ctrl + scroll.
        setShowHint(true)
        if (hintTimer.current) clearTimeout(hintTimer.current)
        hintTimer.current = setTimeout(() => setShowHint(false), 1200)
        return
      }
      e.preventDefault()
      try {
        const orbit = mv.getCameraOrbit()
        const factor = 1 + (e.deltaY > 0 ? 0.1 : -0.1)
        mv.cameraOrbit = `${orbit.theta}rad ${orbit.phi}rad ${orbit.radius * factor}m`
      } catch {
        /* camera not ready yet */
      }
    }
    mv.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      mv.removeEventListener('wheel', onWheel)
      if (hintTimer.current) clearTimeout(hintTimer.current)
    }
  }, [ready])

  const onSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const opt = e.currentTarget.selectedOptions[0]
    const mv = mvRef.current
    if (!opt || !mv) return
    const kind = opt.dataset.kind

    // "Resetar" → remove todos os filtros e volta ao estado padrão do modelo.
    if (kind === 'reset') {
      for (const m of mv.model?.materials ?? []) {
        const o = originalsRef.current[m.name]
        if (o) {
          m.pbrMetallicRoughness.baseColorTexture.setTexture(o.texture)
          m.pbrMetallicRoughness.setBaseColorFactor(o.color)
        }
      }
      setActive({})
      mv.requestRender?.()
      return
    }

    const material = opt.dataset.material
    const name = opt.dataset.name ?? ''
    const mat = (mv.model?.materials ?? []).find((m) => m.name === material)
    if (!mat || !material) return

    if (kind === 'padrao') {
      const o = originalsRef.current[material]
      if (o) {
        mat.pbrMetallicRoughness.baseColorTexture.setTexture(o.texture)
        mat.pbrMetallicRoughness.setBaseColorFactor(o.color)
      }
      setActive((prev) => {
        const next = { ...prev }
        delete next[material]
        return next
      })
    } else if (kind === 'color') {
      const rgb = hexToLinearRGB(opt.dataset.color || '#ffffff')
      mat.pbrMetallicRoughness.setBaseColorFactor([...rgb, 1])
      mat.pbrMetallicRoughness.baseColorTexture.setTexture(null)
      setActive((prev) => ({ ...prev, [material]: name }))
    } else if (opt.dataset.url) {
      try {
        const texture = await mv.createTexture(opt.dataset.url)
        mat.pbrMetallicRoughness.baseColorTexture.setTexture(texture)
        // A textured variation shows at full color — clear any color tint.
        mat.pbrMetallicRoughness.setBaseColorFactor([1, 1, 1, 1])
        setActive((prev) => ({ ...prev, [material]: name }))
      } catch {
        /* ignore texture load failures */
      }
    }
    mv.requestRender?.()
  }

  // "Ativas: nome[índice]" — índice = posição do material no seletor (base 1).
  const activeLabel = groups
    .map((g, i) => (active[g.material] ? `${active[g.material]}[${i + 1}]` : null))
    .filter(Boolean)
    .join(', ')

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
        disable-zoom
        shadow-intensity="1"
        loading="eager"
        style={{ width: '100%', height: '100%', visibility: ready ? 'visible' : 'hidden' }}
      />

      {showHint && (
        <div className="product-3d-hint" aria-hidden="true">
          Use <kbd>Ctrl</kbd> + scroll para dar zoom
        </div>
      )}

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
            <option value="reset" data-kind="reset">
              Resetar
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
                    data-name={v.name}
                    data-color={v.color ?? ''}
                    data-url={v.texture_url ?? ''}
                  >
                    {v.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {activeLabel && <p className="product-3d-active">Ativas: {activeLabel}</p>}
        </div>
      )}
    </div>
  )
}
