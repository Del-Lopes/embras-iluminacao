'use client'
import Image from 'next/image'
import { useRef, useState, useEffect } from 'react'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'
import {
	AnimatedHeading,
	AnimatedParagraph,
	AnimatedPill,
} from '@/components/common/AnimatedTypography'

export default function SuccessCases() {
	const sectionRef = useRef<HTMLElement>(null)
	const gridRef = useRef<HTMLDivElement>(null)
	const logoRef = useRef<HTMLDivElement>(null)
	const lineHRef = useRef<HTMLDivElement>(null)
	const lineVRef = useRef<HTMLDivElement>(null)
	const cardsRef = useRef<(HTMLDivElement | null)[]>([])
	const [mounted, setMounted] = useState(false)

	useEffect(() => { setMounted(true) }, [])

	const cases = [
		{ id: 1, title: 'Mansão Alpha', location: 'São Paulo', image: '/images/case-1.png' },
		{ id: 2, title: 'Fazenda Aurora', location: 'Minas Gerais', image: '/images/hero.png' },
		{ id: 3, title: 'Apartamento Garden', location: 'Rio de Janeiro', image: '/images/case-1.png' },
		{ id: 4, title: 'Residência Moderna', location: 'Curitiba', image: '/images/hero.png' },
	]

	useGSAP(
		() => {
			if (!mounted) return

			const grid = gridRef.current
			const lineH = lineHRef.current
			const lineV = lineVRef.current
			const logo = logoRef.current
			const cards = cardsRef.current

			if (!grid || !lineH || !lineV || !logo) return

			const isMobile = window.innerWidth < 768
			const offset = isMobile ? 8 : 48

			gsap.set(lineH, { transformOrigin: '50% 50%' })
			gsap.set(lineV, { transformOrigin: '50% 50%' })

			const tlGrid = gsap.timeline({
				scrollTrigger: {
					trigger: grid,
					start: 'top bottom',
					end: 'top 35%',
					scrub: 0.8,
					invalidateOnRefresh: true,
				},
			})

			tlGrid.fromTo(cards[0], { x: offset, y: offset }, { x: 0, y: 0, ease: 'none' }, 0)
			tlGrid.fromTo(cards[1], { x: -offset, y: offset }, { x: 0, y: 0, ease: 'none' }, 0)
			tlGrid.fromTo(cards[2], { x: offset, y: -offset }, { x: 0, y: 0, ease: 'none' }, 0)
			tlGrid.fromTo(cards[3], { x: -offset, y: -offset }, { x: 0, y: 0, ease: 'none' }, 0)
			tlGrid.fromTo(lineH, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, ease: 'none' }, 0)
			tlGrid.fromTo(lineV, { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, ease: 'none' }, 0)

			const tlLogo = gsap.timeline({
				scrollTrigger: {
					trigger: grid,
					start: 'top 35%',
					end: 'bottom 95%',
					scrub: 0.8,
					invalidateOnRefresh: true,
				},
			})

			tlLogo.fromTo(logo, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, ease: 'power2.out' })

			return () => { ScrollTrigger.getAll().forEach((t) => t.kill()) }
		},
		{ scope: sectionRef, dependencies: [mounted] }
	)

	return (
		<section
			ref={sectionRef}
			className="py-36 px-8 md:px-12 max-w-7xl mx-auto bg-(--color-bg) overflow-hidden"
		>
			<div className="mb-32 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
				<div className="flex flex-col gap-4">
					<AnimatedPill className="text-(--color-muted) uppercase w-fit">
						Cases de sucesso
					</AnimatedPill>
					<AnimatedHeading className="text-5xl md:text-7xl font-(--font-heading) uppercase leading-tight md:leading-[82px] tracking-tighter">
						Onde a luz <br />
						encontra a <br />
						<span className="text-(--color-highlight)">arquitetura</span>
					</AnimatedHeading>
				</div>
				<div className="max-w-md">
					<AnimatedParagraph>
						Nossos projetos são intervenções artísticas que valorizam cada volume, material e textura do ambiente construído.
					</AnimatedParagraph>
				</div>
			</div>

			<div ref={gridRef} className="relative">
				<div
					ref={lineHRef}
					className="absolute top-1/2 left-0 w-full h-px z-5 pointer-events-none"
					style={{ backgroundColor: 'var(--color-border)', transformOrigin: 'center', transform: 'scaleX(0)', opacity: 0 }}
				/>
				<div
					ref={lineVRef}
					className="absolute left-1/2 top-0 w-px h-full z-5 pointer-events-none"
					style={{ backgroundColor: 'var(--color-border)', transformOrigin: 'center', transform: 'scaleY(0)', opacity: 0 }}
				/>
				<div
					ref={logoRef}
					className="absolute top-1/2 left-1/2 z-10 pointer-events-none"
					style={{ opacity: 0, transform: 'translate(-50%, -50%) scale(0.85)' }}
				>
					<div className="w-[60px] h-[60px] relative bg-[#050505] rounded-full flex items-center justify-center p-2">
						<div className="w-full h-full relative">
							<Image src="/images/embras-form-w.png" alt="Embras" fill sizes="60px" className="object-contain" />
						</div>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4 md:gap-24 relative z-20">
					{cases.map((project, index) => (
						<div
							key={project.id}
							ref={(el) => { cardsRef.current[index] = el }}
							className="group cursor-pointer"
						>
							<div className="aspect-square bg-[#0f0f0f] border border-(--color-border) relative overflow-hidden transition-all duration-700 group-hover:border-white/30">
								<Image
									src={project.image}
									alt={project.title}
									fill
									sizes="(max-width: 768px) 50vw, 33vw"
									className="object-cover opacity-60 grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000"
								/>
								<div className="absolute inset-0 bg-linear-to-br from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
								<div className="absolute top-4 md:top-8 left-4 md:left-8 text-[11px] uppercase tracking-[2px] font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none">
									{project.location}
								</div>
								<div
									className="absolute bottom-4 md:bottom-8 left-4 md:left-8 text-[11px] md:text-sm font-(--font-heading) uppercase text-white z-10 flex items-center gap-2 md:gap-4 pointer-events-none"
									style={{ letterSpacing: '3px' }}
								>
									<span className="w-5 md:w-8 h-px md:h-[2px] shrink-0 bg-white/50" />
									{project.title}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
