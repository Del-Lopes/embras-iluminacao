'use client'

import React, { useRef, useState, useEffect } from 'react'
import { gsap, ScrollTrigger, SplitText } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'

function createMaskedLines(el: HTMLElement): {
	split: InstanceType<typeof SplitText>
	inners: HTMLElement[]
} {
	const split = new SplitText(el, {
		type: 'lines',
		linesClass: 'split-line',
	})

	const inners: HTMLElement[] = []

	split.lines.forEach((lineEl: Element) => {
		const line = lineEl as HTMLElement
		const inner = document.createElement('div')
		inner.style.display = 'block'
		inner.style.width = '100%'

		while (line.firstChild) {
			inner.appendChild(line.firstChild)
		}
		line.appendChild(inner)

		line.style.overflow = 'hidden'
		line.style.display = 'block'
		line.style.position = 'relative'

		inners.push(inner)
	})

	return { split, inners }
}

export type Direction = 'left' | 'right' | 'up' | 'down'

export interface AnimatedHeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
	children: React.ReactNode
	direction?: Direction
	as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
	delay?: number
}

export const AnimatedHeading: React.FC<AnimatedHeadingProps> = ({
	children,
	direction = 'left',
	as: Component = 'h2',
	className = '',
	delay = 0.5,
	...props
}) => {
	const containerRef = useRef<HTMLHeadingElement>(null)
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	useGSAP(
		() => {
			if (!mounted || !containerRef.current) return

			const el = containerRef.current
			const { split, inners } = createMaskedLines(el)

			if (!inners.length) return

			let fromVars: gsap.TweenVars = {}
			switch (direction) {
				case 'left':
					fromVars = { xPercent: -150 }
					break
				case 'right':
					fromVars = { xPercent: 150 }
					break
				case 'up':
					fromVars = { yPercent: 150 }
					break
				case 'down':
					fromVars = { yPercent: -150 }
					break
			}

			gsap.fromTo(inners, fromVars, {
				scrollTrigger: {
					trigger: el,
					start: 'top 85%',
					toggleActions: 'play none none none',
				},
				xPercent: 0,
				yPercent: 0,
				duration: 1.2,
				delay: delay,
				ease: 'power4.out',
				stagger: 0.15,
			})

			return () => {
				split.revert()
			}
		},
		{ scope: containerRef, dependencies: [mounted] }
	)

	return (
		<Component ref={containerRef} className={className} {...props}>
			{children}
		</Component>
	)
}

export interface AnimatedParagraphProps extends React.HTMLAttributes<HTMLParagraphElement> {
	children: React.ReactNode
	delay?: number
}

export const AnimatedParagraph: React.FC<AnimatedParagraphProps> = ({
	children,
	className = '',
	delay = 0.7,
	...props
}) => {
	const containerRef = useRef<HTMLParagraphElement>(null)
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	useGSAP(
		() => {
			if (!mounted || !containerRef.current) return

			const el = containerRef.current
			const { split, inners } = createMaskedLines(el)

			if (!inners.length) return

			gsap.fromTo(
				inners,
				{ yPercent: -150 },
				{
					scrollTrigger: {
						trigger: el,
						start: 'top 85%',
						toggleActions: 'play none none none',
					},
					yPercent: 0,
					duration: 0.8,
					delay: delay,
					ease: 'power4.out',
					stagger: 0.05,
				}
			)

			return () => {
				split.revert()
			}
		},
		{ scope: containerRef, dependencies: [mounted] }
	)

	return (
		<p ref={containerRef} className={className} {...props}>
			{children}
		</p>
	)
}

export interface AnimatedPillProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode
}

export const AnimatedPill: React.FC<AnimatedPillProps> = ({
	children,
	className = '',
	...props
}) => {
	const containerRef = useRef<HTMLDivElement>(null)
	const textRef = useRef<HTMLSpanElement>(null)
	const lineRef = useRef<HTMLDivElement>(null)
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	useGSAP(
		() => {
			if (
				!mounted ||
				!containerRef.current ||
				!textRef.current ||
				!lineRef.current
			)
				return

			gsap.set(containerRef.current, { visibility: 'visible' })

			const computedColor =
				gsap.getProperty(textRef.current, 'color') ||
				'rgba(255, 255, 255, 0.4)'

			// Flash para a cor do texto do tema (branco no dark, preto no light)
			const highlightColor =
				getComputedStyle(containerRef.current)
					.getPropertyValue('--color-accent')
					.trim() || '#ffffff'

			const split = new SplitText(textRef.current, { type: 'chars' })

			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: containerRef.current,
					start: 'top 85%',
					toggleActions: 'play none none none',
				},
			})

			tl.to(split.chars, {
				keyframes: [
					{ color: highlightColor, duration: 0.15 },
					{ color: computedColor, duration: 0.45 },
				],
				stagger: 0.08,
				ease: 'power2.inOut',
			})

			tl.fromTo(
				lineRef.current,
				{ xPercent: 102 },
				{
					xPercent: -105,
					duration: 1.0,
					ease: 'power2.inOut',
				},
				'-=0.4'
			)

			return () => split.revert()
		},
		{ scope: containerRef, dependencies: [mounted] }
	)

	return (
		<div
			ref={containerRef}
			className={`inline-flex flex-col tracking-[0.4em] not-italic text-[14px] font-medium bg-transparent border-none p-0 ${className}`}
			style={{ visibility: 'hidden' }}
			{...props}
		>
			<span ref={textRef} className="block relative">
				{children}
			</span>
			<div className="relative mt-[8px] h-px w-[40%] overflow-hidden bg-[color-mix(in_srgb,var(--color-accent)_20%,transparent)]">
				<div
					ref={lineRef}
					className="absolute inset-0 h-full w-full bg-(--color-accent) will-change-transform"
				/>
			</div>
		</div>
	)
}
