'use client'

import { useRef, useState, useEffect, type ReactNode } from 'react'
import { gsap } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'

/**
 * Casca da seção de depoimentos: fundo + glow radial que acende ao entrar.
 *
 * É exatamente a casca da antiga TestimonialsSection (a que está no
 * origin/main) — h-screen, relative, z-10 e o glow como primeiro filho. Só o
 * conteúdo mudou: no lugar do carrossel antigo entra o novo, transparente.
 *
 * Os dois detalhes da casca que fazem o efeito funcionar, e que se perdem
 * fácil ao reescrever:
 *
 * - `h-screen`: o glow tem 60vw (864px a 1440) e a tela 900px, então ele quase
 *   preenche a seção. É daí que vem a lavada forte. Numa caixa mais alta sobra
 *   folga e só a cauda do blur chega às bordas.
 * - `z-10`: o blur de 120px se espalha ~120px além da caixa do glow, e a seção
 *   seguinte (ContactSection) é `relative` com fundo opaco. Sem z-10 os dois
 *   ficam em z:auto, a ordem de pintura vira a ordem do DOM, e a seção de baixo
 *   apaga o sangramento — deixando uma borda reta.
 */
export default function TestimonialsBackdrop({
	children,
}: {
	children: ReactNode
}) {
	const sectionRef = useRef<HTMLElement>(null)
	const glowRef = useRef<HTMLDivElement>(null)
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	useGSAP(
		() => {
			if (!mounted || !sectionRef.current || !glowRef.current) return
			gsap.set(glowRef.current, { opacity: 0 })
			gsap.to(glowRef.current, {
				opacity: 1,
				duration: 1.5,
				ease: 'power2.out',
				scrollTrigger: {
					// 'top 30%' (como no original): o topo desta seção chega a 30% da
					// tela com o título, que fica acima dela, já enquadrado — é o
					// "pouco depois do título".
					trigger: sectionRef.current,
					start: 'top 30%',
					toggleActions: 'play none none reverse',
				},
			})
		},
		{ dependencies: [mounted], scope: sectionRef }
	)

	return (
		<section
			ref={sectionRef}
			className="h-auto lg:h-screen w-full bg-(--color-bg) relative flex flex-row z-10"
		>
			{/* Background Glow Effect — a cor sai da classe testimonials-glow, que
			    muda por tema (globals.css). No dark é branco a 5% (clareia o preto);
			    no light um cinza mais forte, porque escurecer o quase-branco a 5%
			    seria imperceptível — some. GSAP anima só a opacidade deste nó. */}
			<div
				ref={glowRef}
				className="testimonials-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] blur-[120px] rounded-full pointer-events-none"
			/>
			{children}
		</section>
	)
}
