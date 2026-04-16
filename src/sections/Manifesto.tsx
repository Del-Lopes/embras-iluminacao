'use client'
import { useRef, useState, useEffect } from 'react'
import { gsap, ScrollTrigger, SplitText } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'

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

export default function Manifesto() {
	const sectionRef = useRef<HTMLElement>(null)
	const leftContainerRef = useRef<HTMLDivElement>(null)
	const rightContainerRef = useRef<HTMLDivElement>(null)
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

			// 1. Entrance animations - section coming into view
			const entranceTl = gsap.timeline({
				scrollTrigger: {
					trigger: sectionRef.current,
					start: 'top bottom',
					end: 'top top',
					scrub: 1,
				},
			})

			// First slide content entrance (starts at 0% scroll, ends at 100%)
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

			// Vertical line: starts at 25% scroll (0.25), ends at 100% (top top)
			entranceTl.fromTo(
				lineVRef.current,
				{ scaleY: 0, transformOrigin: 'top' },
				{ scaleY: 1, duration: 0.75, ease: 'none' },
				0.25
			)

			// 1.5 Unified Horizontal Line Timeline (spans across the pin)
			const lineHTl = gsap.timeline({
				scrollTrigger: {
					trigger: sectionRef.current,
					start: 'top 30%', // Starts before pinning
					end: 'top -30%', // Finishes after panning (during pin)
					scrub: 1,
				},
			})
			lineHTl.fromTo(
				lineHRef.current,
				{ scaleX: 0, transformOrigin: 'left' },
				{ scaleX: 0.7, duration: 0.75, ease: 'none' }
			)
			lineHTl.to(lineHRef.current, {
				scaleX: 1,
				duration: 0.8,
				ease: 'none',
			})

			// 2. Timeline for slides (pining at top top)
			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: sectionRef.current,
					start: 'top top',
					end: '+=300%', // 3 slides depth
					pin: true,
					scrub: 1,
				},
			})

			const leftTexts = gsap.utils.toArray('.manifesto-left-text')
			const rightTexts = gsap.utils.toArray('.manifesto-right-text')

			// Initial state (Slide 0 is handled by entranceTl)
			gsap.set(leftTexts.slice(1), { autoAlpha: 0, y: 50 })
			gsap.set(rightTexts.slice(1), { autoAlpha: 0, y: 100 })

			// Initialize SplitText for all paragraphs
			const splits = gsap.utils.toArray('.manifesto-p').map(
				(p) =>
					new SplitText(p as Element, {
						type: 'words',
						wordsClass: 'word',
					})
			)

			// Ensure words start at 0.2 opacity and are white
			gsap.set('.word', { opacity: 0.2, color: 'white' })

			// Dedicated non-scrubbed behavior for the Background Glow
			// This guarantees instant disappearance to avoid trailing when scrolling back up.
			ScrollTrigger.create({
				trigger: sectionRef.current,
				start: 'top top',
				onEnter: () =>
					gsap.to(bgRef.current, {
						opacity: 1,
						duration: 0.8,
						ease: 'power2.out',
					}),
				onLeaveBack: () =>
					gsap.to(bgRef.current, { opacity: 0, duration: 0.1 }),
			})

			// (Horizontal line completion is now handled safely by lineHTl above)

			// Slide 0: reveal words (ONLY after line is done)
			if (splits[0]) {
				tl.to(
					splits[0].words,
					{
						opacity: 1,
						color: 'white',
						stagger: 0.1,
						duration: 0.1,
					},
					'+=0.1'
				)
			}

			// Transition Slide 0 -> 1
			tl.fromTo(
				leftTexts[0] as Element,
				{ autoAlpha: 1, y: 0 },
				{ autoAlpha: 0, y: -50, duration: 0.5 },
				'+=0.2'
			)
			tl.fromTo(
				rightTexts[0] as Element,
				{ autoAlpha: 1, y: 0 },
				{ autoAlpha: 0, y: -100, duration: 0.5 },
				'<'
			)
			tl.fromTo(
				leftTexts[1] as Element,
				{ autoAlpha: 0, y: 50 },
				{ autoAlpha: 1, y: 0, duration: 0.5 },
				'+=0.1'
			)
			tl.fromTo(
				rightTexts[1] as Element,
				{ autoAlpha: 0, y: 100 },
				{ autoAlpha: 1, y: 0, duration: 0.5 },
				'<'
			)

			// Slide 1: reveal words
			if (splits[1]) {
				tl.to(splits[1].words, {
					opacity: 1,
					color: 'white',
					stagger: 0.1,
					duration: 0.1,
				})
			}

			// Transition Slide 1 -> 2
			tl.fromTo(
				leftTexts[1] as Element,
				{ autoAlpha: 1, y: 0 },
				{ autoAlpha: 0, y: -50, duration: 0.5 },
				'+=0.2'
			)
			tl.fromTo(
				rightTexts[1] as Element,
				{ autoAlpha: 1, y: 0 },
				{ autoAlpha: 0, y: -100, duration: 0.5 },
				'<'
			)
			tl.fromTo(
				leftTexts[2] as Element,
				{ autoAlpha: 0, y: 50 },
				{ autoAlpha: 1, y: 0, duration: 0.5 },
				'+=0.1'
			)
			tl.fromTo(
				rightTexts[2] as Element,
				{ autoAlpha: 0, y: 100 },
				{ autoAlpha: 1, y: 0, duration: 0.5 },
				'<'
			)

			// Slide 2: reveal words
			if (splits[2]) {
				tl.to(splits[2].words, {
					opacity: 1,
					color: 'white',
					stagger: 0.1,
					duration: 0.1,
				})
			}

			// Stay at slide 2 for a bit
			tl.to({}, { duration: 0.5 })
		},
		{ dependencies: [mounted], scope: sectionRef }
	)

	if (!mounted) return null

	return (
		<section
			ref={sectionRef}
			className="h-screen w-full bg-[#050505] flex overflow-hidden relative"
		>
			{/* BACKGROUND GLOW */}
			<div
				ref={bgRef}
				className="absolute inset-0 pointer-events-none opacity-0"
				style={{
					background:
						'radial-gradient(36% 50% at 10% 4.5%, #373737 22.973%, #050505 100%)',
				}}
			/>

			{/* GRID LAYOUT */}
			<div className="flex w-full h-full items-start relative z-10">
				{/* LEFT COLUMN (70%) */}
				<div className="w-[70%] h-full flex flex-col justify-between pl-12 md:pl-24 pr-0 py-24 relative overflow-hidden">
					<div className="flex-1 flex items-center relative pr-12 md:pr-24">
						{slides.map((slide, i) => (
							<div
								key={slide.id}
								className="manifesto-left-text absolute inset-0 flex items-center"
							>
								<p
									className="manifesto-p font-(--font-heading) text-white uppercase max-w-5xl"
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
							<div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
							<div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
						</div>
						<div
							className="flex-1 h-px bg-[#474747]"
							ref={lineHRef}
						/>
					</div>
				</div>

				{/* DIVIDER */}
				<div
					ref={lineVRef}
					className="w-px h-[75vh] shrink-0"
					style={{
						background:
							'linear-gradient(to bottom, #474747 0%, #474747 60%, transparent 100%)',
					}}
				/>

				{/* RIGHT COLUMN (30%) */}
				<div className="w-[30%] h-full relative overflow-hidden flex items-center justify-center bg-[#050505]">
					{slides.map((slide, i) => (
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
