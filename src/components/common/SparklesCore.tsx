'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import type { Container, SingleOrMultiple } from '@tsparticles/engine'
import { loadSlim } from '@tsparticles/slim'
import { gsap } from '@/lib/gsap'
import { cn } from '@/lib/utils/cn'

type ParticlesProps = {
	id?: string
	className?: string
	background?: string
	particleSize?: number
	minSize?: number
	maxSize?: number
	speed?: number
	// Aceita array: o tsparticles sorteia uma cor por partícula, com peso igual
	// entre os itens. Para uma proporção desigual, repetir a cor dominante —
	// sete laranjas e um azul dão uma azul a cada oito, sem tocar no engine.
	particleColor?: string | string[]
	particleDensity?: number
}

export const SparklesCore = (props: ParticlesProps) => {
	const {
		id,
		className,
		background,
		minSize,
		maxSize,
		speed,
		particleColor,
		particleDensity,
	} = props

	const [init, setInit] = useState(false)
	// Substitui o useAnimation do framer-motion: o fade-in é feito com GSAP.
	const wrapperRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		initParticlesEngine(async (engine) => {
			await loadSlim(engine)
		}).then(() => {
			setInit(true)
		})
	}, [])

	const particlesLoaded = async (container?: Container) => {
		if (container && wrapperRef.current) {
			gsap.to(wrapperRef.current, {
				opacity: 1,
				duration: 1,
				ease: 'power2.out',
			})
		}
	}

	const generatedId = useId()

	return (
		<div ref={wrapperRef} className={cn('opacity-0', className)}>
			{init && (
				<Particles
					id={id || generatedId}
					className={cn('h-full w-full')}
					particlesLoaded={particlesLoaded}
					options={{
						// Sem `background` o canvas fica realmente transparente — só as
						// partículas são desenhadas (sem retângulo de fundo).
						...(background ? { background: { color: { value: background } } } : {}),
						fullScreen: {
							enable: false,
							zIndex: 1,
						},
						// 30 em vez de 60: outra metade do trabalho por segundo. O campo
						// se move devagar e as partículas são pontos, então não há
						// borda em movimento rápido para denunciar a taxa mais baixa.
						fpsLimit: 30,
						interactivity: {
							events: {
								onClick: { enable: false, mode: 'push' },
								onHover: { enable: false, mode: 'repulse' },
								resize: true as unknown as { enable: boolean; delay: number },
							},
							modes: {
								push: { quantity: 4 },
								repulse: { distance: 200, duration: 0.4 },
							},
						},
						particles: {
							bounce: {
								horizontal: { value: 1 },
								vertical: { value: 1 },
							},
							collisions: {
								absorb: { speed: 2 },
								bounce: {
									horizontal: { value: 1 },
									vertical: { value: 1 },
								},
								enable: false,
								maxSpeed: 50,
								mode: 'bounce',
								overlap: { enable: true, retries: 0 },
							},
							color: {
								value: particleColor || '#ffffff',
								animation: {
									h: { count: 0, enable: false, speed: 1, decay: 0, delay: 0, sync: true, offset: 0 },
									s: { count: 0, enable: false, speed: 1, decay: 0, delay: 0, sync: true, offset: 0 },
									l: { count: 0, enable: false, speed: 1, decay: 0, delay: 0, sync: true, offset: 0 },
								},
							},
							effect: {
								close: true,
								fill: true,
								options: {},
								type: {} as SingleOrMultiple<string> | undefined,
							},
							groups: {},
							move: {
								angle: { offset: 0, value: 90 },
								attract: { distance: 200, enable: false, rotate: { x: 3000, y: 3000 } },
								center: { x: 50, y: 50, mode: 'percent', radius: 0 },
								decay: 0,
								distance: {},
								direction: 'none',
								drift: 0,
								enable: true,
								gravity: { acceleration: 9.81, enable: false, inverse: false, maxSpeed: 50 },
								path: { clamp: true, delay: { value: 0 }, enable: false, options: {} },
								outModes: { default: 'out' },
								random: false,
								size: false,
								speed: { min: 0.1, max: 1 },
								spin: { acceleration: 0, enable: false },
								straight: false,
								trail: { enable: false, length: 10, fill: {} },
								vibrate: false,
								warp: false,
							},
							number: {
								density: { enable: true, width: 400, height: 400 },
								limit: { mode: 'delete', value: 0 },
								value: particleDensity || 120,
							},
							opacity: {
								// Piso em 0.4 (e não 0.1): a 0.1 a partícula some no
								// fundo claro, onde o contraste é menor.
								value: { min: 0.4, max: 1 },
								animation: {
									count: 0,
									enable: true,
									speed: speed || 4,
									decay: 0,
									delay: 0,
									sync: false,
									mode: 'auto',
									startValue: 'random',
									destroy: 'none',
								},
							},
							reduceDuplicates: false,
							shadow: {
								blur: 0,
								color: { value: '#000' },
								enable: false,
								offset: { x: 0, y: 0 },
							},
							shape: { close: true, fill: true, options: {}, type: 'circle' },
							size: {
								value: { min: minSize || 1, max: maxSize || 3 },
								animation: {
									count: 0,
									enable: false,
									speed: 5,
									decay: 0,
									delay: 0,
									sync: false,
									mode: 'auto',
									startValue: 'random',
									destroy: 'none',
								},
							},
							stroke: { width: 0 },
							zIndex: { value: 0, opacityRate: 1, sizeRate: 1, velocityRate: 1 },
							destroy: {
								bounds: {},
								mode: 'none',
								split: {
									count: 1,
									factor: { value: 3 },
									rate: { value: { min: 4, max: 9 } },
									sizeOffset: true,
								},
							},
							roll: {
								darken: { enable: false, value: 0 },
								enable: false,
								enlighten: { enable: false, value: 0 },
								mode: 'vertical',
								speed: 25,
							},
							tilt: {
								value: 0,
								animation: { enable: false, speed: 0, decay: 0, sync: false },
								direction: 'clockwise',
								enable: false,
							},
							twinkle: {
								lines: { enable: false, frequency: 0.05, opacity: 1 },
								particles: { enable: false, frequency: 0.05, opacity: 1 },
							},
							wobble: {
								distance: 5,
								enable: false,
								speed: { angle: 50, move: 10 },
							},
							life: {
								count: 0,
								delay: { value: 0, sync: false },
								duration: { value: 0, sync: false },
							},
							rotate: {
								value: 0,
								animation: { enable: false, speed: 0, decay: 0, sync: false },
								direction: 'clockwise',
								path: false,
							},
							orbit: {
								animation: { count: 0, enable: false, speed: 1, decay: 0, delay: 0, sync: false },
								enable: false,
								opacity: 1,
								rotation: { value: 45 },
								width: 1,
							},
							links: {
								blink: false,
								color: { value: '#fff' },
								consent: false,
								distance: 100,
								enable: false,
								frequency: 1,
								opacity: 1,
								shadow: { blur: 5, color: { value: '#000' }, enable: false },
								triangles: { enable: false, frequency: 1 },
								width: 1,
								warp: false,
							},
							repulse: {
								value: 0,
								enabled: false,
								distance: 1,
								duration: 1,
								factor: 1,
								speed: 1,
							},
						},
						// detectRetina DESLIGADO. Ligado, o canvas é renderizado na
						// resolução física do monitor: num display 2x são quatro vezes
						// mais pixels para preencher a cada quadro, e esse é o custo
						// dominante aqui, porque o desenho é de centenas de círculos.
						// Em partículas de 1 a 2px o ganho de nitidez é imperceptível,
						// então é o corte mais barato que existe neste componente.
						detectRetina: false,
						// Sem isso o rAF continua rodando com a seção fora da tela,
						// gastando CPU numa animação que ninguém está vendo.
						pauseOnOutsideViewport: true,
						pauseOnBlur: true,
					}}
				/>
			)}
		</div>
	)
}

export default SparklesCore
