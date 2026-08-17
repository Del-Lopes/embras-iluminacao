'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'

type Props = {
	/** Valor final já formatado em pt-BR, ex.: "2.500" ou "20". */
	value: string
	className?: string
	duration?: number
}

// Aceita o número no formato de exibição ("2.500") e devolve 2500.
// Parsear a partir do texto — em vez de pedir number e formatar depois —
// mantém uma única fonte para o valor: o que está escrito é o que anima.
const parse = (formatted: string): number =>
	Number(formatted.replace(/\./g, '').replace(',', '.'))

export function CountUp({ value, className, duration = 2 }: Props) {
	const ref = useRef<HTMLSpanElement>(null)
	const [mounted, setMounted] = useState(false)

	useEffect(() => setMounted(true), [])

	useGSAP(
		() => {
			const el = ref.current
			const target = parse(value)
			// Valor não numérico cai fora e o texto do SSR permanece — melhor
			// mostrar o número certo parado do que zerá-lo e nunca contar.
			if (!mounted || !el || !Number.isFinite(target)) return

			// Zera antes de armar o gatilho. Sem isto o SSR mostra o número final
			// e ele "pula" para 0 no instante em que a contagem começa.
			el.textContent = '0'

			const counter = { n: 0 }
			gsap.to(counter, {
				n: target,
				duration,
				ease: 'power2.out',
				scrollTrigger: {
					trigger: el,
					start: 'top 90%',
					toggleActions: 'play none none none',
				},
				onUpdate: () => {
					el.textContent = Math.round(counter.n).toLocaleString('pt-BR')
				},
				// Garante o valor exato no fim: o arredondamento do último quadro
				// pode parar em 2.499.
				onComplete: () => {
					el.textContent = value
				},
			})
		},
		{ dependencies: [mounted, value] }
	)

	// O SSR entrega o número final: sem JS, ou antes da hidratação, o dado
	// correto já está na tela e legível por buscadores.
	return (
		<span ref={ref} className={className}>
			{value}
		</span>
	)
}
