'use client'

import { useRef, type ReactNode } from 'react'
import { gsap } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'

type Props = {
	children: ReactNode
	/** Atraso em segundos. O padrão casa com o do AnimatedParagraph. */
	delay?: number
	className?: string
}

// Revela o conteúdo deslizando-o de baixo, recortado por uma máscara —
// mesmo vocabulário do AnimatedPill e do AnimatedParagraph, para elementos
// que não são texto (botões, links, blocos).
//
// Existe como componente próprio para que seções server-side possam animar
// um filho sem virarem client components inteiras.
export function AnimatedReveal({ children, delay = 0.7, className = '' }: Props) {
	const maskRef = useRef<HTMLDivElement>(null)
	const innerRef = useRef<HTMLDivElement>(null)

	useGSAP(
		() => {
			if (!maskRef.current || !innerRef.current) return

			// fromTo com immediateRender: o estado inicial entra na criação, e
			// não depois do primeiro quadro — sem isso o conteúdo pisca na
			// posição final antes de descer.
			gsap.fromTo(
				innerRef.current,
				{ yPercent: 120, opacity: 0 },
				{
					yPercent: 0,
					opacity: 1,
					duration: 0.8,
					delay,
					ease: 'power4.out',
					scrollTrigger: {
						trigger: maskRef.current,
						start: 'top 90%',
						toggleActions: 'play none none none',
					},
				}
			)
		},
		{ dependencies: [] }
	)

	// w-fit nos dois níveis: sem isso a máscara ocuparia a linha inteira e o
	// sublinhado do CTA (que é w-fit) ficaria desalinhado do texto.
	return (
		<div ref={maskRef} className={`overflow-hidden w-fit ${className}`}>
			<div ref={innerRef} className="w-fit">
				{children}
			</div>
		</div>
	)
}
