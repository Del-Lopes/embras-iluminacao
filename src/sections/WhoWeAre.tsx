import Link from 'next/link'
import Image from 'next/image'
import FragmentedImageReveal from '@/components/common/FragmentedImageReveal'
import { FadeIn } from '@/components/common/FadeIn'
import {
	AnimatedHeading,
	AnimatedParagraph,
	AnimatedPill,
} from '@/components/common/AnimatedTypography'

// Mosaico do anexo. A unidade U é a meia-diagonal da peça pequena, e todo o
// desenho é múltiplo dela:
//   - dois losangos grandes (2U) no centro, tocando-se pela ponta;
//   - seis pequenos (U) fechando os vãos, três acima e três abaixo;
//   - quatro peças alongadas nas pontas, cada uma cobrindo DUAS células vizinhas.
//
// As peças ficam em posições EXATAS da malha, sem deslocamento nenhum. A folga
// entre elas vem depois, encolhendo cada polígono por dentro em INSET. É o que
// garante espaçamento igual em todo lugar: afastar centros, como estava antes,
// abre vãos diferentes conforme a direção e desalinha o conjunto.
type Point = [number, number]

const BIG = 2
const SMALL = 1
// Recuo perpendicular de cada aresta. O vão entre duas peças vizinhas é o
// dobro disto.
const INSET = 0.06
const SQRT2 = Math.SQRT2

// Losangos: centro e meia-diagonal, em posições inteiras da malha.
const DIAMONDS: { cx: number; cy: number; r: number }[] = [
	{ cx: -BIG, cy: 0, r: BIG },
	{ cx: BIG, cy: 0, r: BIG },

	{ cx: 0, cy: -SMALL, r: SMALL },
	{ cx: -SMALL, cy: -2 * SMALL, r: SMALL },
	{ cx: SMALL, cy: -2 * SMALL, r: SMALL },

	{ cx: 0, cy: SMALL, r: SMALL },
	{ cx: -SMALL, cy: 2 * SMALL, r: SMALL },
	{ cx: SMALL, cy: 2 * SMALL, r: SMALL },
]

// Peças alongadas, descritas pelas duas células vizinhas que cobrem.
const PAIRS: [Point, Point][] = [
	[
		[-4, -1],
		[-3, -2],
	],
	[
		[-4, 1],
		[-3, 2],
	],
	[
		[4, -1],
		[3, -2],
	],
	[
		[4, 1],
		[3, 2],
	],
]

// Numa figura de arestas a 45°, recuar a aresta em INSET equivale a tirar
// INSET × √2 da meia-diagonal.
const diamondPoints = (cx: number, cy: number, r: number): Point[] => {
	const k = r - INSET * SQRT2
	return [
		[cx, cy - k],
		[cx + k, cy],
		[cx, cy + k],
		[cx - k, cy],
	]
}

// Retângulo deitado a 45°: os eixos saem do vetor entre os centros das duas
// células e da perpendicular dele, cada um encurtado pelo mesmo recuo.
const pairPoints = ([a, b]: [Point, Point]): Point[] => {
	const m: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
	const half: Point = [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2]
	const long = SQRT2 - INSET
	const short = SQRT2 / 2 - INSET
	const dHat: Point = [half[0] / (SQRT2 / 2), half[1] / (SQRT2 / 2)]
	const pHat: Point = [-dHat[1], dHat[0]]
	return (
		[
			[-1, -1],
			[1, -1],
			[1, 1],
			[-1, 1],
		] as Point[]
	).map(([sd, sp]) => [
		m[0] + sd * long * dHat[0] + sp * short * pHat[0],
		m[1] + sd * long * dHat[1] + sp * short * pHat[1],
	])
}

const SHAPES: Point[][] = [
	...DIAMONDS.map((d) => diamondPoints(d.cx, d.cy, d.r)),
	...PAIRS.map(pairPoints),
]

// A caixa é medida pela malha, e não pelos polígonos já recuados: assim a
// margem que sobra nas bordas é a mesma folga que separa as peças.
const HALF_W = 5
const HALF_H = 3
const ASPECT = HALF_W / HALF_H

const CLIP_SHAPES = SHAPES.map((pts) =>
	pts
		.map(
			([x, y]) =>
				`${(x + HALF_W) / (2 * HALF_W)},${(y + HALF_H) / (2 * HALF_H)}`
		)
		.join(' ')
)

const CLIP_ID = 'wwa-mosaic'

export default function WhoWeAre() {
	return (
		<section
			id="quem-somos"
			className="relative w-full overflow-x-clip bg-(--color-bg) py-15 md:py-20 lg:py-32"
		>
			{/* Marca d'água encostada na margem esquerda. Fica atrás de tudo e não
			    recebe eventos nem leitura de tela; as cores por tema estão em
			    .wwa-watermark, no globals.css.

			    O deslocamento de 29% não é chute: com o giro parcial, quem encosta
			    na borda da caixa são os CANTOS do quadrado, transparentes no
			    arquivo — somando a faixa que o object-contain deixa nas laterais,
			    o triângulo só começa a 28,5% do lado. O translate cobre essa
			    distância e, por ser porcentagem da largura do próprio elemento,
			    vale em qualquer tela; o left de 10px é o respiro final até a
			    margem.

			    Mexendo no ângulo ou no ajuste da imagem, este valor muda junto:
			    ele vem de girar a perna esquerda e a base do triângulo e pegar o
			    menor x.

			    No desktop a medida é a ALTURA da seção, e o z-10 deixa o desenho
			    passar por cima das seções de baixo: sem ele, elas seriam pintadas
			    em cima, por virem depois no documento.

			    No celular a referência inverte para a LARGURA: com as colunas
			    empilhadas a seção fica altíssima, e medir pela altura produzia um
			    desenho gigante. Ali ele também volta para o z-0, senão, ao
			    transbordar numa tela estreita, passaria por cima do texto da seção
			    seguinte. */}
			<div
				aria-hidden
				className="wwa-watermark pointer-events-none select-none absolute z-0 lg:z-10 top-1/2 left-[60px] -translate-x-[33%] md:-translate-x-[29%] -translate-y-[60%] md:-translate-y-[50%] lg:-translate-y-[60%] rotate-330 w-[115%] h-auto md:w-auto md:h-[80%] lg:h-[100%] aspect-square"
			>
				{/* object-contain: cover preenchia a caixa quadrada às custas de
				    aparar as pontas do desenho, e o triângulo aparecia cortado.
				    A faixa vazia que o contain deixa nas laterais está compensada
				    no translate do elemento. */}
				<Image
					src="/images/wu-bg.webp"
					alt=""
					fill
					sizes="150vh"
					className="object-contain"
				/>
			</div>

			{/* Recorte do mosaico. Um único clipPath com quatro peças recorta UMA
			    imagem, em vez de montar quatro imagens lado a lado: assim o desenho
			    atravessa os losangos sem emenda, e a animação de entrada continua
			    sendo uma só.

			    clipPathUnits="objectBoundingBox" deixa o recorte proporcional ao
			    elemento, então ele acompanha qualquer largura sem recalcular nada. */}
			<svg
				width="0"
				height="0"
				className="absolute"
				aria-hidden
				focusable="false"
			>
				<defs>
					<clipPath id={CLIP_ID} clipPathUnits="objectBoundingBox">
						{CLIP_SHAPES.map((points, i) => (
							<polygon key={i} points={points} />
						))}
					</clipPath>
				</defs>
			</svg>

			<div className="relative max-w-site mx-auto w-full px-6 md:px-8 lg:px-12">
				{/* Cada bloco na sua coluna, sem sobreposição. O vidro do card, por
				    isso, desfoca só o fundo da seção e a marca d'água que passa por
				    trás — não a foto, que fica ao lado. */}
				<div className="grid grid-cols-1 lg:grid-cols-[35fr_65fr] gap-10 lg:gap-16 items-center">
					{/* Mosaico. order-1 no desktop: no DOM ele vem primeiro para,
					    empilhado no celular, aparecer antes do texto — a mesma
					    sequência das demais seções. */}
					<div className="relative z-20 w-full lg:order-1" style={{ aspectRatio: ASPECT }}>
						<div
							className="w-full h-full"
							style={{ clipPath: `url(#${CLIP_ID})` }}
						>
							<FragmentedImageReveal
								src="/images/case-1.png"
								alt="Projeto de iluminação assinado pela Embras"
								slices={12}
								className="w-full h-full"
							/>
						</div>

						{/* Contorno das peças. Vai POR FORA do elemento recortado: dentro
						    dele o próprio clip-path cortaria metade da espessura de cada
						    traço, e a borda sairia mais fina do que as do resto do site.

						    preserveAspectRatio="none" estica o desenho junto com a caixa,
						    e o vector-effect impede que esse esticamento deforme a
						    espessura — sem ele o traço ficaria mais grosso num eixo que
						    no outro. */}
						<svg
							className="pointer-events-none absolute inset-0 w-full h-full"
							viewBox="0 0 1 1"
							preserveAspectRatio="none"
							aria-hidden
							focusable="false"
						>
							{CLIP_SHAPES.map((points, i) => (
								<polygon
									key={i}
									points={points}
									fill="none"
									stroke="var(--color-border)"
									strokeWidth={1}
									vectorEffect="non-scaling-stroke"
								/>
							))}
						</svg>
					</div>

					{/* Card de texto */}
					<FadeIn className="lg:order-0 relative z-30 wwa-card p-8 lg:p-10 flex flex-col gap-5">
						<AnimatedPill className="text-(--color-eyebrow) uppercase w-fit items-start">
							Quem somos
						</AnimatedPill>

						<AnimatedHeading className="text-[22px] md:text-[1.75rem] font-(family-name:--font-libre) font-medium leading-[1.3] tracking-tight text-(--color-accent)">
							Conheça mais sobre a Embras Iluminação
						</AnimatedHeading>

						<div className="flex flex-col gap-4">
							<AnimatedParagraph className="text-[15px] leading-relaxed text-(--color-muted)!">
								Somos uma indústria brasileira de iluminação,
								com fabricação própria de postes, luminárias LED
								e soluções para residências, empresas e espaços
								públicos.
							</AnimatedParagraph>
							<AnimatedParagraph className="text-[15px] leading-relaxed text-(--color-muted)!">
								São mais de 20 anos desenvolvendo produtos que
								unem desempenho e acabamento, do produto de
								linha ao projeto sob medida, atendendo obras em
								todo o território nacional.
							</AnimatedParagraph>
						</div>

						{/* Mesmo CTA da seção de números, com o filete embaixo. */}
						<Link
							href="/quem-somos"
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
