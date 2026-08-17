'use client'

import { useRef, type ReactNode } from 'react'
import { gsap } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'

type Props = {
	children: ReactNode
	className?: string
	stagger?: number
}

// Entrada em baralho: todos os filhos começam empilhados sob o ÚLTIMO deles e
// deslizam para a esquerda até as próprias posições, um a um.
//
// O deslocamento é MEDIDO em tempo de execução (posição do último menos a de
// cada um) em vez de fixado em pixels: ele depende da largura da coluna e do
// gap, que mudam com a viewport. Um valor cravado só funcionaria numa largura.
export function StackReveal({ children, className = '', stagger = 0.18 }: Props) {
	const ref = useRef<HTMLDivElement>(null)

	useGSAP(
		() => {
			const el = ref.current
			if (!el) return
			const items = Array.from(el.children) as HTMLElement[]
			if (items.length < 2) return

			// No mobile os cards viram uma coluna: empilhá-los na horizontal não
			// faz sentido e o deslocamento medido seria zero de qualquer forma.
			if (window.innerWidth < 768) return

			const last = items[items.length - 1]
			const lastLeft = last.getBoundingClientRect().left

			items.forEach((item, i) => {
				// z-index crescente: o último fica por cima e esconde os demais
				// enquanto estão empilhados atrás dele.
				item.style.position = 'relative'
				item.style.zIndex = String(i)

				if (item === last) return

				const dx = lastLeft - item.getBoundingClientRect().left

				gsap.fromTo(
					item,
					{ x: dx },
					{
						x: 0,
						duration: 1.1,
						ease: 'power3.out',
						// O card mais próximo do último sai primeiro, e o baralho
						// se abre de dentro para fora.
						delay: (items.length - 2 - i) * stagger,
						scrollTrigger: {
							trigger: el,
							start: 'top 80%',
							toggleActions: 'play none none none',
						},
					}
				)
			})
		},
		{ dependencies: [] }
	)

	return (
		<div ref={ref} className={className}>
			{children}
		</div>
	)
}
