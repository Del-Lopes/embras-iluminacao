import Link from 'next/link'
import FragmentedImageReveal from '@/components/common/FragmentedImageReveal'
import { FadeIn } from '@/components/common/FadeIn'
import {
	AnimatedHeading,
	AnimatedParagraph,
	AnimatedPill,
} from '@/components/common/AnimatedTypography'

export default function WhoWeAre() {
	return (
		<section
			id="quem-somos"
			className="relative w-full overflow-hidden bg-(--color-bg) py-15 md:py-20 lg:py-32"
		>
			{/* PROVISÓRIO: marca d'água de fundo. Entra o logo quando houver
			    arquivo em tamanho adequado; até lá, as três letras. Fica atrás de
			    tudo e não recebe eventos nem leitura de tela. */}
			<span
				aria-hidden
				className="pointer-events-none select-none absolute right-[-2%] top-1/2 -translate-y-1/2 font-(family-name:--font-libre) font-bold leading-none tracking-tighter text-[38vw] lg:text-[26vw] text-(--color-accent)/5"
			>
				EBR
			</span>

			<div className="relative max-w-site mx-auto w-full px-6 md:px-8 lg:px-12">
				{/* O container é relativo para o card poder se ancorar sobre a
				    imagem no desktop. No mobile os dois empilham no fluxo normal. */}
				<div className="relative">
					<div className="w-full lg:w-[62%] aspect-4/3 lg:aspect-auto lg:h-140 overflow-hidden">
						<FragmentedImageReveal
							src="/images/case-1.png"
							alt="Fábrica da Embras Iluminação"
							slices={12}
							className="w-full h-full"
						/>
					</div>

					{/* Card sobreposto. 62% + 46% passa de 100%, e é essa soma que
					    produz a sobreposição sobre a imagem. O filete laranja no
					    topo repete o acento da referência. */}
					{/* top-1/2 + -translate-y-1/2 centraliza pela ALTURA do card,
					    qualquer que ela seja. O container pai tem a altura da
					    imagem, então o centro dele é o centro dela. Com um valor
					    fixo (top-24) o alinhamento quebrava a cada mudança de
					    texto, porque o card cresce e a imagem não. */}
					<FadeIn className="relative lg:absolute lg:right-0 lg:top-1/2 lg:-translate-y-1/2 lg:w-[46%] -mt-10 lg:mt-0 mx-4 lg:mx-0 bg-(--color-bg) border-t-2 border-t-(--color-highlight) shadow-[0_20px_60px_rgba(0,0,0,0.10)] p-8 lg:p-10 flex flex-col gap-5">
						<AnimatedPill className="text-(--color-eyebrow) uppercase w-fit items-start">
							Quem somos
						</AnimatedPill>

						<AnimatedHeading className="text-[22px] md:text-[1.75rem] font-(family-name:--font-libre) font-medium leading-[1.3] tracking-tight text-(--color-accent)">
							Conheça mais sobre a Embras Iluminação
						</AnimatedHeading>

						<div className="flex flex-col gap-4">
							<AnimatedParagraph className="text-[15px] leading-relaxed text-(--color-muted)!">
								Somos uma indústria brasileira de iluminação, com
								fabricação própria de postes, luminárias LED e
								soluções para residências, empresas e espaços
								públicos.
							</AnimatedParagraph>
							<AnimatedParagraph className="text-[15px] leading-relaxed text-(--color-muted)!">
								São mais de 20 anos desenvolvendo produtos que unem
								desempenho e acabamento, do produto de linha ao
								projeto sob medida, atendendo obras em todo o
								território nacional.
							</AnimatedParagraph>
						</div>

						{/* Mesmo CTA da seção de números, com o filete embaixo. */}
						<Link
							href="/catalogo"
							className="group mt-2 w-fit border-b border-(--color-border) pb-2 flex items-center gap-3 text-base font-semibold text-(--color-brand-blue) hover:border-(--color-highlight) transition-colors"
						>
							Conheça nossa história
							<span
								aria-hidden
								className="text-(--color-highlight) text-xl leading-none transition-transform duration-300 group-hover:translate-x-1"
							>
								→
							</span>
						</Link>
					</FadeIn>
				</div>
			</div>
		</section>
	)
}
