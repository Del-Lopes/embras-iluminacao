'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { gsap } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'
import { cn } from '@/lib/utils/cn'
import {
	AnimatedHeading,
	AnimatedPill,
} from '@/components/common/AnimatedTypography'

const productLines = [
	{
		id: 'tecnica',
		label: 'Linha Técnica',
		products: [
			{ id: 101, name: 'Frame 01', category: 'Técnica', image: '/images/product-1.png' },
			{ id: 102, name: 'Frame 02', category: 'Técnica', image: '/images/product-2.png' },
			{ id: 103, name: 'Frame 03', category: 'Técnica', image: '/images/product-1.png' },
			{ id: 104, name: 'Frame 04', category: 'Técnica', image: '/images/product-2.png' },
		],
	},
	{
		id: 'decorativa',
		label: 'Linha Decorativa',
		products: [
			{ id: 201, name: 'Lustre Orbe', category: 'Decorativa', image: '/images/product-1.png' },
			{ id: 202, name: 'Arandela Glass', category: 'Decorativa', image: '/images/product-2.png' },
			{ id: 203, name: 'Pendente Lux', category: 'Decorativa', image: '/images/product-1.png' },
			{ id: 204, name: 'Abajur Soft', category: 'Decorativa', image: '/images/product-2.png' },
		],
	},
	{
		id: 'arquitetural',
		label: 'Linha Arquitetural',
		products: [
			{ id: 301, name: 'Linear Pro', category: 'Arquitetural', image: '/images/product-1.png' },
			{ id: 302, name: 'Spot Slim', category: 'Arquitetural', image: '/images/product-2.png' },
			{ id: 303, name: 'Curve Light', category: 'Arquitetural', image: '/images/product-1.png' },
			{ id: 304, name: 'Focus Bar', category: 'Arquitetural', image: '/images/product-2.png' },
		],
	},
	{
		id: 'premium',
		label: 'Linha Premium',
		products: [
			{ id: 401, name: 'Gold Series 01', category: 'Premium', image: '/images/product-1.png' },
			{ id: 402, name: 'Platinum Arch', category: 'Premium', image: '/images/product-2.png' },
			{ id: 403, name: 'Royal Light', category: 'Premium', image: '/images/product-1.png' },
			{ id: 404, name: 'Crystal Shine', category: 'Premium', image: '/images/product-2.png' },
		],
	},
]

export default function ProductLines() {
	const [activeTab, setActiveTab] = useState(productLines[0].id)
	const [currentPage, setCurrentPage] = useState(0)
	const carouselRef = useRef<HTMLDivElement>(null)

	const currentLine =
		productLines.find((line) => line.id === activeTab) || productLines[0]

	useGSAP(() => {
		gsap.fromTo(
			'.product-card',
			{ opacity: 0, y: 20 },
			{ opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
		)
	}, [activeTab])

	return (
		<section className="py-36 px-8 bg-(--color-bg) w-full relative">
			<div className="max-w-7xl mx-auto flex flex-col items-center">
				<div className="flex flex-col items-center gap-4 mb-20 text-center">
					<AnimatedPill className="text-(--color-muted) uppercase w-fit items-center">
						Linha de Produtos
					</AnimatedPill>
					<AnimatedHeading className="text-5xl md:text-7xl font-(--font-heading) uppercase leading-tight md:leading-[82px] tracking-tighter text-(--color-primary)">
						O design <br className="md:hidden" />{' '}
						<span className="text-(--color-highlight)">vira arte</span>
					</AnimatedHeading>
				</div>

				<div className="flex flex-wrap justify-center mb-24 w-full border-b border-(--color-muted)">
					{productLines.map((line) => (
						<button
							key={line.id}
							onClick={() => { setActiveTab(line.id); setCurrentPage(0) }}
							style={{ borderRadius: 0 }}
							className={cn(
								'px-10 py-6 text-[11px] uppercase tracking-[2px] font-semibold transition-all duration-300 cursor-pointer border-b-2',
								activeTab === line.id
									? 'bg-(--color-accent) text-(--color-bg) border-(--color-accent)'
									: 'bg-transparent text-(--color-accent) border-transparent hover:text-(--color-accent)/70'
							)}
						>
							{line.label}
						</button>
					))}
				</div>

				<div className="w-full relative group">
					<div
						ref={carouselRef}
						className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 w-full"
					>
						{currentLine.products.map((product) => (
							<div key={product.id} className="product-card flex flex-col group/card">
								<div className="aspect-3/4 bg-[#0f0f0f] border border-(--color-border) mb-8 relative overflow-hidden transition-all duration-500 hover:border-white/30">
									<Image
										src={product.image}
										alt={product.name}
										fill
										sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
										className="object-cover opacity-60 group-hover/card:scale-110 group-hover/card:opacity-100 transition-all duration-700"
									/>
									<div className="absolute inset-0 bg-linear-to-tr from-transparent to-white/5 opacity-0 group-hover/card:opacity-100 transition-opacity" />
								</div>
								<span className="product-category mb-3 block text-(--color-accent)">{product.category}</span>
								<h3 className="text-xl font-(--font-heading) uppercase text-(--color-accent) tracking-widest leading-none mb-6">
									{product.name}
								</h3>
								<button
									className="flex items-center gap-3 w-fit px-6 py-3 border border-(--color-border) text-[11px] uppercase tracking-[2px] font-semibold text-(--color-accent) hover:bg-(--color-accent) hover:text-(--color-bg) transition-all group/btn"
									style={{ borderRadius: 0 }}
								>
									Ver em 3D
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover/btn:rotate-12">
										<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
										<path d="M12 12l8-4.5" />
										<path d="M12 12v9" />
										<path d="M12 12L4 7.5" />
									</svg>
								</button>
							</div>
						))}
					</div>

					<div className="hidden md:flex justify-between absolute top-1/2 -translate-y-1/2 -left-16 -right-16 pointer-events-none">
						<button className="p-4 text-(--color-accent)/40 hover:text-(--color-accent) transition-colors pointer-events-auto cursor-pointer">
							<svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1">
								<path d="M15 18l-6-6 6-6" />
							</svg>
						</button>
						<button className="p-4 text-(--color-accent)/40 hover:text-(--color-accent) transition-colors pointer-events-auto cursor-pointer">
							<svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1">
								<path d="M9 18l6-6-6-6" />
							</svg>
						</button>
					</div>
				</div>

				<div className="flex gap-4 mt-20">
					{[0, 1, 2].map((idx) => (
						<div
							key={idx}
							className={cn(
								'h-[2px] w-8 transition-colors duration-500',
								idx === currentPage ? 'bg-(--color-accent)' : 'bg-(--color-muted)'
							)}
						/>
					))}
				</div>

				<div className="mt-20">
					<button
						className="px-12 py-5 border border-(--color-accent) text-[11px] uppercase tracking-[2px] font-semibold text-(--color-accent) hover:bg-(--color-accent) hover:text-(--color-bg) transition-all duration-700 cursor-pointer"
						style={{ borderRadius: 0 }}
					>
						Ver linha completa
					</button>
				</div>
			</div>
		</section>
	)
}
