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
	direction?: Direction
	delay?: number
}

export const AnimatedParagraph: React.FC<AnimatedParagraphProps> = ({
	children,
	// 'down' preserva o comportamento antigo (entrava de cima). As declarações
	// grandes da home passam 'left' para acompanhar o AnimatedHeading, que já
	// entra da esquerda.
	direction = 'down',
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

			const fromVars: gsap.TweenVars =
				direction === 'left'
					? { xPercent: -150 }
					: direction === 'right'
						? { xPercent: 150 }
						: direction === 'up'
							? { yPercent: 150 }
							: { yPercent: -150 }

			gsap.fromTo(inners, fromVars, {
				scrollTrigger: {
					trigger: el,
					start: 'top 85%',
					toggleActions: 'play none none none',
				},
				xPercent: 0,
				yPercent: 0,
				duration: 0.8,
				delay: delay,
				ease: 'power4.out',
				stagger: 0.05,
			})

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
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	useGSAP(
		() => {
			if (!mounted || !containerRef.current || !textRef.current)
				return

			gsap.set(containerRef.current, { visibility: 'visible' })

			const computedColor =
				gsap.getProperty(textRef.current, 'color') ||
				'rgba(255, 255, 255, 0.4)'

			// Luz que varre letra a letra e volta para a cor de repouso. Token
			// próprio (e não --color-highlight) porque ela precisa contrastar
			// com o FUNDO da seção: azul sobre claro, branca sobre escuro.
			const highlightColor =
				getComputedStyle(containerRef.current)
					.getPropertyValue('--color-eyebrow-flash')
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

			return () => split.revert()
		},
		{ scope: containerRef, dependencies: [mounted] }
	)

	return (
		<div
			ref={containerRef}
			// tracking 0.18em (era 0.4em): o rótulo mantém o ar de eyebrow sem as
			// palavras se soltarem umas das outras.
			// 14px no celular e 15px a partir do tablet: em caixa alta e com esse
			// tracking, o rótulo pesa mais do que o tamanho sugere, e na largura
			// do celular ele competia com o título logo abaixo.
			className={`inline-flex flex-row items-center gap-2.5 tracking-[0.18em] not-italic text-[14px] md:text-[15px] font-medium bg-transparent border-none p-0 ${className}`}
			style={{ visibility: 'hidden' }}
			{...props}
		>
			{/* Marca da Embras. O PNG é branco com alfa, então recolorir por
			    filtro CSS seria um encadeamento frágil que nunca acerta o tom.
			    Aqui o alfa vira MÁSCARA e a cor vem do background — que lê o
			    mesmo token do texto, mantendo ícone e rótulo sempre iguais.
			    `self-center` porque as seções passam items-start/items-center
			    no className e sobrescreveriam o alinhamento do container. */}
			<span
				aria-hidden
				className="self-center shrink-0 w-4.5 h-4.5 bg-(--color-eyebrow)"
				style={{
					maskImage: 'url(/images/embras-form-w.png)',
					WebkitMaskImage: 'url(/images/embras-form-w.png)',
					maskSize: 'contain',
					WebkitMaskSize: 'contain',
					maskRepeat: 'no-repeat',
					WebkitMaskRepeat: 'no-repeat',
					maskPosition: 'center',
					WebkitMaskPosition: 'center',
				}}
			/>
			<span ref={textRef} className="block relative">
				{children}
			</span>
		</div>
	)
}
