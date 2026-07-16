'use client'

import { useRef, useEffect, useState, useMemo, createElement, memo } from 'react'

export enum Tag {
  H1 = 'h1',
  H2 = 'h2',
  H3 = 'h3',
  P = 'p',
}

type VaporizeTextCycleProps = {
  texts: string[]
  /** Quando true, roda a sequência automática (uma palavra após a outra). Quando false, fica vazio. */
  play?: boolean
  font?: {
    fontFamily?: string
    fontSize?: string
    fontWeight?: number
  }
  color?: string
  spread?: number
  density?: number
  animation?: {
    vaporizeDuration?: number
    fadeInDuration?: number
    holdDuration?: number
  }
  direction?: 'left-to-right' | 'right-to-left'
  alignment?: 'left' | 'center' | 'right'
  tag?: Tag
  /** true = ciclo infinito; false = para na última palavra. */
  loop?: boolean
}

type Particle = {
  x: number
  y: number
  originalX: number
  originalY: number
  color: string
  opacity: number
  originalAlpha: number
  velocityX: number
  velocityY: number
  angle: number
  speed: number
  shouldFadeQuickly?: boolean
}

type TextBoundaries = { left: number; right: number; width: number }

declare global {
  interface HTMLCanvasElement {
    textBoundaries?: TextBoundaries
  }
}

type Phase = 'empty' | 'materializing' | 'solid' | 'dissolving'

export default function VaporizeTextCycle({
  texts = ['Next.js', 'React'],
  play = false,
  font = { fontFamily: 'sans-serif', fontSize: '120px', fontWeight: 600 },
  color = 'rgb(255, 255, 255)',
  spread = 5,
  density = 5,
  animation = { vaporizeDuration: 0.6, fadeInDuration: 0.35, holdDuration: 0.7 },
  direction = 'left-to-right',
  alignment = 'center',
  tag = Tag.P,
  loop = true,
}: VaporizeTextCycleProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  const globalDpr = useMemo(() => {
    if (typeof window !== 'undefined') return Math.min(1.5, window.devicePixelRatio || 1)
    return 1
  }, [])
  const transformedDensity = transformValue(density, [0, 10], [0.3, 1], true)

  const particlesRef = useRef<Particle[]>([])
  const phaseRef = useRef<Phase>('empty')
  const indexRef = useRef(0)
  const playRef = useRef(play)
  const builtRef = useRef(false)
  const vaporizeProgressRef = useRef(0)
  const fadeOpacityRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const holdTimerRef = useRef<number | null>(null)
  const lastTimeRef = useRef(0)
  const sizeRef = useRef({ w: 0, h: 0 })

  const cfgRef = useRef({ texts, font, color, spread, direction, alignment, animation, globalDpr, transformedDensity, loop })
  cfgRef.current = { texts, font, color, spread, direction, alignment, animation, globalDpr, transformedDensity, loop }

  const buildParticles = (index: number) => {
    const canvas = canvasRef.current
    const { w, h } = sizeRef.current
    if (!canvas || !w || !h) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { font, color, alignment, globalDpr, texts } = cfgRef.current
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    canvas.width = Math.floor(w * globalDpr)
    canvas.height = Math.floor(h * globalDpr)

    const weight = font.fontWeight ?? 600
    const family = font.fontFamily
    const nominalSize = parseInt(font.fontSize?.replace('px', '') || '120')
    let fs = nominalSize
    ctx.font = `${weight} ${fs * globalDpr}px ${family}`
    const text = texts[index] ?? ''
    const measured = ctx.measureText(text).width
    const maxW = canvas.width * 0.92
    if (measured > maxW && measured > 0) fs = fs * (maxW / measured)
    const fontStr = `${weight} ${fs * globalDpr}px ${family}`

    const colorStr = parseColor(color || 'rgb(255,255,255)')
    const textY = canvas.height / 2
    const textX = alignment === 'center' ? canvas.width / 2 : alignment === 'left' ? 0 : canvas.width

    const { particles, textBoundaries } = createParticles(ctx, canvas, text, textX, textY, fontStr, colorStr, alignment)
    particlesRef.current = particles
    canvas.textBoundaries = textBoundaries
    builtRef.current = true
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const drawSolid = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    renderParticles(ctx, particlesRef.current, cfgRef.current.globalDpr)
  }

  const stopRaf = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }
  const startRaf = () => {
    if (rafRef.current !== null) return
    lastTimeRef.current = performance.now()
    rafRef.current = requestAnimationFrame(frame)
  }
  const clearHold = () => {
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }

  // Agenda a dissolução após o "hold" (palavra parada, canvas idle)
  const scheduleHold = () => {
    clearHold()
    const hold = (cfgRef.current.animation.holdDuration ?? 0.7) * 1000
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null
      if (!playRef.current) return
      const { texts, loop } = cfgRef.current
      const isLast = indexRef.current >= texts.length - 1
      if (isLast && !loop) return // para na última palavra
      resetParticles(particlesRef.current)
      vaporizeProgressRef.current = 0
      phaseRef.current = 'dissolving'
      startRaf()
    }, hold)
  }

  const startCycle = () => {
    if (!builtRef.current) return
    clearHold()
    stopRaf()
    indexRef.current = 0
    buildParticles(0)
    fadeOpacityRef.current = 0
    phaseRef.current = 'materializing'
    startRaf()
  }

  const stopCycle = () => {
    clearHold()
    stopRaf()
    phaseRef.current = 'empty'
    clearCanvas()
  }

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000)
    lastTimeRef.current = now

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !particlesRef.current.length) {
      rafRef.current = requestAnimationFrame(frame)
      return
    }

    const { direction, animation, globalDpr, transformedDensity, font, spread } = cfgRef.current
    const VAPORIZE_DURATION = (animation.vaporizeDuration ?? 0.6) * 1000
    const FADE_IN_DURATION = (animation.fadeInDuration ?? 0.35) * 1000
    const fontSize = parseInt(font.fontSize?.replace('px', '') || '120')
    const MULT_SPREAD = calculateVaporizeSpread(fontSize) * spread

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (phaseRef.current === 'materializing') {
      fadeOpacityRef.current += (dt * 1000) / FADE_IN_DURATION
      ctx.save()
      ctx.scale(globalDpr, globalDpr)
      particlesRef.current.forEach((p) => {
        p.x = p.originalX
        p.y = p.originalY
        const opacity = Math.min(fadeOpacityRef.current, 1) * p.originalAlpha
        ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${opacity})`)
        ctx.fillRect(p.x / globalDpr, p.y / globalDpr, 1, 1)
      })
      ctx.restore()

      if (fadeOpacityRef.current >= 1) {
        resetParticles(particlesRef.current)
        phaseRef.current = 'solid'
        drawSolid()
        rafRef.current = null // idle durante o hold
        if (playRef.current) scheduleHold()
        return
      }
      rafRef.current = requestAnimationFrame(frame)
      return
    }

    if (phaseRef.current === 'dissolving') {
      vaporizeProgressRef.current += (dt * 100) / (VAPORIZE_DURATION / 1000)
      const tb = canvas.textBoundaries
      if (tb) {
        const progress = Math.min(100, vaporizeProgressRef.current)
        const vaporizeX =
          direction === 'left-to-right'
            ? tb.left + (tb.width * progress) / 100
            : tb.right - (tb.width * progress) / 100
        const allGone = updateParticles(
          particlesRef.current,
          vaporizeX,
          dt,
          MULT_SPREAD,
          VAPORIZE_DURATION,
          direction,
          transformedDensity
        )
        renderParticles(ctx, particlesRef.current, globalDpr)

        if (vaporizeProgressRef.current >= 100 && allGone) {
          if (!playRef.current) {
            phaseRef.current = 'empty'
            clearCanvas()
            rafRef.current = null
            return
          }
          // Próxima palavra → materializa
          const { texts } = cfgRef.current
          indexRef.current = (indexRef.current + 1) % texts.length
          buildParticles(indexRef.current)
          fadeOpacityRef.current = 0
          phaseRef.current = 'materializing'
        }
      }
      rafRef.current = requestAnimationFrame(frame)
      return
    }

    // solid / empty — sem loop
    if (phaseRef.current === 'solid') drawSolid()
    rafRef.current = null
  }

  // Medição do wrapper
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const apply = (w: number, h: number) => {
      sizeRef.current = { w, h }
      setSize({ w, h })
    }
    const rect = el.getBoundingClientRect()
    apply(rect.width, rect.height)
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) apply(e.contentRect.width, e.contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Constrói ao ter tamanho válido; se já estiver tocando, (re)inicia o ciclo
  useEffect(() => {
    if (!size.w || !size.h) return
    buildParticles(indexRef.current)
    if (playRef.current) startCycle()
    else clearCanvas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size])

  // Liga/desliga o ciclo
  useEffect(() => {
    playRef.current = play
    if (play) {
      if (builtRef.current && phaseRef.current === 'empty') startCycle()
    } else {
      stopCycle()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play])

  useEffect(() => () => {
    stopRaf()
    clearHold()
  }, [])

  return (
    <div ref={wrapperRef} style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
      <canvas ref={canvasRef} style={{ pointerEvents: 'none' }} />
      <SeoElement tag={tag} texts={texts} />
    </div>
  )
}

// ------------------------------------------------------------ //
const SeoElement = memo(({ tag = Tag.P, texts }: { tag: Tag; texts: string[] }) => {
  const style = {
    position: 'absolute' as const,
    width: '0',
    height: '0',
    overflow: 'hidden',
    userSelect: 'none' as const,
    pointerEvents: 'none' as const,
  }
  const safeTag = Object.values(Tag).includes(tag) ? tag : 'p'
  return createElement(safeTag, { style }, texts?.join(' ') ?? '')
})
SeoElement.displayName = 'SeoElement'

// ------------------------------------------------------------ //
// PARTICLE SYSTEM
// ------------------------------------------------------------ //
const createParticles = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  text: string,
  textX: number,
  textY: number,
  font: string,
  color: string,
  alignment: 'left' | 'center' | 'right'
) => {
  const particles: Particle[] = []

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = color
  ctx.font = font
  ctx.textAlign = alignment
  ctx.textBaseline = 'middle'
  ctx.imageSmoothingQuality = 'high'
  ctx.imageSmoothingEnabled = true

  const metrics = ctx.measureText(text)
  const textWidth = metrics.width
  let textLeft
  if (alignment === 'center') textLeft = textX - textWidth / 2
  else if (alignment === 'left') textLeft = textX
  else textLeft = textX - textWidth

  const textBoundaries = { left: textLeft, right: textLeft + textWidth, width: textWidth }

  ctx.fillText(text, textX, textY)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  const baseDPR = 3
  const currentDPR = canvas.width / parseInt(canvas.style.width)
  const baseSampleRate = Math.max(1, Math.round(currentDPR / baseDPR))
  const sampleRate = Math.max(2, Math.round(baseSampleRate))

  for (let y = 0; y < canvas.height; y += sampleRate) {
    for (let x = 0; x < canvas.width; x += sampleRate) {
      const index = (y * canvas.width + x) * 4
      const alpha = data[index + 3]
      if (alpha > 0) {
        const originalAlpha = (alpha / 255) * (sampleRate / currentDPR)
        particles.push({
          x,
          y,
          originalX: x,
          originalY: y,
          color: `rgba(${data[index]}, ${data[index + 1]}, ${data[index + 2]}, ${originalAlpha})`,
          opacity: originalAlpha,
          originalAlpha,
          velocityX: 0,
          velocityY: 0,
          angle: 0,
          speed: 0,
        })
      }
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  return { particles, textBoundaries }
}

const updateParticles = (
  particles: Particle[],
  vaporizeX: number,
  deltaTime: number,
  MULTIPLIED_VAPORIZE_SPREAD: number,
  VAPORIZE_DURATION: number,
  direction: string,
  density: number
) => {
  let allParticlesVaporized = true

  particles.forEach((particle) => {
    const shouldVaporize =
      direction === 'left-to-right' ? particle.originalX <= vaporizeX : particle.originalX >= vaporizeX

    if (shouldVaporize) {
      if (particle.speed === 0) {
        particle.angle = Math.random() * Math.PI * 2
        particle.speed = (Math.random() * 1 + 0.5) * MULTIPLIED_VAPORIZE_SPREAD
        particle.velocityX = Math.cos(particle.angle) * particle.speed
        particle.velocityY = Math.sin(particle.angle) * particle.speed
        particle.shouldFadeQuickly = Math.random() > density
      }

      if (particle.shouldFadeQuickly) {
        particle.opacity = Math.max(0, particle.opacity - deltaTime * 2)
      } else {
        const dx = particle.originalX - particle.x
        const dy = particle.originalY - particle.y
        const distanceFromOrigin = Math.sqrt(dx * dx + dy * dy)
        const dampingFactor = Math.max(0.95, 1 - distanceFromOrigin / (100 * MULTIPLIED_VAPORIZE_SPREAD))
        const randomSpread = MULTIPLIED_VAPORIZE_SPREAD * 3
        const spreadX = (Math.random() - 0.5) * randomSpread
        const spreadY = (Math.random() - 0.5) * randomSpread

        particle.velocityX = (particle.velocityX + spreadX + dx * 0.002) * dampingFactor
        particle.velocityY = (particle.velocityY + spreadY + dy * 0.002) * dampingFactor

        const maxVelocity = MULTIPLIED_VAPORIZE_SPREAD * 2
        const currentVelocity = Math.sqrt(
          particle.velocityX * particle.velocityX + particle.velocityY * particle.velocityY
        )
        if (currentVelocity > maxVelocity) {
          const scale = maxVelocity / currentVelocity
          particle.velocityX *= scale
          particle.velocityY *= scale
        }

        particle.x += particle.velocityX * deltaTime * 24
        particle.y += particle.velocityY * deltaTime * 14

        const baseFadeRate = 0.7
        const durationBasedFadeRate = baseFadeRate * (2000 / VAPORIZE_DURATION)
        particle.opacity = Math.max(0, particle.opacity - deltaTime * durationBasedFadeRate)
      }

      if (particle.opacity > 0.01) allParticlesVaporized = false
    } else {
      allParticlesVaporized = false
    }
  })

  return allParticlesVaporized
}

const renderParticles = (ctx: CanvasRenderingContext2D, particles: Particle[], globalDpr: number) => {
  ctx.save()
  ctx.scale(globalDpr, globalDpr)
  particles.forEach((particle) => {
    if (particle.opacity > 0) {
      ctx.fillStyle = particle.color.replace(/[\d.]+\)$/, `${particle.opacity})`)
      ctx.fillRect(particle.x / globalDpr, particle.y / globalDpr, 1, 1)
    }
  })
  ctx.restore()
}

const resetParticles = (particles: Particle[]) => {
  particles.forEach((particle) => {
    particle.x = particle.originalX
    particle.y = particle.originalY
    particle.opacity = particle.originalAlpha
    particle.speed = 0
    particle.velocityX = 0
    particle.velocityY = 0
  })
}

// ------------------------------------------------------------ //
const calculateVaporizeSpread = (fontSize: number) => {
  const size = typeof fontSize === 'string' ? parseInt(fontSize) : fontSize
  const points = [
    { size: 20, spread: 0.2 },
    { size: 50, spread: 0.5 },
    { size: 100, spread: 1.5 },
  ]
  if (size <= points[0].size) return points[0].spread
  if (size >= points[points.length - 1].size) return points[points.length - 1].spread
  let i = 0
  while (i < points.length - 1 && points[i + 1].size < size) i++
  const p1 = points[i]
  const p2 = points[i + 1]
  return p1.spread + ((size - p1.size) * (p2.spread - p1.spread)) / (p2.size - p1.size)
}

const parseColor = (color: string) => {
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/)
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch
    return `rgba(${r}, ${g}, ${b}, ${a})`
  } else if (rgbMatch) {
    const [, r, g, b] = rgbMatch
    return `rgba(${r}, ${g}, ${b}, 1)`
  }
  return 'rgba(255, 255, 255, 1)'
}

function transformValue(input: number, inputRange: number[], outputRange: number[], clamp = false): number {
  const [inputMin, inputMax] = inputRange
  const [outputMin, outputMax] = outputRange
  const progress = (input - inputMin) / (inputMax - inputMin)
  let result = outputMin + progress * (outputMax - outputMin)
  if (clamp) {
    if (outputMax > outputMin) result = Math.min(Math.max(result, outputMin), outputMax)
    else result = Math.min(Math.max(result, outputMax), outputMin)
  }
  return result
}
