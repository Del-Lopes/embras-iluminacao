'use client'

import { useRef } from 'react'
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
		<div
			ref={rootRef}
			className={`flex items-center gap-2 w-full h-full ${className}`}
		>
			{images.map((src, i) => (
				// transition-[width] e NÃO transition-all: o `all` transicionaria
				// também o transform, brigando com o `y` que o GSAP escreve a cada
				// frame na entrada. Aqui a largura é do CSS, o transform é do GSAP.
				// pointer-events só depois de entrar: em repouso os itens ficam em
				// opacity 0 E deslocados (y: -70), e opacity 0 não desliga hit-test —
				// invisíveis e fora do lugar, eles capturavam o clique de quem estava
				// atrás (o menu do hero).
				<div
					key={i}
					data-gallery-item
					className={`relative grow w-56 h-full rounded-lg overflow-hidden opacity-0 transition-[width] duration-500 ease-out hover:w-full ${
						play ? 'pointer-events-auto' : 'pointer-events-none'
					}`}
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
