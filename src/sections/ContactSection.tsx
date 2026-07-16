'use client'
import { useRef } from 'react'
import {
	AnimatedHeading,
	AnimatedPill,
} from '@/components/common/AnimatedTypography'

export default function ContactSection() {
	const sectionRef = useRef(null)

	return (
		<section
			ref={sectionRef}
			id="contato"
			className="py-36 px-8 bg-(--color-bg) relative"
		>
			<div className="max-w-7xl mx-auto flex flex-col items-center text-center gap-16 relative z-10">
				<div className="flex flex-col items-center gap-4">
					<AnimatedPill className="items-center justify-center text-(--color-muted) uppercase w-fit">
						Orçamento
					</AnimatedPill>
					<AnimatedHeading className="text-6xl md:text-8xl font-(--font-heading) uppercase leading-tight md:leading-[106px] tracking-tighter">
						Vamos <br /> iluminar seu <br />
						<span className="text-(--color-highlight)">próximo projeto.</span>
					</AnimatedHeading>
				</div>

				<div className="flex flex-col md:flex-row gap-12 mt-8">
					<div className="flex flex-col items-center md:items-start gap-4 p-12 border border-(--color-border) bg-(--color-surface)/30 backdrop-blur-md group hover:border-(--color-accent)/30 transition-all duration-500">
						<span className="text-[11px] uppercase tracking-widest text-(--color-highlight)">
							Consultoria Direta
						</span>
						<a href="tel:+5511999999999" className="text-xl font-medium hover:text-(--color-muted) transition-colors">
							+55 11 99999-9999
						</a>
					</div>
					<div className="flex flex-col items-center md:items-start gap-4 p-12 border border-(--color-border) bg-(--color-surface)/30 backdrop-blur-md group hover:border-(--color-accent)/30 transition-all duration-500">
						<span className="text-[11px] uppercase tracking-widest text-(--color-highlight)">
							Email Corporativo
						</span>
						<a href="mailto:contato@embras.com.br" className="text-xl font-medium hover:text-(--color-muted) transition-colors">
							contato@embras.com.br
						</a>
					</div>
				</div>

				<button className="mt-12 px-16 py-6 border border-(--color-accent) uppercase tracking-[2px] text-[11px] font-semibold hover:bg-(--color-accent) hover:text-(--color-bg) transition-all duration-700 cursor-pointer">
					Solicitar Proposta Individualizada
				</button>
			</div>
		</section>
	)
}
