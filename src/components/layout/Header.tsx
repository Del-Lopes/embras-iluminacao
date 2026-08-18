'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { navItems } from '@/config/navigation'
import { cn } from '@/lib/utils/cn'
import ThemeToggle from '@/components/common/ThemeToggle'
import MobileMenu from '@/components/common/MobileMenu'

// A barra fixa entra depois de percorrer 80% da altura da janela.
const STICKY_AT = 0.8
// Altura de referência da barra: é a faixa do topo que uma seção precisa
// cobrir para pedir o recolhimento.
const HIDE_BAND = 80
// Folga, em telas, para a barra voltar um instante antes de a seção terminar.
const RELEASE_SLACK = 0.05
// Sem pin: fração da tela que a seção ainda precisa ocupar para segurar a barra.
const COVER_MIN = 0.5

/**
 * Conteúdo da barra: logo, nav e controles.
 *
 * `onDark` significa "sobre fundo escuro": vale para o hero da home e para a
 * barra fixa de vidro, onde texto e logo são sempre brancos, independentemente
 * do tema. Nas páginas com a barra em fluxo, as cores vêm do tema.
 */
function HeaderInner({ onDark }: { onDark: boolean }) {
	return (
		<div className="flex items-center justify-between px-5 md:px-7 lg:px-12 py-6">
			{/* Logo (asset branco). Sobre fundo escuro fica branco; nas páginas
			    sólidas, invertido para preto quando o tema é claro. */}
			<Link
				href="/"
				aria-label="Ir para a home"
				className={cn('relative block w-[120px] h-8', !onDark && 'in-[.light]:invert')}
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
			    MobileMenu. */}
			<nav className="hidden lg:flex gap-5 xl:gap-10 items-center">
				{navItems.map((item) =>
					item.disabled ? (
						<span
							key={item.label}
							className={cn(
								'text-[10px] uppercase tracking-[0.3em] cursor-default whitespace-nowrap',
								onDark ? 'text-white/70' : 'text-(--color-muted)'
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
								// O laranja vale nas duas variantes: sobre foto, um hover em
								// branco a 50% some em vez de destacar.
								onDark
									? 'text-white hover:text-(--color-highlight)'
									: 'text-(--color-accent) hover:text-(--color-highlight)'
							)}
						>
							{item.label}
						</Link>
					)
				)}
			</nav>

			<div className="flex items-center gap-5">
				<ThemeToggle />
				<MobileMenu barClass={onDark ? 'bg-white' : 'bg-(--color-accent)'} />
			</div>
		</div>
	)
}

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
 *
 * Passados 80% da altura da janela, uma SEGUNDA barra entra fixa no topo, em
 * vidro escuro. Ela é um elemento à parte, e não a mesma barra virando fixa:
 * assim a original continua rolando com a página e nada salta de lugar quando o
 * modo troca, que é o que aconteceria ao tirá-la do fluxo no meio da rolagem.
 */
export default function Header({
	variant = 'solid',
}: {
	variant?: 'overlay' | 'solid'
}) {
	const overlay = variant === 'overlay'
	const [stuck, setStuck] = useState(false)

	useEffect(() => {
		// Seções que pedem a barra recolhida (hoje o Manifesto, que ocupa a tela
		// inteira). Enquanto uma delas cobre o topo, a barra não entra — mas ela
		// volta perto do fim, quando a seção já foi percorrida.
		const isBlocked = () => {
			const el = document.querySelector('[data-hide-sticky-header]')
			if (!el) return false

			const vh = window.innerHeight
			// Com pin, o ScrollTrigger envolve a seção num pin-spacer, e é ELE que
			// cresce e se move enquanto a seção fica parada na tela. A seção em si
			// não sai do lugar, então medi-la direto não diria nada.
			const spacer = el.closest('.pin-spacer')

			if (spacer) {
				const rect = spacer.getBoundingClientRect()
				if (rect.top >= HIDE_BAND || rect.bottom <= 0) return false
				// O que falta rolar até o fim do trecho preso. Só zera quando o
				// último slide acabou de ser lido e a seção começa a sair.
				//
				// Medir pelo percurso já rolado não servia: os três slides não
				// ocupam fatias iguais do pin, e o terceiro entra por volta de 80%,
				// então qualquer fração razoável soltava a barra no meio dele.
				return rect.bottom - vh > vh * RELEASE_SLACK
			}

			// Sem pin (tablet e celular, onde os slides passam por swipe): a seção
			// fica parada ocupando a tela e nada "progride" com a rolagem, então o
			// critério é quanto dela ainda está à vista.
			const rect = el.getBoundingClientRect()
			return rect.top < HIDE_BAND && rect.bottom > vh * COVER_MIN
		}

		const onScroll = () =>
			setStuck(window.scrollY > window.innerHeight * STICKY_AT && !isBlocked())
		// Avalia já na montagem: a página pode carregar com a rolagem restaurada
		// pelo navegador, e aí a barra precisa nascer visível.
		onScroll()
		window.addEventListener('scroll', onScroll, { passive: true })
		window.addEventListener('resize', onScroll)
		return () => {
			window.removeEventListener('scroll', onScroll)
			window.removeEventListener('resize', onScroll)
		}
	}, [])

	return (
		<>
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
				<HeaderInner onDark={overlay} />
			</header>

			{/* Barra fixa de vidro. Fora de vista ela some do fluxo de foco e não
			    intercepta cliques (pointer-events pelo CSS). */}
			<div
				className={cn('site-header-sticky', stuck && 'is-visible')}
				aria-hidden={!stuck}
			>
				<HeaderInner onDark />
			</div>
		</>
	)
}
