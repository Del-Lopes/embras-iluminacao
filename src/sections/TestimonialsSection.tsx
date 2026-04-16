'use client'

import React, { useRef, useState, useEffect } from 'react'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'

const testimonials = [
	{
		id: 1,
		quote: 'A iluminação da nossa casa mudou completamente a atmosfera dos ambientes. A equipe da Embras conseguiu traduzir exatamente a sofisticação e o aconchego que procurávamos. Cada detalhe foi pensado com uma precisão impressionante.',
	},
	{
		id: 2,
		quote: 'O projeto luminotécnico para a nossa fazenda superou todas as expectativas. Eles conseguiram valorizar a arquitetura rústica e a paisagem externa, criando cenários que encantam de forma acolhedora e com extrema elegância.',
	},
	{
		id: 3,
		quote: 'Profissionalismo impecável. Nosso estúdio precisava de uma luz técnica específica, mas que mantivesse um design estético limpo. O resultado final entregou funcionalidade perfeita e uma beleza visual inigualável.',
	},
	{
		id: 4,
		quote: 'A atenção aos detalhes e o cuidado na escolha das peças foram o grande diferencial. Trabalhar com a Embras é ter a certeza de que seu projeto está nas mãos de quem realmente entende a arte de modular a luz.',
	},
]

export default function TestimonialsSection() {
	const sectionRef = useRef<HTMLElement>(null)
	const quoteIconRef = useRef<HTMLDivElement>(null)
	const glowRef = useRef<HTMLDivElement>(null)
	const trackRef = useRef<HTMLDivElement>(null)
	const dotsRefs = useRef<(HTMLDivElement | null)[]>([])
	const textRefs = useRef<(HTMLParagraphElement | null)[]>([])

	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	useGSAP(
		() => {
			if (!mounted || !sectionRef.current || !trackRef.current) return

			const total = testimonials.length
			// Cada slide ocupa exatamente 1/3 da viewport em altura
			const itemH = window.innerHeight / 3

			// ==============================
			// ESTADOS INICIAIS
			// ==============================
			gsap.set(quoteIconRef.current, { opacity: 0.4 })
			gsap.set(glowRef.current, { opacity: 0 })

			// Todos os textos começam cinza
			textRefs.current.forEach((el) => {
				if (el) gsap.set(el, { color: '#474747' })
			})

			// Todos os dots escondidos
			dotsRefs.current.forEach((el) => {
				if (el) gsap.set(el, { opacity: 0 })
			})

			// Paginação: primeiro ativo
			testimonials.forEach((_, i) => {
				gsap.set(`.pagination-line-${i}`, {
					backgroundColor: i === 0 ? '#ffffff' : '#474747',
				})
			})

			// ==============================
			// 1. ANIMAÇÃO DE ENTRADA (sem scrub)
			// ==============================
			const entranceTl = gsap.timeline({
				scrollTrigger: {
					trigger: sectionRef.current,
					// start em 'top 30%' fica ANTES do pin (top top).
					// Isso garante que o snap do carrossel (que snapa para top top)
					// nunca cruza de volta o gatilho de entrada — logo o reverse
					// só acontece quando o usuário scrolla de verdade para fora da seção.
					start: 'top 30%',
					toggleActions: 'play none none reverse',
				},
			})

			entranceTl.to(
				quoteIconRef.current,
				{ opacity: 1, duration: 1, ease: 'power2.out' },
				0.3
			)
			entranceTl.to(
				glowRef.current,
				{ opacity: 1, duration: 1.5, ease: 'power2.out' },
				0.1
			)

			// Primeiro item: cor branca e dots visíveis
			if (textRefs.current[0]) {
				entranceTl.to(
					textRefs.current[0],
					{ color: '#ffffff', duration: 1, ease: 'power2.out' },
					0.4
				)
			}
			if (dotsRefs.current[0]) {
				entranceTl.to(
					dotsRefs.current[0],
					{ opacity: 1, duration: 0.8, ease: 'power2.out' },
					0.4
				)
			}

			// ==============================
			// 2. CAROUSEL COM SCRUB + SNAP
			// ==============================
			// A seção é pinada. O scroll controla a posição do track.
			// snap: trava em cada slide quando o scroll desacelera.
			// holdFraction: a fração inicial da timeline onde NADA move.
			// Isso garante que o item 0 fique visível quando a seção pinar
			// antes dos slides começarem a mover.
			const holdFraction = 0.05

			const scrollTl = gsap.timeline({
				scrollTrigger: {
					trigger: sectionRef.current,
					start: 'top top',
					// Reduzimos o tamanho total do pin em 25% para que seja mais rápido
					// trocar de depoimento com menos esforço de scroll
					end: `+=${total * window.innerHeight * 0.75}`,
					pin: true,
					scrub: 0.5,
					snap: {
						// Os snap points foram ajustados para incluir o hold no início
						snapTo: (value: number) => {
							// Snap para 0 (hold) ou para cada slide transition
							const points = [0]
							for (let i = 1; i < total; i++) {
								points.push(
									holdFraction +
										(i / (total - 1)) * (1 - holdFraction)
								)
							}
							return points.reduce((a, b) =>
								Math.abs(b - value) < Math.abs(a - value)
									? b
									: a
							)
						},
						duration: { min: 0.1, max: 0.2 },
						delay: 0, // Delay ZERO faz o snap entrar em ação instantaneamente
						ease: 'power2.inOut',
					},
				},
			})

			// Hold period: o item 0 fica estático no início
			scrollTl.to({}, { duration: holdFraction })

			for (let i = 1; i < total; i++) {
				// stepStart e dur mapeados para o range [holdFraction, 1]
				const stepStart =
					holdFraction + ((i - 1) / (total - 1)) * (1 - holdFraction)
				const dur = (1 / (total - 1)) * (1 - holdFraction)

				// Move o track para cima por exatamente 1 item height (em pixels)
				scrollTl.to(
					trackRef.current,
					{ y: -i * itemH, ease: 'none', duration: dur },
					stepStart
				)

				// Desativa o item anterior: cinza + esconde dots
				if (textRefs.current[i - 1]) {
					scrollTl.to(
						textRefs.current[i - 1]!,
						{ color: '#474747', ease: 'none', duration: dur },
						stepStart
					)
				}
				if (dotsRefs.current[i - 1]) {
					scrollTl.to(
						dotsRefs.current[i - 1]!,
						{ opacity: 0, ease: 'none', duration: dur * 0.4 },
						stepStart
					)
				}

				// Ativa o novo item: branco + mostra dots
				if (textRefs.current[i]) {
					scrollTl.to(
						textRefs.current[i]!,
						{ color: '#ffffff', ease: 'none', duration: dur },
						stepStart
					)
				}
				if (dotsRefs.current[i]) {
					scrollTl.to(
						dotsRefs.current[i]!,
						{ opacity: 1, ease: 'none', duration: dur * 0.4 },
						stepStart + dur * 0.5
					)
				}

				// Paginação
				scrollTl.to(
					`.pagination-line-${i - 1}`,
					{
						backgroundColor: '#474747',
						ease: 'none',
						duration: dur * 0.5,
					},
					stepStart
				)
				scrollTl.to(
					`.pagination-line-${i}`,
					{
						backgroundColor: '#ffffff',
						ease: 'none',
						duration: dur * 0.5,
					},
					stepStart + dur * 0.3
				)
			}

			return () => {
				ScrollTrigger.getAll().forEach((t) => t.kill())
			}
		},
		{ scope: sectionRef, dependencies: [mounted] }
	)

	return (
		<section
			ref={sectionRef}
			className="h-screen w-full bg-[#050505] relative flex flex-row z-10"
		>
			{/* Background Glow Effect */}
			<div
				ref={glowRef}
				className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-(--color-accent)/5 blur-[120px] rounded-full pointer-events-none"
			/>
			{/* ====== COLUNA ESQUERDA (20%) ====== */}
			<div className="w-[20%] h-full relative flex flex-col">
				{/* Ícone aspas: centralizado verticalmente */}
				<div
					ref={quoteIconRef}
					className="w-full h-full flex items-center justify-center pl-6 lg:pl-12"
				>
					<svg
						className="w-24 h-24 md:w-32 md:h-32 xl:w-48 xl:h-48"
						viewBox="0 0 24 24"
						fill="url(#quoteGradient)"
						xmlns="http://www.w3.org/2000/svg"
					>
						<defs>
							<linearGradient
								id="quoteGradient"
								x1="0%"
								y1="0%"
								x2="100%"
								y2="0%"
							>
								<stop offset="10%" stopColor="#414141" />
								<stop offset="90%" stopColor="#ffffff" />
							</linearGradient>
						</defs>
						<path d="M3.5 17.5V13.844C3.5 11.517 4.136 9.533 5.408 7.892C6.697 6.233 8.356 5.167 10.385 4.692V6.623C8.674 7.218 7.42 8.361 6.622 10.05C7.03 9.949 7.45 9.898 7.882 9.898C8.955 9.898 9.854 10.275 10.578 11.028C11.302 11.782 11.664 12.693 11.664 13.763C11.664 14.836 11.285 15.748 10.528 16.5C9.782 17.252 8.878 17.628 7.818 17.628H3.5V17.5ZM15 17.5V13.844C15 11.517 15.636 9.533 16.908 7.892C18.197 6.233 19.856 5.167 21.885 4.692V6.623C20.174 7.218 18.92 8.361 18.122 10.05C18.53 9.949 18.95 9.898 19.382 9.898C20.455 9.898 21.354 10.275 22.078 11.028C22.802 11.782 23.164 12.693 23.164 13.763C23.164 14.836 22.785 15.748 22.028 16.5C21.282 17.252 20.378 17.628 19.318 17.628H15V17.5Z" />
					</svg>
				</div>
			</div>

			{/* ====== COLUNA DIREITA (80%) ====== */}
			<div className="w-[80%] h-full relative flex items-center">
				{/* Paginação */}
				<div className="absolute right-8 md:right-12 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
					{testimonials.map((t, idx) => (
						<div
							key={`pag-${t.id}`}
							className={`pagination-line-${idx} w-px h-6`}
							style={{
								backgroundColor:
									idx === 0 ? '#ffffff' : '#474747',
							}}
						/>
					))}
				</div>

				{/* ====== JANELA DO CAROUSEL ====== */}
				{/*
					Lógica do layout:
					- A janela ocupa 100vh (toda a seção)
					- Cada slide ocupa 33.33vh (1/3 da viewport)
					- O track começa posicionado em top: 33.33vh,
					  para que o PRIMEIRO item fique no CENTRO vertical da tela
					- Ao scrollar, o GSAP move o track para cima por 33.33vh por step
					- Isso faz o próximo item ocupar o centro
					- O item anterior fica visível acima (1/3 superior)
					- O próximo fica visível abaixo (1/3 inferior)
					→ Resultado: 3 itens visíveis (anterior + ativo + próximo)
				*/}
				<div className="relative w-full h-full overflow-hidden">
					<div
						ref={trackRef}
						className="absolute left-16 md:left-28 right-20 md:right-80 max-w-[900px] will-change-transform"
						style={{ top: '33.33vh' }}
					>
						{testimonials.map((t, idx) => (
							<div
								key={`test-${t.id}`}
								className="flex flex-col justify-center"
								style={{ height: '33.33vh' }}
							>
								{/* Dots vermelhos: controlados por GSAP (opacity) */}
								<div
									ref={(el) => {
										dotsRefs.current[idx] = el
									}}
									className="flex gap-[6px] mb-5"
									style={{ opacity: 0 }}
								>
									<div className="w-2.5 h-2.5 rounded-full bg-white" />
									<div className="w-2.5 h-2.5 rounded-full bg-white" />
								</div>

								{/* Texto do depoimento: cor controlada por GSAP inline */}
								<p
									ref={(el) => {
										textRefs.current[idx] = el
									}}
									className="text-lg md:text-2xl lg:text-[32px] leading-[1.2] md:leading-[1.15] tracking-tight font-medium"
									style={{ color: '#474747' }}
								>
									{t.quote}
								</p>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	)
}
