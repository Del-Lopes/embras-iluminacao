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
  // Touch (celular/tablet) → zoom nativo por pinça; desktop → Ctrl + scroll.
  const [isTouch, setIsTouch] = useState(false)
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

  // Detecta dispositivo com toque (após montar, evita mismatch de hidratação).
  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
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

  // Dica interativa (desktop): aparece ao entrar com o mouse na janela e ao
  // rolar sobre ela, permanecendo 3s. Zoom só com Ctrl/Cmd + scroll; scroll
  // normal rola a página. No touch o zoom é por pinça (nativo do model-viewer).
  useEffect(() => {
    const mv = mvRef.current
    if (!ready || !mv || isTouch) return

    const flashHint = () => {
      setShowHint(true)
      if (hintTimer.current) clearTimeout(hintTimer.current)
      hintTimer.current = setTimeout(() => setShowHint(false), 2000)
    }

    const onEnter = () => flashHint()
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) {
        // Deixa a página rolar; reforça a dica.
        flashHint()
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

    mv.addEventListener('pointerenter', onEnter)
    mv.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      mv.removeEventListener('pointerenter', onEnter)
      mv.removeEventListener('wheel', onWheel)
      if (hintTimer.current) clearTimeout(hintTimer.current)
    }
  }, [ready, isTouch])

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
        disable-zoom={isTouch ? undefined : ''}
        shadow-intensity="1"
        loading="eager"
        style={{ width: '100%', height: '100%', visibility: ready ? 'visible' : 'hidden' }}
      />

      {showHint && (
        <div className="product-3d-hint" aria-hidden="true">
          {/* Coluna esquerda — comandos com Ctrl */}
          <div className="product-3d-hint-col">
            <span className="product-3d-hint-line">
              <kbd>Ctrl</kbd> +
              <svg className="mv-icon mv-icon-scroll" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="7.5" y="2.5" width="9" height="19" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <line className="mv-scroll-wheel" x1="12" y1="6" x2="12" y2="9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              para dar zoom
            </span>
            <span className="product-3d-hint-line">
              <kbd>Ctrl</kbd> +
              <svg className="mv-icon mv-icon-move" viewBox="0 0 24 24" aria-hidden="true">
                <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="3.5" x2="12" y2="20.5" />
                  <line x1="3.5" y1="12" x2="20.5" y2="12" />
                  <polyline points="9,6.5 12,3.5 15,6.5" />
                  <polyline points="9,17.5 12,20.5 15,17.5" />
                  <polyline points="6.5,9 3.5,12 6.5,15" />
                  <polyline points="17.5,9 20.5,12 17.5,15" />
                </g>
              </svg>
              para mover
            </span>
          </div>
          {/* Coluna direita — comandos com mouse */}
          <div className="product-3d-hint-col">
            <span className="product-3d-hint-line">
              <svg className="mv-icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="6.5" y="3" width="11" height="18" rx="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <rect x="7.8" y="4.2" width="3.6" height="4.6" rx="1.4" fill="currentColor" />
              </svg>
              +
              <svg className="mv-icon mv-icon-move" viewBox="0 0 24 24" aria-hidden="true">
                <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="3.5" x2="12" y2="20.5" />
                  <line x1="3.5" y1="12" x2="20.5" y2="12" />
                  <polyline points="9,6.5 12,3.5 15,6.5" />
                  <polyline points="9,17.5 12,20.5 15,17.5" />
                  <polyline points="6.5,9 3.5,12 6.5,15" />
                  <polyline points="17.5,9 20.5,12 17.5,15" />
                </g>
              </svg>
              para rotacionar
            </span>
            <span className="product-3d-hint-line">
              <svg className="mv-icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="6.5" y="3" width="11" height="18" rx="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <rect x="12.6" y="4.2" width="3.6" height="4.6" rx="1.4" fill="currentColor" />
              </svg>
              para centralizar
            </span>
          </div>
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
