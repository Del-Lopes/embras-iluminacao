'use client'

import { useRef, type ReactNode } from 'react'
import { gsap } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'

type Props = {
	children: ReactNode
	className?: string
	delay?: number
	duration?: number
}

// Revelação por opacidade pura, sem deslocamento.
//
// O elemento renderizado É o alvo da animação (recebe a className), e não um
// wrapper em volta: envolver um filho posicionado em absoluto mudaria o fluxo
// e quebraria o posicionamento.
//
// Só a opacidade é animada, então qualquer transform vindo do CSS (um
// translate de centralização, por exemplo) permanece intacto.
export function FadeIn({ children, className = '', delay = 0.2, duration = 1 }: Props) {
	const ref = useRef<HTMLDivElement>(null)

	useGSAP(
		() => {
			if (!ref.current) return
			gsap.fromTo(
				ref.current,
				{ opacity: 0 },
				{
					opacity: 1,
					duration,
					delay,
					// 'none' (linear) e não power2.out: um easing que desacelera
					// faz o fade chegar perto de opaco cedo demais, e o resto da
					// duração passa despercebido. Em opacidade pura, o linear é
					// o que deixa a transição visível do começo ao fim.
					ease: 'none',
					scrollTrigger: {
						trigger: ref.current,
						start: 'top 85%',
						toggleActions: 'play none none none',
					},
				}
			)
		},
		{ dependencies: [] }
	)

	return (
		<div ref={ref} className={className}>
			{children}
		</div>
	)
}
