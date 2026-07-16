'use client'
import { ReactNode, useEffect } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { usePathname } from 'next/navigation'

export default function SmoothScroll({ children }: { children: ReactNode }) {
	const pathname = usePathname()
	const isAdmin = pathname.startsWith('/admin')

	useEffect(() => {
		if (isAdmin) return

		const lenis = new Lenis({
			duration: 1.8,
			easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
			orientation: 'vertical',
			gestureOrientation: 'vertical',
			smoothWheel: true,
			wheelMultiplier: 0.8,
			touchMultiplier: 1.5,
			// Links de âncora (#projetos, #produtos…) passam a ser conduzidos pelo
			// Lenis. Sem isto o browser dá um salto seco: destoa do resto do site,
			// que é todo suave, e — pior — scroll instantâneo não alimenta o
			// ScrollTrigger (ele é atualizado pelo evento do Lenis), então a cena do
			// hero ficaria com o estado desatualizado ao pular por cima dela.
			anchors: true,
		})

		// Exposto para scroll programático suave (ex.: botão "Ver em 3D").
		;(window as unknown as { __lenis?: Lenis }).__lenis = lenis

		lenis.on('scroll', ScrollTrigger.update)

		const tickerCallback = (time: number) => {
			lenis.raf(time * 1000)
		}

		gsap.ticker.add(tickerCallback)
		gsap.ticker.lagSmoothing(0)

		return () => {
			gsap.ticker.remove(tickerCallback)
			lenis.destroy()
			;(window as unknown as { __lenis?: Lenis }).__lenis = undefined
		}
	}, [isAdmin])

	return <>{children}</>
}
