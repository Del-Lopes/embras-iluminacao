'use client'
import { useEffect, useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/common/ThemeProvider'

export default function CustomCursor() {
	const pathname = usePathname()
	const isAdmin = pathname.startsWith('/admin')
	const isBlog = pathname.startsWith('/blog')
	const { theme } = useTheme()
	const isDark = theme === 'dark'
	const cursorRef = useRef<HTMLDivElement>(null)
	const glowRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (isAdmin || isBlog) return
		const cursor = cursorRef.current
		const glow = glowRef.current
		if (!cursor || !glow) return

		const colorSolid = isDark ? 'rgba(255,255,255,1)' : 'rgba(10,10,10,1)'
		const colorSemi  = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(10,10,10,0.8)'

		// Reset cursor to current theme color when theme changes
		gsap.set(cursor, { backgroundColor: colorSemi })

		const xCursor = gsap.quickTo(cursor, 'x', { duration: 0.1, ease: 'power2.out' })
		const yCursor = gsap.quickTo(cursor, 'y', { duration: 0.1, ease: 'power2.out' })
		const xGlow = gsap.quickTo(glow, 'x', { duration: 0.5, ease: 'power2.out' })
		const yGlow = gsap.quickTo(glow, 'y', { duration: 0.5, ease: 'power2.out' })

		const moveCursor = (e: MouseEvent) => {
			xCursor(e.clientX)
			yCursor(e.clientY)
			xGlow(e.clientX)
			yGlow(e.clientY)
		}

		const handleMouseEnter = () => {
			gsap.to(cursor, {
				scale: 4,
				backgroundColor: colorSolid,
				mixBlendMode: 'difference',
				duration: 0.3,
			})
			gsap.to(glow, { scale: 2, opacity: 0.5, duration: 0.3 })
		}

		const handleMouseLeave = () => {
			gsap.to(cursor, {
				scale: 1,
				backgroundColor: colorSemi,
				mixBlendMode: 'normal',
				duration: 0.3,
			})
			gsap.to(glow, { scale: 1, opacity: 0.2, duration: 0.3 })
		}

		window.addEventListener('mousemove', moveCursor)

		const interactiveElements = document.querySelectorAll('button, a, .group')
		interactiveElements.forEach((el) => {
			el.addEventListener('mouseenter', handleMouseEnter)
			el.addEventListener('mouseleave', handleMouseLeave)
		})

		return () => {
			window.removeEventListener('mousemove', moveCursor)
			interactiveElements.forEach((el) => {
				el.removeEventListener('mouseenter', handleMouseEnter)
				el.removeEventListener('mouseleave', handleMouseLeave)
			})
		}
	}, [isAdmin, isBlog, isDark])

	if (isAdmin || isBlog) return null

	return (
		<>
			<div
				ref={cursorRef}
				className="fixed top-0 left-0 w-2 h-2 bg-(--color-accent)/80 rounded-full pointer-events-none z-9999 -translate-x-1/2 -translate-y-1/2 hidden md:block"
			/>
			<div
				ref={glowRef}
				className="fixed top-0 left-0 w-12 h-12 bg-white opacity-20 blur-md rounded-full pointer-events-none z-9998 -translate-x-1/2 -translate-y-1/2 hidden md:block will-change-transform mix-blend-difference"
			/>
		</>
	)
}
