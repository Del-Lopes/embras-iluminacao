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

	useGSAP(
		() => {
			const items = rootRef.current?.querySelectorAll('[data-gallery-item]')
			if (!items?.length) return
			if (play) {
				gsap.to(items, {
					opacity: 1,
					y: 0,
					duration: 0.9,
					ease: 'power3.out',
					stagger: 0.08,
					overwrite: 'auto',
				})
			} else {
				gsap.set(items, { opacity: 0, y: -70 })
			}
		},
		{ dependencies: [play], scope: rootRef }
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
