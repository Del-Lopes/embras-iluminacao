'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { navItems } from '@/config/navigation'
import { cn } from '@/lib/utils/cn'

type Lenis = {
	stop: () => void
	start: () => void
	scrollTo: (t: string | number, o?: { duration?: number }) => void
}
const getLenis = () =>
	(window as unknown as { __lenis?: Lenis }).__lenis

/**
 * Menu mobile/tablet (< lg) do header da home: botão hambúrguer + overlay
 * fullscreen com os links grandes. No desktop (lg+) o nav inline do header
 * assume, e este fica escondido.
 */
export default function MobileMenu({
	// Cor das barras do hambúrguer: branco sobre o hero (overlay), theme-aware
	// (--color-accent) sobre o header sólido das demais páginas.
	barClass = 'bg-white',
}: {
	barClass?: string
}) {
	const [open, setOpen] = useState(false)
	// Portal só após montar (document não existe no SSR).
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])

	// Trava o scroll do Lenis enquanto o menu está aberto (senão um swipe no
	// overlay rolaria a página atrás). Reinicia ao fechar/desmontar.
	useEffect(() => {
		const lenis = getLenis()
		if (open) lenis?.stop()
		else lenis?.start()
		return () => getLenis()?.start()
	}, [open])

	// Fecha no Esc.
	useEffect(() => {
		if (!open) return
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [open])

	// Clique num link: fecha e navega. Para âncoras (/#secao) o Lenis está
	// parado, então faço o scroll suave à mão depois de reativá-lo; rotas
	// (/catalogo, /blog) seguem no Link normalmente.
	const handleClick =
		(href: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
			setOpen(false)
			const lenis = getLenis()
			lenis?.start()
			const hash = href.includes('#') ? href.split('#')[1] : ''
			if (hash) {
				e.preventDefault()
				requestAnimationFrame(() =>
					lenis?.scrollTo('#' + hash, { duration: 1.2 })
				)
			}
		}

	return (
		<>
			{/* Hambúrguer — só < lg. */}
			<button
				onClick={() => setOpen(true)}
				className="lg:hidden flex flex-col justify-center gap-[6px] w-8 h-8 cursor-pointer"
				aria-label="Abrir menu"
				aria-expanded={open}
			>
				<span className={cn('block w-6 h-px', barClass)} />
				<span className={cn('block w-6 h-px', barClass)} />
				<span className={cn('block w-6 h-px', barClass)} />
			</button>

			{/* Overlay via PORTAL no body: dentro do header (z-20) ele ficaria preso
			    naquele contexto de empilhamento e o texto EMBRAS (z-40) pintaria por
			    cima. No body, o z-200 vale no nível da página e cobre tudo.
			    theme-aware, fade + leve slide. */}
			{mounted &&
				createPortal(
					<div
						className={cn(
							'fixed inset-0 z-200 bg-(--color-bg) flex flex-col items-center justify-center gap-8 transition-all duration-500 lg:hidden',
							open
								? 'opacity-100 translate-y-0'
								: 'opacity-0 -translate-y-4 pointer-events-none'
						)}
					>
						<button
							onClick={() => setOpen(false)}
							className="absolute top-8 right-8 text-[11px] uppercase tracking-[0.3em] text-(--color-accent)"
							aria-label="Fechar menu"
						>
							Fechar
						</button>

						{navItems.map((item) =>
							item.disabled ? (
								<span
									key={item.label}
									className="text-3xl font-(--font-heading) uppercase tracking-tight text-(--color-muted) cursor-default"
								>
									{item.label}
								</span>
							) : (
								<Link
									key={item.label}
									href={item.href}
									onClick={handleClick(item.href)}
									className="text-3xl font-(--font-heading) uppercase tracking-tight text-(--color-accent) hover:text-(--color-highlight) transition-colors"
								>
									{item.label}
								</Link>
							)
						)}
					</div>,
					document.body
				)}
		</>
	)
}
