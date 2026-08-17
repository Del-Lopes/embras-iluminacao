'use client'

import { useRef, type ReactNode } from 'react'
import { gsap } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'

/** Lado DE ONDE a peça entra. */
export type RevealDir = 'left' | 'right' | 'top' | 'bottom'

const OFFSET: Record<RevealDir, { x: number; y: number }> = {
	left: { x: -90, y: 0 },
	right: { x: 90, y: 0 },
	top: { x: 0, y: -90 },
	bottom: { x: 0, y: 90 },
}

type Props = {
	children: ReactNode
	/** Uma direção por filho, na ordem em que aparecem no DOM. */
	directions: RevealDir[]
	className?: string
	stagger?: number
}

// Revela os filhos diretos deslizando cada um da borda que lhe corresponde,
// como peças encaixando num tabuleiro.
//
// É client component, mas recebe os filhos por `children`: o markup continua
// sendo renderizado no servidor e só o wrapper roda no navegador. Sem isso a
// seção inteira viraria client e todo o JSX dos cards iria para o bundle.
export function GridReveal({ children, directions, className = '', stagger = 0.28 }: Props) {
	const ref = useRef<HTMLDivElement>(null)

	useGSAP(
		() => {
			const el = ref.current
			if (!el) return
			const items = Array.from(el.children) as HTMLElement[]
			if (!items.length) return

			items.forEach((item, i) => {
				const dir = directions[i] ?? 'bottom'
				gsap.fromTo(
					item,
					{ ...OFFSET[dir], opacity: 0 },
					{
						x: 0,
						y: 0,
						opacity: 1,
						duration: 1.5,
						// power4.out desacelera muito no fim: a peça chega rápido e
						// "assenta" no lugar, em vez de frear por igual o caminho
						// todo. É o que dá a leitura de encaixe.
						ease: 'power4.out',
						delay: i * stagger,
						// Um gatilho por item, todos no mesmo container: assim a
						// cascata inteira dispara junto, e o delay é que escalona.
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
