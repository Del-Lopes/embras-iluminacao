'use client'

import type React from 'react'
import { useRef, useState, useEffect } from 'react'
import { gsap } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'

// TODO: substituir por depoimentos reais (frases curtas e impactantes)
const testimonials = [
	{
		quote: 'A luz certa transformou por completo cada ambiente.',
		author: 'Ana Ribeiro',
		role: 'Projeto Residencial',
		company: 'Residencial',
	},
	{
		quote: 'Precisão técnica com uma estética impecável.',
		author: 'Marcos Lima',
		role: 'Estúdio Criativo',
		company: 'Comercial',
	},
	{
		quote: 'Pura excelência em cada detalhe do projeto.',
		author: 'Elena Costa',
		role: 'Arquiteta',
		company: 'Arquitetura',
	},
]

const EASE = 'power3.out'

export default function TestimonialsCarousel() {
	const [activeIndex, setActiveIndex] = useState(0)
	const [mounted, setMounted] = useState(false)

	const containerRef = useRef<HTMLDivElement>(null)
	const numberWrapRef = useRef<HTMLDivElement>(null)
	const numberRef = useRef<HTMLSpanElement>(null)
	const badgeRef = useRef<HTMLDivElement>(null)
	const quoteRef = useRef<HTMLQuoteElement>(null)
	const authorRef = useRef<HTMLDivElement>(null)
	const lineRef = useRef<HTMLDivElement>(null)
	const progressRef = useRef<HTMLDivElement>(null)
	const tickerRef = useRef<HTMLDivElement>(null)

	// quickTo do paralaxe (setados no mount)
	const xTo = useRef<((v: number) => void) | null>(null)
	const yTo = useRef<((v: number) => void) | null>(null)

	useEffect(() => {
		setMounted(true)
	}, [])

	const total = testimonials.length
	const goNext = () => setActiveIndex((p) => (p + 1) % total)
	const goPrev = () => setActiveIndex((p) => (p - 1 + total) % total)

	// Auto-avanço
	useEffect(() => {
		const timer = setInterval(goNext, 6000)
		return () => clearInterval(timer)
	}, [])

	// Paralaxe magnético do número (equivalente a useSpring/useTransform)
	useGSAP(
		() => {
			if (!mounted || !numberWrapRef.current) return
			xTo.current = gsap.quickTo(numberWrapRef.current, 'x', { duration: 0.7, ease: EASE })
			yTo.current = gsap.quickTo(numberWrapRef.current, 'y', { duration: 0.7, ease: EASE })
		},
		{ dependencies: [mounted] }
	)

	const handleMouseMove = (e: React.MouseEvent) => {
		const rect = containerRef.current?.getBoundingClientRect()
		if (!rect || !xTo.current || !yTo.current) return
		const relX = e.clientX - (rect.left + rect.width / 2)
		const relY = e.clientY - (rect.top + rect.height / 2)
		xTo.current(gsap.utils.mapRange(-rect.width / 2, rect.width / 2, -22, 22, relX))
		yTo.current(gsap.utils.mapRange(-rect.height / 2, rect.height / 2, -12, 12, relY))
	}

	// Ticker infinito (equivalente ao loop x: [0, -1000])
	useGSAP(
		() => {
			if (!mounted || !tickerRef.current) return
			gsap.to(tickerRef.current, { xPercent: -50, duration: 22, ease: 'none', repeat: -1 })
		},
		{ dependencies: [mounted] }
	)

	// Animações de troca (equivalente ao AnimatePresence enter)
	useGSAP(
		() => {
			if (!mounted) return

			const tl = gsap.timeline()

			// Número: fade + scale + blur
			tl.fromTo(
				numberRef.current,
				{ opacity: 0, scale: 0.85, filter: 'blur(10px)' },
				{ opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.6, ease: EASE },
				0
			)
			// Badge (empresa/segmento)
			tl.fromTo(
				badgeRef.current,
				{ opacity: 0, x: -20 },
				{ opacity: 1, x: 0, duration: 0.45, ease: EASE },
				0
			)
			// Citação: reveal palavra a palavra (rotateX)
			tl.fromTo(
				'.tc-word',
				{ opacity: 0, y: 20, rotateX: 90 },
				{ opacity: 1, y: 0, rotateX: 0, duration: 0.55, stagger: 0.05, ease: EASE },
				0.1
			)
			// Autor
			tl.fromTo(
				authorRef.current,
				{ opacity: 0, y: 20 },
				{ opacity: 1, y: 0, duration: 0.45, ease: EASE },
				0.2
			)
			// Linha antes do nome
			tl.fromTo(
				lineRef.current,
				{ scaleX: 0, transformOrigin: 'left' },
				{ scaleX: 1, duration: 0.6, ease: EASE },
				0.25
			)
			// Linha de progresso vertical
			gsap.to(progressRef.current, {
				height: `${((activeIndex + 1) / total) * 100}%`,
				duration: 0.5,
				ease: EASE,
			})
		},
		{ dependencies: [activeIndex, mounted], scope: containerRef }
	)

	if (!mounted) return null

	const current = testimonials[activeIndex]

	return (
		// Sem bg próprio: a cor e o glow vêm do TestimonialsBackdrop, que envolve
		// esta seção — um fundo opaco aqui esconderia o glow. `relative` já basta
		// para o conteúdo ficar acima dele (o glow é absolute e vem antes no DOM).
		// h-full: como item flex do backdrop (h-screen), ocupa a altura toda e o
		// `items-center` centraliza o conteúdo dentro dela.
		<section className="relative w-full h-full flex items-center justify-center overflow-hidden px-8 md:px-12 py-16 md:py-0">
			<div
				ref={containerRef}
				className="relative w-full max-w-7xl"
				onMouseMove={handleMouseMove}
			>
				{/* Número gigante (paralaxe) — sangra pela esquerda */}
				<div className="absolute -left-8 top-1/2 -translate-y-1/2 select-none pointer-events-none">
					<div ref={numberWrapRef}>
						<span
							ref={numberRef}
							className="block text-[16rem] md:text-[28rem] font-bold text-(--color-accent)/[0.04] leading-none tracking-tighter"
						>
							{String(activeIndex + 1).padStart(2, '0')}
						</span>
					</div>
				</div>

				{/* Conteúdo — layout assimétrico */}
				<div className="relative flex">
					{/* Coluna esquerda — texto vertical + progresso */}
					<div className="hidden sm:flex flex-col items-center justify-center pr-8 md:pr-16 border-r border-(--color-border)">
						<span
							className="text-xs font-(family-name:--font-body) text-(--color-muted) tracking-widest uppercase"
							style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
						>
							Testemunhos
						</span>
						<div className="relative h-32 w-px bg-(--color-border) mt-8">
							<div
								ref={progressRef}
								className="absolute top-0 left-0 w-full bg-(--color-accent) origin-top"
								style={{ height: `${(1 / total) * 100}%` }}
							/>
						</div>
					</div>

					{/* Centro — conteúdo principal */}
					<div className="flex-1 sm:pl-16 py-12">
						{/* Badge */}
						<div ref={badgeRef} className="mb-8">
							<span className="inline-flex items-center gap-2 text-xs font-bold font-(family-name:--font-body) text-(--color-highlight) border border-(--color-border) rounded-full px-3 py-1 uppercase tracking-widest">
								<span className="w-1.5 h-1.5 rounded-full bg-(--color-highlight)" />
								{current.company}
							</span>
						</div>

						{/* Citação com reveal por palavra */}
						<div className="relative mb-12 min-h-[120px] md:min-h-[160px]" style={{ perspective: '600px' }}>
							<blockquote
								ref={quoteRef}
								className="text-2xl md:text-3xl font-(family-name:--font-body) font-light text-(--color-accent) leading-[1.3] tracking-tight"
							>
								{current.quote.split(' ').map((word, i) => (
									<span key={`${activeIndex}-${i}`} className="tc-word inline-block mr-[0.3em]">
										{word}
									</span>
								))}
							</blockquote>
						</div>

						{/* Linha do autor + navegação */}
						<div className="flex items-end justify-between gap-6">
							<div ref={authorRef} className="flex items-center gap-4">
								<div ref={lineRef} className="w-8 h-px bg-(--color-accent)" />
								<div>
									<p className="text-base font-medium" style={{ color: 'var(--color-highlight)' }}>{current.author}</p>
									<p className="text-[11px] text-(--color-muted) uppercase">{current.role}</p>
								</div>
							</div>

							{/* Navegação */}
							<div className="flex items-center gap-4">
								<button
									type="button"
									onClick={goPrev}
									aria-label="Anterior"
									className="group relative w-12 h-12 rounded-full border border-(--color-border) flex items-center justify-center overflow-hidden active:scale-95 transition-transform"
								>
									<span className="absolute inset-0 bg-(--color-accent) -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]" />
									<svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="relative z-10 text-(--color-accent) group-hover:text-(--color-bg) transition-colors">
										<path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</button>

								<button
									type="button"
									onClick={goNext}
									aria-label="Próximo"
									className="group relative w-12 h-12 rounded-full border border-(--color-border) flex items-center justify-center overflow-hidden active:scale-95 transition-transform"
								>
									<span className="absolute inset-0 bg-(--color-accent) translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]" />
									<svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="relative z-10 text-(--color-accent) group-hover:text-(--color-bg) transition-colors">
										<path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Ticker inferior — nomes/segmentos repetidos. Escondido no mobile:
				    ele fica -bottom-24 (fora da seção de altura-de-conteúdo) e o
				    overflow-hidden o cortava; é decorativo e quase invisível
				    (opacity 0.06), então some sem perda no mobile. */}
				<div className="hidden md:block absolute -bottom-24 left-0 right-0 overflow-hidden opacity-[0.06] pointer-events-none">
					<div ref={tickerRef} className="flex whitespace-nowrap text-6xl font-bold tracking-tight text-(--color-accent)">
						{[0, 1].map((dup) => (
							<span key={dup} className="flex shrink-0">
								{[...Array(5)].map((_, i) => (
									<span key={i} className="mx-8">
										{testimonials.map((t) => t.company).join(' • ')} •
									</span>
								))}
							</span>
						))}
					</div>
				</div>
			</div>
		</section>
	)
}
