import Link from 'next/link'
import { AnimatedPill, AnimatedParagraph } from '@/components/common/AnimatedTypography'
import { CountUp } from '@/components/common/CountUp'
import { AnimatedReveal } from '@/components/common/AnimatedReveal'
import { IronArtVideo } from '@/components/common/IronArtVideo'
import { ShutterText } from '@/components/common/ShutterText'

// Seção institucional de números, logo abaixo do hero.
// Layout de duas colunas: à esquerda a declaração + CTA + ilustração;
// à direita a pilha de indicadores separada por filetes.

type Stat = {
	// Separados porque cada parte tem cor própria: o "+" e o sufixo saem na
	// cor de destaque, e só o número fica na cor de texto forte.
	value: string
	suffix?: string
	caption: string
}

const STATS: Stat[] = [
	{
		value: '2.500',
		suffix: 'm²',
		caption: 'De área de fábrica moderna, localizada em Embu Guaçu.',
	},
	{
		value: '10',
		suffix: 'mil',
		caption:
			'Clientes atendidos, incluindo grandes realities da televisão brasileira.',
	},
	{
		value: '20',
		suffix: 'anos',
		caption: 'De experiência com conhecimento técnico e excelência em atendimento.',
	},
]

export default function CompanyStats() {
	return (
		<section className="bg-(--color-bg) w-full py-15 md:py-20 lg:py-32">
			{/* Wrapper próprio, FORA do container de 1366px do resto da seção: aqui
			    o teto é 1280, sem padding lateral no desktop.

			    Só desktop: a palavra ocupa a largura toda e, no tablet e no
			    celular, roubaria a abertura da seção em vez de apresentá-la.
			    Escondida por display, e não por opacidade, para não deixar a
			    altura reservada nem a animação rodando fora de vista. */}
			<div className="hidden lg:block w-full max-w-7xl mx-auto px-6 md:px-8 lg:px-0 mb-25">
				<ShutterText />
			</div>

			<div className="max-w-site mx-auto w-full px-6 md:px-8 lg:px-12">
				{/* Até lg a grade é de uma coluna, então o gap é a distância VERTICAL
				    entre o fim do vídeo e o primeiro contador. 24px no celular, onde
				    os 48px abriam um vão grande demais para uma pilha só. */}
				<div className="grid grid-cols-1 gap-6 md:gap-12 lg:grid-cols-[3fr_2fr] lg:gap-14">
					{/* ---------- Coluna esquerda ---------- */}
					<div className="flex flex-col">
						<AnimatedPill className="text-(--color-eyebrow) uppercase w-fit items-start">
							Nossos números
						</AnimatedPill>

						{/* leading com `!`: a regra global `p { line-height: 1.65 }`
						    do globals.css está fora de cascade layer, e por isso
						    vence as utilities `leading-*` do Tailwind (que ficam em
						    @layer utilities). Sem o important o texto renderiza
						    solto, nada parecido com a referência. */}
						<AnimatedParagraph direction="left" className="mt-5 text-[22px] md:text-[1.75rem] font-(family-name:--font-libre) font-medium leading-[1.3]! tracking-tight text-pretty md:max-w-[46ch] text-(--color-accent)!">
							A Embras investe constantemente em maquinário
							moderno, tecnologia e processos próprios de
							fabricação, o que permite desenvolver desde produtos
							de linha até soluções personalizadas sob medida com
							prazos diferenciados.
						</AnimatedParagraph>

						{/* CTA com o filete embaixo, como no material de referência.
						    w-fit para a linha acompanhar o texto, e não a coluna. */}
						{/* pr-2: a máscara do AnimatedReveal tem overflow-hidden e
						    largura ajustada ao conteúdo. Sem essa folga a seta é
						    recortada ao deslizar no hover. O padding fica na
						    máscara, e não no link, para o sublinhado continuar
						    rente ao texto. */}
						<AnimatedReveal className="mt-10 pr-2">
							<Link
								href="#produtos"
								className="group w-fit border-b border-(--color-border) pb-2 flex items-center gap-3 text-base font-semibold text-(--color-brand-blue) hover:border-(--color-highlight) transition-colors"
							>
								Conhecer os produtos
								<span
									aria-hidden
									className="text-(--color-highlight) text-2xl leading-none transition-transform duration-300 group-hover:translate-x-1"
								>
									→
								</span>
							</Link>
						</AnimatedReveal>

						{/* Animação centralizada, trocando de arquivo com o tema.
						    30px do CTA acima no tablet e no desktop, 16px no celular,
						    onde a coluna é única e o vídeo já vem logo em seguida.
						    Pressupõe um .mp4 SEM faixa vazia em volta do desenho — o
						    respiro é este espaçamento, não margem embutida no arquivo. */}
						{/* Full-bleed no celular: o container tem px-6, e aqui a largura
						    volta a somar esses 48px (calc) enquanto o -ml-6 puxa a caixa
						    para a borda esquerda. A partir de md o bloco respeita o
						    padding como qualquer outro. */}
						<div className="mt-4 md:mt-7.5 w-[calc(100%+3rem)] -ml-6 md:w-full md:ml-0 flex justify-center">
							<div className="relative h-87.5 w-full">
								<IronArtVideo />
							</div>
						</div>
					</div>

					{/* ---------- Coluna direita: indicadores ---------- */}
					{/* O filete some no último item para a seção não terminar com
					    uma linha solta pendurada. */}
					<div className="flex flex-col">
						{STATS.map((stat, i) => (
							<div
								key={stat.caption}
								// O primeiro item não leva filete no topo: ali ele encostava
								// no campo de partículas que transborda da faixa de
								// abertura, e as duas linhas horizontais competiam. Os
								// divisores começam a partir do segundo, que é onde eles
								// de fato separam um número do outro.
								//
								// lg:pt-9.5 (38px) alinha o primeiro contador com o título
								// da coluna esquerda, que começa depois do pill (18px, a
								// altura do ícone) mais o mt-5 do parágrafo. Só em lg,
								// porque abaixo disso as colunas empilham e não há com o
								// que alinhar.
								className={`py-10 md:py-14 ${i === 0 ? 'lg:pt-9.5' : ''} ${i > 0 ? 'border-t border-(--color-divider)' : ''} ${
									i === STATS.length - 1
										? 'border-b border-(--color-divider) lg:border-b-0'
										: ''
								}`}
							>
								<p className="flex items-baseline justify-center flex-wrap gap-x-1 font-(family-name:--font-libre) font-medium leading-none! tracking-tight">
									<span className="text-(--color-highlight) text-6xl md:text-8xl font-medium">
										+
									</span>
									<CountUp
										value={stat.value}
										className="text-(--color-accent) text-6xl md:text-8xl font-medium"
									/>
									{stat.suffix && (
										<span className="text-(--color-highlight) text-3xl md:text-5xl font-medium">
											{stat.suffix}
										</span>
									)}
								</p>
								<p className="mt-1 text-center text-[15px] text-(--color-muted)!">
									{stat.caption}
								</p>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	)
}
