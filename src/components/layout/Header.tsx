'use client'

import Link from 'next/link'
import Image from 'next/image'
import { navItems } from '@/config/navigation'
import { cn } from '@/lib/utils/cn'
import ThemeToggle from '@/components/common/ThemeToggle'
import MobileMenu from '@/components/common/MobileMenu'

/**
 * Header único do site (mesmo design em todas as páginas): logo à esquerda, nav
 * central (desktop) e toggle de tema à direita, com menu mobile (< lg).
 *
 * A ÚNICA diferença entre páginas é a transparência/posicionamento, via
 * `variant`:
 * - `overlay` (home): absoluto SOBRE o hero, transparente, texto/logo brancos
 *   (o hero é escuro nos dois temas).
 * - `solid` (demais páginas): barra em fluxo (o conteúdo vem abaixo), com fundo
 *   e cores do tema — logo invertido para preto no tema claro.
 */
export default function Header({
	variant = 'solid',
}: {
	variant?: 'overlay' | 'solid'
}) {
	const overlay = variant === 'overlay'

	return (
		<header
			className={cn(
				'w-full z-50',
				overlay
					// Home: sobre o hero. Fundo black/20 só no mobile (< lg) — teste;
					// no desktop segue transparente.
					? 'absolute top-0 left-0 bg-black/10 lg:bg-transparent'
					: 'relative bg-(--color-bg) border-b border-(--color-border)'
			)}
		>
			<div className="flex items-center justify-between px-5 md:px-7 lg:px-12 py-6">
				{/* Logo (asset branco). No overlay fica branco; nas páginas sólidas,
				    invertido para preto quando o tema é claro. */}
				<Link
					href="/"
					aria-label="Ir para a home"
					className={cn(
						'relative block w-[120px] h-8',
						!overlay && 'in-[.light]:invert'
					)}
				>
					<Image
						src="/images/embras-logo-w.png"
						alt="Embras"
						fill
						sizes="120px"
						className="object-contain"
					/>
				</Link>

				{/* Nav inline — só desktop (lg+). No mobile/tablet quem assume é o
				    MobileMenu. Cor: branca no overlay, do tema nas sólidas. */}
				<nav className="hidden lg:flex gap-5 xl:gap-10 items-center">
					{navItems.map((item) =>
						item.disabled ? (
							<span
								key={item.label}
								className={cn(
									'text-[10px] uppercase tracking-[0.3em] cursor-default whitespace-nowrap',
									overlay ? 'text-white/70' : 'text-(--color-muted)'
								)}
							>
								{item.label}
							</span>
						) : (
							<Link
								key={item.label}
								href={item.href}
								className={cn(
									'text-[10px] uppercase tracking-[0.3em] transition-colors whitespace-nowrap',
									overlay
										? 'text-white hover:text-white/50'
										: 'text-(--color-accent) hover:text-(--color-highlight)'
								)}
							>
								{item.label}
							</Link>
						)
					)}
				</nav>

				<div className="flex items-center gap-5">
					<ThemeToggle themed={!overlay} />
					<MobileMenu barClass={overlay ? 'bg-white' : 'bg-(--color-accent)'} />
				</div>
			</div>
		</header>
	)
}
