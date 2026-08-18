'use client'

import { useRef, type ReactNode } from 'react'
import { gsap } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'

type Props = {
	children: ReactNode
	className?: string
	stagger?: number
	delay?: number
}

/**
 * Entrada simples: os filhos diretos sobem alguns pixels e ganham opacidade,
 * um depois do outro.
 *
 * O deslocamento é em PIXELS, e não em porcentagem, de propósito: num
 * bloco de texto os filhos têm alturas bem diferentes (um parágrafo, um título,
 * uma lista), e uma medida relativa faria cada um percorrer uma distância
 * própria, com o conjunto entrando desalinhado.
 */
export function RiseIn({ children, className = '', stagger = 0.14, delay = 0 }: Props) {
	const ref = useRef<HTMLDivElement>(null)

	useGSAP(
		() => {
			const el = ref.current
			if (!el) return
			const items = Array.from(el.children) as HTMLElement[]
			if (!items.length) return

			gsap.fromTo(
				items,
				{ y: 80, opacity: 0 },
				{
					y: 0,
					opacity: 1,
					duration: 1,
					delay,
					stagger,
					// power2.out no lugar de power4.out: o power4 percorre quase
					// todo o caminho no primeiro terço do tempo, e o movimento
					// passa despercebido justamente onde deveria ser visto.
					ease: 'power2.out',
					scrollTrigger: {
						// 75% e não 85%: o bloco precisa entrar em cena com folga
						// abaixo da dobra, senão o começo da animação acontece
						// fora da vista e só o fim aparece.
						trigger: el,
						start: 'top 75%',
						toggleActions: 'play none none none',
					},
				}
			)
		},
		{ scope: ref }
	)

	return (
		<div ref={ref} className={className}>
			{children}
		</div>
	)
}
