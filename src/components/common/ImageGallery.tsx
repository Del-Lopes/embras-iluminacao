'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import { gsap } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'

type ImageGalleryProps = {
	images: string[]
	/** Dispara a entrada (translate de cima para baixo, com stagger). */
	play?: boolean
	className?: string
}

export default function ImageGallery({
	images,
	play = true,
	className = '',
}: ImageGalleryProps) {
	const rootRef = useRef<HTMLDivElement>(null)
	const tlRef = useRef<gsap.core.Timeline | null>(null)
	// Índice expandido por CLIQUE (mobile não tem hover). No desktop o hover
	// continua expandindo via CSS; o clique é aditivo e funciona nos dois.
	const [expanded, setExpanded] = useState<number | null>(null)

	// Clique/toque FORA da galeria volta ao idle (colapsa). Só escuta enquanto há
	// algo expandido. pointerdown (não click) para cobrir toque no mobile/tablet;
	// dispara antes do onClick do item, mas o teste `contains` protege o toque
	// dentro da galeria de resetar (só reseta quando o alvo está de fato fora).
	useEffect(() => {
		if (expanded === null) return
		const onDown = (e: PointerEvent) => {
			if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
				setExpanded(null)
			}
		}
		document.addEventListener('pointerdown', onDown)
		return () => document.removeEventListener('pointerdown', onDown)
	}, [expanded])

	// Constrói UMA timeline pausada na montagem (sem depender de `play`): estado
	// inicial escondido → entrada com stagger. Não recria a cada toggle.
	useGSAP(
		() => {
			const items = rootRef.current?.querySelectorAll('[data-gallery-item]')
			if (!items?.length) return
			gsap.set(items, { opacity: 0, y: -70 })
			tlRef.current = gsap
				.timeline({ paused: true })
				.to(items, {
					opacity: 1,
					y: 0,
					duration: 0.9,
					ease: 'power3.out',
					stagger: 0.08,
				})
		},
		{ scope: rootRef }
	)

	// play/reverse na MESMA timeline. Diferente de criar um gsap.to a cada toggle:
	// play() e reverse() sobre uma timeline única são idempotentes e stateful —
	// um vai-e-volta rápido de scroll só move a cabeça dela, sem tweens órfãos que
	// sobrevivam e reacendam a galeria já de volta no hero (o bug relatado).
	//
	// timeScale por direção: a ENTRADA é lenta e elegante (1x, ~1,2s com o
	// stagger), mas a SAÍDA precisa ser rápida (4x, ~0,3s). Como a galeria é
	// sticky, uma saída lenta fica arrastando sobre o hero enquanto o usuário já
	// rolou de volta — o "rastro". Rápida, ela sai do caminho na hora.
	useGSAP(
		() => {
			const tl = tlRef.current
			if (!tl) return
			if (play) {
				tl.timeScale(1)
				tl.play()
			} else {
				tl.timeScale(4)
				tl.reverse()
			}
		},
		{ dependencies: [play] }
	)

	return (
		// DOIS MODOS por breakpoint:
		// • Mobile (< md): carrossel de swipe horizontal — overflow-x-auto + snap,
		//   sem scrollbar visível. Mantém as 5 imagens; arrasta pro lado pra ver
		//   mais. pointer-events-auto (com play) para o container receber o toque
		//   do arrasto.
		// • md+ (tablet/desktop): o acordeão flex-grow de sempre (overflow visível,
		//   sem snap).
		<div
			ref={rootRef}
			className={`flex items-center gap-2 w-full h-full snap-x snap-mandatory md:snap-none overflow-x-auto md:overflow-x-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
				play ? 'pointer-events-auto' : 'pointer-events-none'
			} ${className}`}
		>
			{images.map((src, i) => (
				// Mobile: largura fixa (70vw), shrink-0 e snap-center — os cards
				// transbordam o container e viram um trilho arrastável; o card
				// seguinte "espia" na borda, sinalizando que dá pra deslizar.
				// md+: acordeão FLEX-GROW — basis-0 (todos partem iguais), grow (1) /
				// grow-16 no ativo (~80%, espreme os demais), min-w-10 dá piso de 40px
				// aos espremidos. transition só de flex-grow (não briga com o y/opacity
				// da entrada do GSAP). hover:grow-16 no desktop; clique no
				// tablet/desktop (o mobile é só swipe — ver onClick).
				<div
					key={i}
					data-gallery-item
					onClick={() => {
						// Expandir só no modo acordeão (md+). No mobile o clique não faz
						// nada — a interação lá é o swipe do carrossel.
						if (window.matchMedia('(min-width: 768px)').matches) {
							setExpanded((prev) => (prev === i ? null : i))
						}
					}}
					className={`relative h-full shrink-0 w-[70vw] snap-center rounded-lg overflow-hidden opacity-0 cursor-pointer md:w-auto md:shrink md:basis-0 md:min-w-10 md:transition-[flex-grow] md:duration-500 md:ease-out md:hover:grow-16 ${
						expanded === i ? 'md:grow-16' : 'md:grow'
					} ${play ? 'pointer-events-auto' : 'pointer-events-none'}`}
				>
					<Image
						src={src}
						alt=""
						fill
						sizes="(max-width: 768px) 60vw, 40vw"
						className="object-cover object-center select-none"
						draggable={false}
					/>
				</div>
			))}
		</div>
	)
}
