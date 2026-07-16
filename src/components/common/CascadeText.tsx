'use client'

import React, {
	useMemo,
	useState,
	type ElementType,
	type CSSProperties,
} from 'react'

export interface CascadeTextProps {
	text: string
	as?: ElementType
	href?: string
	target?: string
	className?: string
	style?: CSSProperties
	fontSize?: string
	staggerDelay?: number
	duration?: number
	easing?: string
	color?: string
	hoverColor?: string
	direction?: 'up' | 'down'
	/** Marca como decorativo (duplicata de um texto que já existe no DOM). */
	ariaHidden?: boolean
	onClick?: (e: React.MouseEvent) => void
}

/**
 * Cascata por letra no hover: cada caractere desliza e é substituído por uma
 * cópia sua, pintada via `text-shadow` a 1em de distância e revelada pelo
 * overflow. O atraso escalonado por índice é o que dá o efeito de onda.
 *
 * Sem framer-motion no original — e não vale trocar as transições por GSAP:
 * `transition-delay` por índice já resolve o stagger em CSS puro, e a animação
 * é de hover (não entra no timeline de scroll).
 */
const CascadeText = React.memo(function CascadeText({
	text,
	as: Component = 'a',
	href,
	target,
	className = '',
	style,
	fontSize = '3rem',
	staggerDelay = 25,
	duration = 250,
	easing = 'ease-in-out',
	color = 'inherit',
	hoverColor = 'var(--color-highlight)',
	direction = 'up',
	ariaHidden = false,
	onClick,
}: CascadeTextProps) {
	const [hovered, setHovered] = useState(false)

	const chars = useMemo(() => {
		// Segmenter para não quebrar grafemas compostos (acentos, emoji) ao meio.
		if (typeof Intl !== 'undefined' && Intl.Segmenter) {
			const segmenter = new Intl.Segmenter('pt', { granularity: 'grapheme' })
			return Array.from(segmenter.segment(text), (s) => s.segment)
		}
		return [...text]
	}, [text])

	const sign = direction === 'up' ? 1 : -1
	const clickable = Component === 'a' || !!onClick

	// A tipografia (peso, caixa, tracking, família) NÃO fica aqui de propósito:
	// no original vinha chumbada (`font-extrabold uppercase tracking-tight`) e
	// sobrescreveria o que o chamador passa em `className` — duas utilities de
	// mesma especificidade, com a vencedora decidida pela ordem no CSS gerado,
	// não pela ordem na string. Aqui só entra o que é estrutural do efeito.
	const rootProps: Record<string, unknown> = {
		className:
			`inline-block relative overflow-hidden select-none ${clickable ? 'cursor-pointer no-underline' : ''} ${className}`.trim(),
		style: {
			fontSize,
			color: hovered ? hoverColor : color,
			transition: 'color 0.35s ease',
			padding: '0.15em 0.4em',
			lineHeight: 1,
			...style,
		},
		onMouseEnter: () => setHovered(true),
		onMouseLeave: () => setHovered(false),
		onClick,
		...(ariaHidden ? { 'aria-hidden': true } : { 'aria-label': text }),
	}

	if (Component === 'a') {
		rootProps.href = href ?? '#'
		if (target) rootProps.target = target
		if (target === '_blank') rootProps.rel = 'noopener noreferrer'
	}

	return (
		<Component {...rootProps}>
			<span
				className="inline-flex overflow-hidden relative"
				style={{ height: '1em' }}
				aria-hidden="true"
			>
				{chars.map((char, i) => (
					<span
						key={i}
						className="inline-block relative will-change-transform"
						style={{
							// A "cópia" da letra: sombra sólida a 1em, fora da janela de
							// 1em do span acima — só entra em cena quando a letra sai.
							textShadow: `0 ${sign}em currentColor`,
							transition: `transform ${duration}ms ${easing}`,
							transitionDelay: `${i * staggerDelay}ms`,
							transform: hovered
								? `translateY(${-sign}em)`
								: 'translateY(0)',
						}}
					>
						{char === ' ' ? '\u00A0' : char}
					</span>
				))}
			</span>
		</Component>
	)
})

CascadeText.displayName = 'CascadeText'

export { CascadeText }
export default CascadeText
