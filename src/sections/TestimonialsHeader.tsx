import {
	AnimatedHeading,
	AnimatedPill,
} from '@/components/common/AnimatedTypography'

export default function TestimonialsHeader() {
	return (
		<section className="h-auto bg-(--color-bg) pt-28 md:pt-40 pb-0 px-8 md:px-12 flex flex-col items-center justify-center text-center gap-4 max-w-7xl mx-auto w-full">
			<AnimatedPill className="items-center justify-center text-(--color-muted) uppercase w-fit">
				O que dizem de nós
			</AnimatedPill>
			<AnimatedHeading className="text-5xl md:text-7xl font-(--font-heading) uppercase leading-tight md:leading-[82px] tracking-tighter">
				Confiança construída
				<br />
				<span className="text-(--color-highlight)">em cada projeto</span>
			</AnimatedHeading>
		</section>
	)
}
