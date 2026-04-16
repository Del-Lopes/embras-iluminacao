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
		})

		lenis.on('scroll', ScrollTrigger.update)

		const tickerCallback = (time: number) => {
			lenis.raf(time * 1000)
		}

		gsap.ticker.add(tickerCallback)
		gsap.ticker.lagSmoothing(0)

		return () => {
			gsap.ticker.remove(tickerCallback)
			lenis.destroy()
		}
	}, [isAdmin])

	return <>{children}</>
}
