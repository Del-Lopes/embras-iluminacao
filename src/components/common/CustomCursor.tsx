'use client'
import { useEffect, useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/common/ThemeProvider'

export default function CustomCursor() {
	const pathname = usePathname()
	const isAdmin = pathname.startsWith('/admin')
	const isBlog = pathname.startsWith('/blog')
	// Catálogo + página de produto (slug) — sem cursor customizado
	const isCatalog = pathname.startsWith('/catalogo')
	// Landing page de postes — sem cursor customizado
	const isLp = pathname.startsWith('/postes')
	const { theme } = useTheme()
	const isDark = theme === 'dark'
	const cursorRef = useRef<HTMLDivElement>(null)
	const glowRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (isAdmin || isBlog || isCatalog || isLp) return
		const cursor = cursorRef.current
		const glow = glowRef.current
		if (!cursor || !glow) return

		const colorSemi = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(10,10,10,0.8)'

		// O escuro pede MENOS opacidade que o claro, não mais: ali o brilho é
		// branco sobre fundo quase preto, o contraste é máximo e qualquer
		// excesso apaga o texto que está por baixo.
		const glowRest = isDark ? 0.07 : 0.16
		const glowHover = isDark ? 0.1 : 0.32

		// Reset cursor to current theme color when theme changes
		gsap.set(cursor, { backgroundColor: colorSemi })
		gsap.set(glow, { opacity: glowRest })

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

		// Sobre um link o ponto SAI de cena e quem marca a posição é a mãozinha
		// do sistema, que o CSS devolve só nos links. O círculo com inversão
		// que existia aqui saiu: com a mãozinha por cima, viravam dois cursores
		// disputando a mesma posição.
		const handleMouseEnter = () => {
			gsap.to(cursor, { autoAlpha: 0, duration: 0.2 })
			// Só um degrau acima do repouso: a luz sobre o link precisa avisar que
			// algo mudou, não virar outro elemento. Quem carrega a diferença é a
			// opacidade, que sobe bem mais que o tamanho.
			gsap.to(glow, { scale: 1.15, opacity: glowHover, duration: 0.3 })
		}

		const handleMouseLeave = () => {
			gsap.to(cursor, { autoAlpha: 1, duration: 0.2 })
			gsap.to(glow, { scale: 1, opacity: glowRest, duration: 0.3 })
		}

		window.addEventListener('mousemove', moveCursor)

		// Links e botões, espelhando a regra de cursor: pointer do globals.css.
		// As duas listas têm de andar juntas: esconder o ponto onde o sistema
		// não desenha nada deixaria a área sem cursor nenhum.
		const CLICKABLE = 'a, button'

		// Delegação no documento, e não um ouvinte por elemento. A varredura
		// anterior acontecia uma única vez, na montagem, então tudo que entrasse
		// no DOM depois — as setas do carrossel de depoimentos, o lightbox, o
		// menu do celular — ficava de fora e continuava exibindo a bolinha.
		let hovered: Element | null = null

		const onOver = (e: MouseEvent) => {
			const el = (e.target as Element | null)?.closest?.(CLICKABLE) ?? null
			if (!el || el === hovered) return
			hovered = el
			handleMouseEnter()
		}

		const onOut = (e: MouseEvent) => {
			if (!hovered) return
			// Sair para um filho do mesmo elemento não é sair dele: sem esta
			// checagem o ponto piscaria ao cruzar o ícone dentro do botão.
			const para = (e.relatedTarget as Element | null)?.closest?.(CLICKABLE) ?? null
			if (para === hovered) return
			hovered = null
			handleMouseLeave()
		}

		document.addEventListener('mouseover', onOver)
		document.addEventListener('mouseout', onOut)

		return () => {
			window.removeEventListener('mousemove', moveCursor)
			document.removeEventListener('mouseover', onOver)
			document.removeEventListener('mouseout', onOut)
		}
	}, [isAdmin, isBlog, isCatalog, isLp, isDark])

	if (isAdmin || isBlog || isCatalog || isLp) return null

	return (
		<>
			<div
				ref={cursorRef}
				className="fixed top-0 left-0 w-3.5 h-3.5 bg-(--color-accent)/80 rounded-full pointer-events-none z-9999 -translate-x-1/2 -translate-y-1/2 hidden md:block"
			/>
			{/* Brilho que segue o ponto com atraso, branco no escuro e laranja no
			    claro, sempre em mistura normal. O mix-blend-difference que o tema
			    escuro usava saiu: ele empurra o branco ao máximo sobre um fundo
			    quase preto, e o halo chapava as letras em vez de iluminá-las.

			    O tom é um degrau abaixo do --color-highlight (#e54621 → #c93a17):
			    desfocado e translúcido sobre fundo claro, o laranja da marca
			    clareia demais e some. */}
			<div
				ref={glowRef}
				className={`fixed top-0 left-0 w-20 h-20 blur-md rounded-full pointer-events-none z-9998 -translate-x-1/2 -translate-y-1/2 hidden md:block will-change-transform ${
					isDark ? 'bg-white' : 'bg-[#c93a17]'
				}`}
			/>
		</>
	)
}
