'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'
import ThemeToggle from '@/components/common/ThemeToggle'
import { navItems } from '@/config/navigation'

const products = [
	{
		id: 1,
		name: 'Luminária Arch 01',
		category: 'Modern',
		image: '/images/product-1.png',
	},
	{
		id: 2,
		name: 'Luminária Arch 02',
		category: 'Industrial',
		image: '/images/product-2.png',
	},
	{
		id: 3,
		name: 'Luminária Arch 03',
		category: 'Luxury',
		image: '/images/product-1.png',
	},
	{
		id: 4,
		name: 'Luminária Arch 04',
		category: 'Minimal',
		image: '/images/product-2.png',
	},
]

export default function HeroProductsWrapper() {
	const heroRef = useRef<HTMLElement>(null)
	const lineRef = useRef<HTMLDivElement>(null)
	const overlayRef = useRef<HTMLDivElement>(null)
	const embrasTextRef = useRef<HTMLHeadingElement>(null)

	const carouselTriggerRef = useRef<HTMLDivElement>(null)
	const carouselSectionRef = useRef<HTMLDivElement>(null)

	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	useGSAP(
		() => {
			if (
				!mounted ||
				!heroRef.current ||
				!lineRef.current ||
				!carouselTriggerRef.current ||
				!carouselSectionRef.current ||
				!overlayRef.current
			)
				return

			// 1. Hero local scroll animation (the line indicator)
			gsap.to(lineRef.current, {
				y: 90, // Updated for 120px height - 30px indicator
				ease: 'none',
				scrollTrigger: {
					trigger: heroRef.current,
					start: 'top top',
					end: 'bottom top',
					scrub: 0.5,
				},
			})

			// 2. Integration Transition: Darken Hero as Carousel comes from bottom
			gsap.fromTo(
				overlayRef.current,
				{ opacity: 0 },
				{
					opacity: 1, // Full black for deep contrast #070707
					ease: 'none',
					scrollTrigger: {
						trigger: carouselTriggerRef.current,
						start: 'top bottom', // When carousel enters screen
						end: 'top top', // When carousel reaches top (pins)
						scrub: true,
					},
				}
			)

			// Subtle parallax/blur on EMBRAS text during transition for continuity
			// Changed from { opacity: 1 } to { opacity: 0 } so it starts invisible on Hero and appears during scroll transition
			gsap.fromTo(
				embrasTextRef.current,
				{ opacity: 0, filter: 'blur(0px)', y: '22%' },
				{
					opacity: 0.3,
					filter: 'blur(4px)',
					y: '0%', // slightly move up to follow natural scroll
					ease: 'none',
					scrollTrigger: {
						trigger: carouselTriggerRef.current,
						start: 'top 95%',
						end: 'top top',
						scrub: true,
					},
				}
			)

			// 3. Carousel Horizontal Pin & Static Fade-In Animation (Timeline)
			// Elements are completely static on screen (pinned at top: 0) while they smoothly fade in.
			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: carouselTriggerRef.current,
					start: 'top top',
					end: () =>
						`+=${carouselSectionRef.current!.scrollWidth * 0.5}`, // Shorter scroll distance to increase overall speed
					scrub: 1,
					pin: true,
					anticipatePin: 1,
					invalidateOnRefresh: true,
				},
			})

			// Phase 1: Fade in the content rapidly (first 5% of scroll)
			tl.to(carouselSectionRef.current, {
				opacity: 1,
				duration: 0.15,
				ease: 'power1.inOut',
			})
				// Phase 2: Horizontal scroll perfectly to the right edge
				.to(carouselSectionRef.current, {
					x: () => {
						// We calculate the exact overflow distance taking into account the screen width
						const offset = window.innerWidth
						return -(
							carouselSectionRef.current!.scrollWidth - offset
						)
					},
					ease: 'none',
					duration: 0.95,
				})

			return () => {
				ScrollTrigger.getAll().forEach((t) => t.kill())
			}
		},
		{ dependencies: [mounted] }
	)

	if (!mounted) {
		return (
			<section className="h-screen w-full bg-black flex items-center justify-center">
				<div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
			</section>
		)
	}

	return (
		<div className="relative w-full bg-black">
			{/* --- HERO SECTION (STICKY) --- */}
			<section
				ref={heroRef}
				className="h-screen w-full flex items-center justify-center bg-black overflow-hidden sticky top-0 z-0"
			>
				{/* BG RADIAL GRADIENT */}
				<div
					className="absolute inset-0 overflow-hidden"
					style={{
						background:
							'radial-gradient(circle at 50% 45%, #84796a 0%, #5e5448 45%, #2e2923 100%)',
					}}
				/>

				{/* TEXTURE EFFECT (REPEATING RADIAL) */}
				<div
					className="absolute inset-0 pointer-events-none opacity-[0.8] z-0 mix-blend-overlay"
					style={{
						backgroundImage: `
							repeating-radial-gradient(
								circle at 20% 30%,
								rgba(255,255,255,0.1) 0,
								rgba(255,255,255,0.1) 1px,
								transparent 1px,
								transparent 4px
							),
							repeating-radial-gradient(
								circle at 80% 70%,
								rgba(255,255,255,0.05) 0,
								rgba(255,255,255,0.05) 1px,
								transparent 1px,
								transparent 4px
							)
						`,
						backgroundSize: '100px 100px',
					}}
				/>

				{/* HEADER ABSOLUTE INSIDE HERO */}
				<header className="absolute top-0 left-0 w-full z-20">
					<div className="flex items-center justify-between px-8 md:px-24 py-8">
						<div className="flex items-center">
							<div className="w-[120px] h-8 relative">
								<Image
									src="/images/embras-logo-w.png"
									alt="Embras"
									fill
									sizes="120px"
									className="object-contain"
								/>
							</div>
						</div>
						<nav className="hidden md:flex gap-10 items-center">
							{navItems.map((item) =>
								item.disabled ? (
									<span
										key={item.label}
										className="text-[10px] uppercase tracking-[0.3em] text-white cursor-default"
									>
										{item.label}
									</span>
								) : (
									<a
										key={item.label}
										href={item.href}
										className="text-[10px] uppercase tracking-[0.3em] text-white hover:text-white/50 transition-colors"
									>
										{item.label}
									</a>
								)
							)}
						</nav>
						<ThemeToggle />
					</div>
				</header>

				{/* CONTENT HIERARCHY - SIMPLE FLEX COLUMN */}
				<div className="relative z-20 flex flex-col items-start px-8 md:px-24 w-full pointer-events-none">
					<h1 className="text-[clamp(2.5rem,7vw,10rem)] md:text-[clamp(4rem,8.3vw,18rem)] whitespace-nowrap font-(--font-heading) leading-none tracking-tight text-[#f2e6cf] drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] pt-[19vh] ml-[-0.03em]">
						ILUMINAÇÃO <span className="text-white">PREMIUM</span>
					</h1>

					<div className="mt-8 flex flex-col items-start gap-8 max-w-[420px] pointer-events-auto">
						<p className="text-[#f2efe9]/80! font-sans text-[18px] font-light leading-relaxed">
							Iluminação projetada para espaços onde cada detalhe
							importa. Soluções exclusivas para residências,
							estúdios e ambientes de alto padrão.
						</p>
						<button className="rounded-none border border-white px-8 py-4 bg-transparent text-white hover:bg-white hover:text-black transition-all uppercase tracking-[2px] text-[11px] font-semibold backdrop-blur-sm">
							Conheça nossas linhas
						</button>
					</div>
				</div>

				{/* Chandelier Image Layer */}
				<div className="absolute right-[5%] md:right-[15%] top-[-5%] h-[85%] w-[50%] md:w-[40%] z-10 pointer-events-none">
					<Image
						src="/images/lustres-dourado.webp"
						alt="Chandeliers"
						fill
						priority
						sizes="(max-width: 768px) 50vw, 40vw"
						className="object-contain object-top"
					/>
				</div>

				{/* RIGHT SCROLL INDICATOR */}
				<div className="absolute top-1/2 -translate-y-1/2 right-8 md:right-12 z-20">
					<div className="relative w-0.5 h-[120px] flex justify-center">
						<div className="absolute inset-0 bg-[#474747]" />
						<div
							ref={lineRef}
							className="absolute top-0 w-0.5 h-[30px] bg-white z-10 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
						/>
					</div>
				</div>

				{/* TRANSITION OVERLAY */}
				<div
					ref={overlayRef}
					className="absolute inset-0 bg-[#050505] z-30 pointer-events-none opacity-0"
				/>

				{/* BOTTOM GRADIENT TEXT - EMBRAS - RESTORED TO HERO SECTION */}
				<div
					className="absolute left-0 w-full pointer-events-none select-none z-40 flex items-end justify-center overflow-hidden"
					style={{
						bottom: 0,
						height: '20vw',
					}}
				>
					<h2
						ref={embrasTextRef}
						className="text-[14vw] md:text-[14vw] font-(--font-heading) uppercase leading-none tracking-[0.05em] whitespace-nowrap text-[#F8F7F3]"
						style={{
							transform: 'translateY(18%)',
							opacity: 0, // initially hide text completely in hero before JS takes over
							WebkitMaskImage:
								'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.1) 65%, rgba(0,0,0,0.05) 70%, rgba(0,0,0,0.01) 75%, rgba(0,0,0,0.0) 80%, rgba(0,0,0,0) 90%, rgba(0,0,0,0) 100%)',
							maskImage:
								'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.1) 65%, rgba(0,0,0,0.05) 70%, rgba(0,0,0,0.01) 75%, rgba(0,0,0,0.0) 80%, rgba(0,0,0,0) 90%, rgba(0,0,0,0) 100%)',
						}}
					>
						EMBRAS
					</h2>
				</div>
			</section>

			{/* --- PRODUCT CAROUSEL SECTION --- */}
			<div
				ref={carouselTriggerRef}
				className="relative w-full z-10 overflow-hidden bg-transparent"
			>
				{/* Background is explicitly transparent so the dark Hero behind it serves as the scene */}
				<div
					ref={carouselSectionRef}
					className="h-screen flex items-start relative gap-[8vw] md:gap-[4vw] px-[10vw] w-max bg-transparent opacity-0"
				>
					<div className="shrink-0 w-[40vw] h-screen flex items-center">
						<h2 className="text-5xl md:text-7xl font-(--font-heading) uppercase leading-tight md:leading-[82px] text-white drop-shadow-md">
							Nossa <br /> Seleção <br />{' '}
							<span className="text-(--color-highlight)">
								Premium
							</span>
						</h2>
					</div>

					{products.map((product) => (
						<div
							key={product.id}
							className="w-[85vw] md:w-[28vw] shrink-0 relative h-[70vh] flex flex-col group cursor-pointer overflow-hidden border border-transparent hover:border-(--color-accent)/30"
						>
							{/* Image takes up 70vh space, fully opaque, pinned to top */}
							<Image
								src={product.image}
								alt={product.name}
								fill
								sizes="(max-width: 768px) 85vw, 28vw"
								className="object-cover transition-transform duration-700 group-hover:scale-110"
							/>
							<div className="absolute inset-0 bg-linear-to-tr from-transparent to-[#050505]/50 opacity-0 group-hover:opacity-100 transition-opacity" />

							{/* Text block positioned absolute inside the image container */}
							<div className="absolute bottom-[30px] left-[30px] flex flex-col gap-2 z-10 pointer-events-none drop-shadow-lg">
								<span className="product-category block text-xs md:text-sm tracking-[0.2em] text-white uppercase">
									{product.category}
								</span>
								<h3 className="text-2xl md:text-3xl font-(--font-heading) uppercase text-white tracking-widest leading-none">
									{product.name}
								</h3>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
