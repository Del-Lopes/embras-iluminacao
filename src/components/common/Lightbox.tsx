'use client'

import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

type Lenis = { stop: () => void; start: () => void }
const getLenis = () => (window as unknown as { __lenis?: Lenis }).__lenis

export type LightboxImage = { url: string; alt: string }

// Distância mínima, em pixels, para um arrasto contar como troca de foto.
// Abaixo disso é toque com a mão trêmula, não gesto.
const SWIPE_MIN = 50

type Props = {
	images: LightboxImage[]
	// Índice visível. Controlado por quem abre, para o lightbox e a galeria
	// nunca discordarem sobre qual foto está em cena.
	index: number
	onIndexChange: (index: number) => void
	onClose: () => void
	// Só monta o portal depois que o componente-pai montou: no SSR não existe
	// document, e o portal quebraria a renderização no servidor.
	mounted: boolean
}

function CloseIcon() {
	return (
		<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
			<path d="M6 6l12 12M18 6L6 18" />
		</svg>
	)
}

function ArrowIcon() {
	return (
		<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
			<path d="M15 6l-6 6 6 6" />
		</svg>
	)
}

/**
 * Visualizador em tela cheia. Abre sobre a página, mostra a foto no tamanho
 * que couber na janela e navega pelo mesmo conjunto do carrossel, sem fechar.
 *
 * O índice vem de fora: ao fechar, a galeria continua na foto em que a pessoa
 * parou aqui dentro, em vez de voltar para a que estava antes de abrir.
 */
export function Lightbox({ images, index, onIndexChange, onClose, mounted }: Props) {
	const total = images.length

	// Navegação circular: da última volta para a primeira. Numa tela cheia sem
	// nada em volta, um botão que simplesmente para de responder no fim parece
	// travamento.
	const go = useCallback(
		(step: 1 | -1) => {
			if (!total) return
			onIndexChange((index + step + total) % total)
		},
		[index, total, onIndexChange]
	)

	// Arrastar para o lado troca de foto no celular. Os eventos ficam no
	// overlay, e não no window: fora do lightbox o gesto continua sendo do
	// navegador, que é como a navegação de voltar/avançar do aparelho funciona.
	const touchStart = useRef<{ x: number; y: number } | null>(null)
	const swiped = useRef(false)

	const onTouchStart = (e: React.TouchEvent) => {
		const t = e.touches[0]
		touchStart.current = { x: t.clientX, y: t.clientY }
		swiped.current = false
	}

	const onTouchEnd = (e: React.TouchEvent) => {
		const start = touchStart.current
		touchStart.current = null
		if (!start || total < 2) return

		const t = e.changedTouches[0]
		const dx = t.clientX - start.x
		const dy = t.clientY - start.y

		// Horizontal de verdade: um movimento diagonal costuma ser a pessoa
		// tentando rolar a página, e trocar a foto ali seria contra a intenção.
		if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5) return

		swiped.current = true
		go(dx < 0 ? 1 : -1)
	}

	// O gesto termina com o dedo longe de onde começou, e o navegador ainda
	// dispara o clique no fundo: sem esta guarda a foto trocava e o lightbox
	// fechava no mesmo movimento.
	const handleBackdrop = () => {
		if (swiped.current) {
			swiped.current = false
			return
		}
		onClose()
	}

	// Trava a rolagem enquanto está aberto: sem isso a página corre atrás do
	// overlay a cada gesto. O Lenis controla o scroll do site, então quem para
	// é ele, e não o overflow do body.
	useEffect(() => {
		const lenis = getLenis()
		lenis?.stop()
		return () => getLenis()?.start()
	}, [])

	// Teclado: Esc fecha, setas navegam.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
			else if (e.key === 'ArrowRight') go(1)
			else if (e.key === 'ArrowLeft') go(-1)
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [go, onClose])

	if (!mounted || !total) return null

	const current = images[index] ?? images[0]

	return createPortal(
		<div
			className="lightbox"
			role="dialog"
			aria-modal="true"
			aria-label="Imagem em tela cheia"
			// Clique no fundo fecha. O stopPropagation na figura impede que um
			// clique na própria foto conte como clique no fundo.
			onClick={handleBackdrop}
			onTouchStart={onTouchStart}
			onTouchEnd={onTouchEnd}
		>
			<button type="button" className="lightbox-close" onClick={onClose} aria-label="Fechar">
				<CloseIcon />
			</button>

			{total > 1 && (
				<button
					type="button"
					className="lightbox-nav lightbox-nav--prev"
					onClick={(e) => {
						e.stopPropagation()
						go(-1)
					}}
					aria-label="Imagem anterior"
				>
					<ArrowIcon />
				</button>
			)}

			<figure className="lightbox-figure" onClick={(e) => e.stopPropagation()}>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src={current.url} alt={current.alt} className="lightbox-img" />
			</figure>

			{total > 1 && (
				<button
					type="button"
					className="lightbox-nav lightbox-nav--next"
					onClick={(e) => {
						e.stopPropagation()
						go(1)
					}}
					aria-label="Próxima imagem"
				>
					<ArrowIcon />
				</button>
			)}

			{total > 1 && (
				<div className="lightbox-counter" onClick={(e) => e.stopPropagation()}>
					{index + 1} / {total}
				</div>
			)}
		</div>,
		document.body
	)
}
