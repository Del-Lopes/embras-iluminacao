'use client'
import { useRef, useState, useEffect } from 'react'
import { gsap, ScrollTrigger, SplitText } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'
import { useTheme } from '@/components/common/ThemeProvider'

const slides = [
	{
		id: 'missao',
		title: 'Missão',
		text: 'Desenvolver e oferecer soluções em iluminação que unam eficiência, qualidade e design, atendendo com precisão às necessidades de residências, empresas e espaços públicos. Produzimos luminárias robustas e de alto desempenho, garantindo confiabilidade, segurança e excelência em cada projeto.',
	},
	{
		id: 'visao',
		title: 'Visão',
		text: 'Ser referência no mercado de iluminação, reconhecida pela solidez, inovação contínua e compromisso com a satisfação plena dos clientes, consolidando a Embras como especialista na produção de luminárias de alta qualidade.',
	},
	{
		id: 'valores',
		title: 'Valores',
		text: 'Na Embras, somos guiados pela confiança, atuando com ética e transparência em cada relacionamento. Buscamos versatilidade para oferecer a melhor solução em cada projeto, com eficiência, qualidade e segurança. Evoluímos constantemente por meio da inovação, aprimorando processos e produtos para entregar sempre o melhor resultado.',
	},
]

// Tempo total que a onda leva para percorrer o parágrafo, do primeiro caractere
// ao último. A duração do reveal de um slide é este valor + 0.3s (a entrada de
// cada caractere). É o único número a mexer para acelerar/desacelerar o efeito.
const REVEAL_SPREAD_S = 1.6

export default function Manifesto() {
	const { theme } = useTheme()
	const isDark = theme === 'dark'

	const sectionRef = useRef<HTMLElement>(null)
	const lineHRef = useRef<HTMLDivElement>(null)
	const lineVRef = useRef<HTMLDivElement>(null)
	const bgRef = useRef<HTMLDivElement>(null)
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	useGSAP(
		() => {
			if (!mounted || !sectionRef.current) return

			// 1. Entrada (scrub) — textos do slide 0 + linha vertical acompanham a seção entrando
			const entranceTl = gsap.timeline({
				scrollTrigger: {
					trigger: sectionRef.current,
					start: 'top bottom',
					end: 'top top',
					scrub: 1,
				},
			})
			entranceTl.fromTo(
				'.manifesto-left-text:first-child',
				{ opacity: 0, x: -220 },
				{ opacity: 1, x: 0, duration: 1 },
				0
			)
			entranceTl.fromTo(
				'.manifesto-right-text:first-child',
				{ opacity: 0, x: 220 },
				{ opacity: 1, x: 0, duration: 1 },
				0
			)
			entranceTl.fromTo(
				lineVRef.current,
				{ scaleY: 0, transformOrigin: 'top' },
				{ scaleY: 1, duration: 0.75, ease: 'none' },
				0.25
			)

			// 1.5 Linha horizontal (scrub)
			const lineHTl = gsap.timeline({
				scrollTrigger: {
					trigger: sectionRef.current,
					start: 'top 30%',
					end: 'top -30%',
					scrub: 1,
				},
			})
			lineHTl.fromTo(
				lineHRef.current,
				{ scaleX: 0, transformOrigin: 'left' },
				{ scaleX: 0.7, duration: 0.75, ease: 'none' }
			)
			lineHTl.to(lineHRef.current, { scaleX: 1, duration: 0.8, ease: 'none' })

			const leftTexts = gsap.utils.toArray<HTMLElement>('.manifesto-left-text')
			const rightTexts = gsap.utils.toArray<HTMLElement>('.manifesto-right-text')

			// Slides 1 e 2 começam ocultos
			gsap.set(leftTexts.slice(1), { autoAlpha: 0, y: 50 })
			gsap.set(rightTexts.slice(1), { autoAlpha: 0, y: 100 })

			// Divide os parágrafos em caracteres — nenhum visível até o reveal.
			// 'words,chars' e não só 'chars': o agrupamento por palavra é o que
			// mantém a quebra de linha correta. Sem ele cada caractere vira uma
			// caixa independente e o texto quebra no meio das palavras.
			const splits = gsap.utils
				.toArray<HTMLElement>('.manifesto-p')
				.map((p) => new SplitText(p, { type: 'words,chars', charsClass: 'char' }))
			// inline-block permite o transform; os chars começam invisíveis, um
			// pouco abaixo e desfocados — entram subindo e ganhando foco.
			gsap.set('.char', {
				display: 'inline-block',
				opacity: 0,
				y: 10,
				filter: 'blur(8px)',
			})

			// Reveal do texto: AUTOMÁTICO (roda em tempo real, sem scrub). Disparado
			// pelo call da timeline ao entrar no slide — sem nenhum outro efeito.
			const charsOf = (i: number) => splits[i]?.chars ?? []
			// Cada slide revela UMA vez (não reinicia por re-disparo do scrub)
			const played: boolean[] = []
			const autoReveal = (i: number) => {
				if (played[i]) return
				played[i] = true
				const c = charsOf(i)
				if (c.length) {
					gsap.to(c, {
						opacity: 1,
						y: 0,
						filter: 'blur(0px)',
						duration: 0.3,
						ease: 'power2.out',
						// `amount` (total distribuído) e não um valor por caractere:
						// com stagger fixo a duração vira refém do tamanho do texto —
						// "Valores" (329 chars) levava ~1,5x o tempo de "Visão" (220),
						// embora os dois fiquem retidos pelo mesmo tempo de scrub.
						// Assim todo slide revela em amount + duration, seja qual for.
						stagger: { amount: REVEAL_SPREAD_S },
						// Solta o filter no fim: filter permanente mantém uma camada
						// de composição viva por caractere, sem nada a exibir.
						clearProps: 'filter',
						overwrite: 'auto',
					})
				}
			}

			// Glow (onEnter) — acende ao ficar 100% visível.
			// overwrite:'auto' nos DOIS: sem ele, num vai-e-volta rápido o fade-in
			// (0.8s) e o fade-out (0.1s) coexistem — o fade-out vence por 0.1s e
			// depois o fade-in, ainda vivo, puxa a opacidade de volta pra 1, deixando
			// o glow preso aceso. Como nenhum tem delay, overwrite basta (mata o
			// concorrente que está renderizando; não precisa de killTweensOf).
			ScrollTrigger.create({
				trigger: sectionRef.current,
				start: 'top top',
				onEnter: () =>
					gsap.to(bgRef.current, { opacity: 1, duration: 0.8, ease: 'power2.out', overwrite: 'auto' }),
				onLeaveBack: () =>
					gsap.to(bgRef.current, { opacity: 0, duration: 0.1, overwrite: 'auto' }),
			})

			// 2. Timeline com PIN + SCRUB — troca de slides (o "restante", como no original).
			//    Apenas o reveal do texto é chamado de forma automática (não scrubbed).
			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: sectionRef.current,
					start: 'top top',
					end: '+=300%',
					pin: true,
					scrub: 1,
				},
			})

			// Slide 0 — reveal automático (dispara uma vez ao entrar)
			tl.call(() => autoReveal(0), undefined, '+=0.1')
			tl.to({}, { duration: 1.2 })

			// Transição 0 → 1 (scrub)
			tl.fromTo(leftTexts[0], { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -50, duration: 0.5 }, '+=0.2')
			tl.fromTo(rightTexts[0], { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -100, duration: 0.5 }, '<')
			tl.fromTo(leftTexts[1], { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.5 }, '+=0.1')
			tl.fromTo(rightTexts[1], { autoAlpha: 0, y: 100 }, { autoAlpha: 1, y: 0, duration: 0.5 }, '<')

			// Slide 1 — reveal automático (dispara uma vez ao entrar)
			tl.call(() => autoReveal(1))
			tl.to({}, { duration: 1.2 })

			// Transição 1 → 2 (scrub)
			tl.fromTo(leftTexts[1], { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -50, duration: 0.5 }, '+=0.2')
			tl.fromTo(rightTexts[1], { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -100, duration: 0.5 }, '<')
			tl.fromTo(leftTexts[2], { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.5 }, '+=0.1')
			tl.fromTo(rightTexts[2], { autoAlpha: 0, y: 100 }, { autoAlpha: 1, y: 0, duration: 0.5 }, '<')

			// Slide 2 — reveal automático (dispara uma vez ao entrar)
			tl.call(() => autoReveal(2))
			tl.to({}, { duration: 1.2 })
		},
		{ dependencies: [mounted], scope: sectionRef }
	)

	if (!mounted) return null

	return (
		<section
			ref={sectionRef}
			id="manifesto"
			className="h-screen w-full bg-(--color-bg) flex overflow-hidden relative"
		>
			{/* BACKGROUND GLOW */}
			<div
				ref={bgRef}
				className="absolute inset-0 pointer-events-none opacity-0"
				style={{
					background: isDark
						? 'radial-gradient(65% 75% at 8% 5%, #6b6b6b 0%, #2a2a2a 45%, #050505 100%)'
						: 'radial-gradient(65% 75% at 8% 5%, #9e9b93 0%, #c4c1b9 45%, #f5f5f5 100%)',
				}}
			/>

			{/* GRID LAYOUT */}
			<div className="flex w-full h-full items-start relative z-10">
				{/* LEFT COLUMN (70%) */}
				<div className="w-[70%] h-full flex flex-col justify-between pl-12 md:pl-24 pr-0 py-24 relative overflow-hidden">
					<div className="flex-1 flex items-center relative pr-12 md:pr-24">
						{slides.map((slide) => (
							<div
								key={slide.id}
								className="manifesto-left-text absolute inset-0 flex items-center"
							>
								<p
									className="manifesto-p font-(--font-heading) text-(--color-accent) max-w-5xl"
									style={{
										fontSize: '36px',
										lineHeight: '46px',
										whiteSpace: 'pre-line',
									}}
								>
									{slide.text}
								</p>
							</div>
						))}
					</div>

					{/* Elemento Decorativo Inferior */}
					<div className="flex items-center gap-4 w-full mt-12 pb-12">
						<div className="flex gap-2">
							<div className="w-2 h-2 rounded-full bg-(--color-accent)" style={{ boxShadow: isDark ? '0 0 10px rgba(255,255,255,0.5)' : '0 0 10px rgba(0,0,0,0.2)' }} />
							<div className="w-2 h-2 rounded-full bg-(--color-accent)" style={{ boxShadow: isDark ? '0 0 10px rgba(255,255,255,0.5)' : '0 0 10px rgba(0,0,0,0.2)' }} />
						</div>
						<div
							className="flex-1 h-px bg-(--color-muted)"
							ref={lineHRef}
						/>
					</div>
				</div>

				{/* DIVIDER */}
				<div
					ref={lineVRef}
					className="w-px h-[75vh] shrink-0"
					style={{
						background: `linear-gradient(to bottom, var(--color-muted) 0%, var(--color-muted) 60%, transparent 100%)`,
					}}
				/>

				{/* RIGHT COLUMN (30%) */}
				<div className="w-[30%] h-full relative overflow-hidden flex items-center justify-center bg-(--color-bg)">
					{slides.map((slide) => (
						<div
							key={slide.id}
							className="manifesto-right-text absolute inset-0 flex items-center justify-center"
						>
							<div className="relative h-full flex items-center justify-center pl-12">
								{/* Texto Principal com novo estilo Harmonious */}
								<span
									className="harmonious relative font-(--font-heading) uppercase select-none"
									style={{
										writingMode: 'vertical-rl',
										fontSize: 'min(20vh, 40vw)',
										lineHeight: 0.8,
										transform: 'rotate(180deg)',
									}}
								>
									{slide.title}
								</span>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
