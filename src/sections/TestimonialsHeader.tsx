import {
	AnimatedHeading,
	AnimatedPill,
} from '@/components/common/AnimatedTypography'

export default function TestimonialsHeader() {
	return (
		// pb = distância até o carrossel: 50px no celular, 80px do tablet para
		// cima, o padrão de distância entre elementos.
		<section className="bg-(--color-bg) w-full max-w-site mx-auto px-6 md:px-8 lg:px-12 pt-15 md:pt-20 lg:pt-32 pb-12.5 md:pb-20">
			<div className="flex flex-col items-start gap-5">
				<AnimatedPill className="text-(--color-eyebrow) uppercase w-fit items-start">
					O que dizem de nós
				</AnimatedPill>
				<AnimatedHeading className="text-[22px] md:text-[1.75rem] font-(family-name:--font-libre) font-medium leading-[1.3] tracking-tight text-pretty md:max-w-[46ch] text-(--color-accent)">
					Quem especifica, instala e convive com a nossa iluminação
					todo dia é quem melhor sabe dizer o que ela entrega.
				</AnimatedHeading>
			</div>
		</section>
	)
}
