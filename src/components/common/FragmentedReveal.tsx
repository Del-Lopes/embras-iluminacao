'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'

type Props = {
	slices?: number
	className?: string
}

/**
 * Mesma entrada do FragmentedImageReveal — o bloco sobe e as fatias horizontais
 * abrem do centro, em cascata — só que sem imagem: as fatias são preenchimento
 * sólido.
 *
 * Serve de espaço reservado enquanto a foto definitiva não existe, e é o que
 * mantém a animação de pé sem depender de um arquivo.
 */
export function FragmentedReveal({ slices = 12, className = '' }: Props) {
	const containerRef = useRef<HTMLDivElement>(null)
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	useGSAP(
		() => {
			if (!mounted) return
			const container = containerRef.current
			const strips = gsap.utils.toArray('.fragment-strip')
			if (!container || !strips.length) return

			const tl = gsap.timeline({
				scrollTrigger: { trigger: container, start: 'top 85%' },
			})

			tl.fromTo(container, { y: 200 }, { y: 0, duration: 1.5, ease: 'power3.out' }, 0)
			tl.fromTo(
				strips,
				{ clipPath: 'inset(50% 0 50% 0)', opacity: 0, transformOrigin: 'center center' },
				{
					clipPath: 'inset(0% 0 0% 0)',
					opacity: 1,
					duration: 1.2,
					ease: 'power4.out',
					stagger: 0.05,
				},
				0
			)
		},
		{ scope: containerRef, dependencies: [mounted] }
	)

	return (
		<div ref={containerRef} className={`relative w-full h-full will-change-transform ${className}`}>
			{Array.from({ length: slices }).map((_, index) => (
				<div
					key={index}
					className="fragment-strip absolute left-0 w-full bg-(--color-surface)"
					style={{
						height: `${100 / slices}%`,
						top: `${index * (100 / slices)}%`,
						opacity: mounted ? undefined : 0,
					}}
				/>
			))}
		</div>
	)
}
