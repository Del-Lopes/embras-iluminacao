import Image from 'next/image'
import { AnimatedHeading, AnimatedPill } from '@/components/common/AnimatedTypography'
import { StackReveal } from '@/components/common/StackReveal'

const ITEMS = [
	{
		title: 'Fabricação sob medida',
		text: 'Cada peça nasce das condições reais do ambiente: dimensões, carga, exposição e uso. Chega pronta para instalar, sem adaptação improvisada na obra.',
		icon: (
			// Linha de cota sobre uma peça: a leitura direta de "sob medida".
			<>
				<path d="M10 9h28" />
				<path d="M10 5.5v7M38 5.5v7" />
				<path d="M14 6.5 10.5 9 14 11.5M34 6.5 37.5 9 34 11.5" />
				<rect x="10" y="18" width="28" height="20" rx="1" />
				<path d="M10 28h28" />
			</>
		),
	},
	{
		title: 'Suporte que não some',
		text: 'Especificação clara desde o orçamento, com gente disponível para tirar dúvida do dimensionamento à instalação, e também depois dela.',
		icon: (
			// Headset com haste: atendimento por gente, não por formulário.
			<>
				<path d="M10 27v-3a14 14 0 0 1 28 0v3" />
				<rect x="5" y="25" width="9" height="13" rx="3" />
				<rect x="34" y="25" width="9" height="13" rx="3" />
				<path d="M38 38v2a4 4 0 0 1-4 4h-6" />
			</>
		),
	},
	{
		title: 'Ao lado da sua equipe',
		text: 'Trabalhamos junto com engenheiros, arquitetos e instaladores, ajustando a solução às normas, ao orçamento e ao cronograma de cada obra.',
		icon: (
			// Duas figuras lado a lado, a segunda um passo atrás: a equipe do
			// cliente e a nossa trabalhando no mesmo projeto.
			<>
				<circle cx="19" cy="17" r="6" />
				<path d="M9 40v-3a10 10 0 0 1 20 0v3" />
				<circle cx="34" cy="19" r="5" />
				<path d="M33 30a8 8 0 0 1 8 7.5V40" />
			</>
		),
	},
]

export default function WhyUs() {
	return (
		<section className="relative w-full overflow-hidden bg-(--color-bg) py-15 md:py-20 lg:py-32">
			{/* Bloco de imagem à direita, sangrando até a borda da tela. Some no
			    mobile: ali os cards ocupam a largura toda e a foto atrás só
			    atrapalharia a leitura.

			    top-32 espelha o py-32 da seção, alinhando o começo da imagem com
			    o rótulo à esquerda (que também parte depois do padding).

			    bottom-16 é menor de propósito: os cards terminam na linha do
			    padding (128px), então uma imagem simétrica fecharia rente a
			    eles. Os 64px a menos deixam a foto descer além dos cards, e é
			    essa sobra que dá o descolamento. */}
			<div className="hidden lg:block absolute right-0 top-32 bottom-16 w-[52%]">
				<Image
					src="/images/hero.png"
					alt=""
					aria-hidden
					fill
					sizes="52vw"
					className="object-cover"
				/>
				{/* Véu azul: a foto é só textura de fundo — sem ele os cards
				    brancos por cima perderiam o contorno contra as áreas claras. */}
				<div className="absolute inset-0 bg-(--color-brand-blue)/85" />
			</div>

			<div className="relative max-w-site mx-auto w-full px-6 md:px-8 lg:px-12">
				{/* Cabeçalho — contido em ~50% para não invadir a área da foto. */}
				<div className="flex flex-col items-start gap-5 lg:max-w-[46%]">
					<AnimatedPill className="text-(--color-eyebrow) uppercase w-fit items-start">
						Por que nós
					</AnimatedPill>
					{/* Mesma tipografia das declarações das outras seções: Libre,
					    1.75rem, entrelinha 1.2, medida de 46ch e text-pretty.
					    AnimatedHeading (e não AnimatedParagraph) para manter a
					    semântica de título — a entrada pela esquerda é a mesma. */}
					<AnimatedHeading className="text-[22px] md:text-[1.75rem] font-(family-name:--font-libre) font-medium leading-[1.3] tracking-tight text-pretty md:max-w-[46ch] text-(--color-accent)">
						Nossas soluções são feitas sob medida para o tamanho do
						seu projeto, com precisão técnica e qualidade impecável
					</AnimatedHeading>
				</div>

				{/* Cards — atravessam por cima do bloco de imagem, que é o efeito
				    de sobreposição da referência. */}
				<StackReveal className="mt-12.5 md:mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
					{ITEMS.map((item) => (
						<article
							key={item.title}
							className="bg-(--color-bg) border border-(--color-divider) p-8 lg:p-10 flex flex-col gap-3.75"
						>
							<svg
								aria-hidden
								viewBox="0 0 48 48"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="w-12 h-12 text-(--color-highlight)"
							>
								{item.icon}
							</svg>

							<h3 className="font-(family-name:--font-libre) font-medium text-lg lg:text-xl tracking-tight text-(--color-accent)">
								{item.title}
							</h3>

							<p className="text-[15px] leading-relaxed text-(--color-muted)!">
								{item.text}
							</p>
						</article>
					))}
				</StackReveal>
			</div>
		</section>
	)
}
