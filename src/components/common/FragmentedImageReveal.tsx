'use client'

import React, { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import { gsap } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'

interface FragmentedImageRevealProps {
	src: string
	alt: string
	slices?: number
	className?: string
	imageClassName?: string
}

export default function FragmentedImageReveal({
	src,
	alt,
	slices = 12,
	className = '',
	imageClassName = '',
}: FragmentedImageRevealProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	useGSAP(
		() => {
			if (!mounted) return

			const container = containerRef.current
			const strips = gsap.utils.toArray('.fragment-strip')
			if (!strips.length || !container) return

			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: container,
					start: 'top 85%',
				},
			})

			tl.fromTo(
				container,
				{ y: 200 },
				{ y: 0, duration: 1.5, ease: 'power3.out' },
				0
			)

			tl.fromTo(
				strips,
				{
					clipPath: 'inset(50% 0 50% 0)',
					opacity: 0,
					transformOrigin: 'center center',
				},
				{
					clipPath: 'inset(0% 0 0% 0)',
					opacity: 1,
					duration: 1.2,
					ease: 'power4.out',
					stagger: 0.05,
				},
				0
			)

			tl.to(
				'.full-image-reveal',
				{ opacity: 1, duration: 0.4, ease: 'power2.inOut' },
				'-=0.4'
			)
		},
		{ scope: containerRef, dependencies: [mounted] }
	)

	return (
		<div
			ref={containerRef}
			className={`relative w-full h-full will-change-transform ${className}`}
		>
			<div
				className="full-image-reveal absolute inset-0 w-full h-full z-10 pointer-events-none"
				style={{ opacity: 0 }}
			>
				<Image
					src={src}
					alt={alt}
					fill
					className={`object-cover ${imageClassName}`}
					sizes="(max-width: 768px) 100vw, 50vw"
				/>
			</div>

			{Array.from({ length: slices }).map((_, index) => {
				const heightPercent = 100 / slices
				const topPercent = index * heightPercent

				return (
					<div
						key={index}
						className="fragment-strip absolute left-0 w-full overflow-hidden will-change-transform"
						style={{
							height: `${heightPercent}%`,
							top: `${topPercent}%`,
							opacity: mounted ? undefined : 0,
						}}
					>
						<div
							className="absolute left-0 w-full"
							style={{
								height: `${slices * 100}%`,
								top: `-${index * 100}%`,
							}}
						>
							<Image
								src={src}
								alt={alt}
								fill
								className={`object-cover ${imageClassName}`}
								sizes="(max-width: 768px) 100vw, 50vw"
								priority={index === 0}
							/>
						</div>
					</div>
				)
			})}
		</div>
	)
}
