'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'
import { SparklesCore } from '@/components/common/SparklesCore'
import { useTheme } from '@/components/common/ThemeProvider'

// Azul das partículas por tema. Espelha o token --color-beam-blue do
// globals.css, e existe duplicado aqui porque o tsparticles desenha em canvas:
// as cores viram propriedade de objeto lida pelo engine, e var() do CSS não
// chega até lá. Mexeu num, mexa no outro.
const BEAM_BLUE = { light: '#102a58', dark: '#5b8fe0' } as const

// Faixa de abertura da seção "Nossos números": logo, linha de luz e campo de
// partículas. Vive num componente cliente porque a entrada é uma timeline de
// GSAP, e a seção que a hospeda é server component.
//
// A ordem da coreografia é a regra do desenho: a linha acende sozinha e só
// quando ela está inteira o logo sobe e as partículas se acendem. Por isso é
// uma timeline sequencial, e não três animações com delays calculados na mão:
// mexer na duração da linha reposiciona o resto automaticamente.
export function BrandOpening() {
	const { theme } = useTheme()
	const blue = BEAM_BLUE[theme] ?? BEAM_BLUE.light

	const rootRef = useRef<HTMLDivElement>(null)
	const lineRef = useRef<HTMLDivElement>(null)
	const logoRef = useRef<HTMLDivElement>(null)
	const sparklesRef = useRef<HTMLDivElement>(null)

	useGSAP(
		() => {
			// Reescreve o estado inicial do logo em termos do GSAP antes de animar.
			//
			// O style inline traz translateY(100%), que é o que segura o logo fora da
			// máscara até o script rodar. Só que o GSAP não lê o atributo: ele lê o
			// getComputedStyle, onde a porcentagem já virou matriz em pixels. Assim
			// ele registraria y = altura-do-logo e yPercent = 0, e animar yPercent
			// para 0 não faria nada, porque para ele já estaria em 0.
			//
			// y: 0 zera a leitura em pixels e yPercent: 100 repõe o deslocamento na
			// unidade que a animação usa. Roda em useLayoutEffect, antes da pintura,
			// então não há salto visível.
			gsap.set(logoRef.current, { y: 0, yPercent: 100 })

			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: rootRef.current,
					start: 'top 85%',
					toggleActions: 'play none none none',
				},
			})

			// 1. A linha, só opacidade. 'none' (linear) porque em opacidade pura um
			//    easing que desacelera chega perto de opaco cedo demais e o resto da
			//    duração passa despercebido.
			tl.to(lineRef.current, { opacity: 1, duration: 0.7, ease: 'none' })

			// 2. O logo sobe, já com a linha inteira. yPercent e não y: a medida é
			//    relativa à altura do próprio elemento, então funciona igual nos três
			//    tamanhos de logo sem precisar de um valor por breakpoint.
			tl.to(logoRef.current, { yPercent: 0, duration: 0.9, ease: 'power3.out' })

			// 3. As partículas acendem junto com a subida do logo ('<' alinha ao
			//    início do passo anterior), num fade mais longo para o campo
			//    aparecer depois que o logo já assentou.
			tl.to(sparklesRef.current, { opacity: 1, duration: 1.4, ease: 'none' }, '<')
		},
		{ scope: rootRef }
	)

	return (
		<div ref={rootRef}>
			{/* O overflow-hidden é a máscara da entrada: o logo nasce deslocado
			    100% para baixo, fora da caixa, e sobe até 0. A altura da caixa é a
			    da própria imagem, então o recorte acompanha os breakpoints.

			    O estado inicial vai em style inline, e não numa classe do Tailwind:
			    o v4 gera translate-y-full na propriedade `translate`, que é separada
			    de `transform` e se SOMARIA ao que o GSAP anima, em vez de ser lida
			    como ponto de partida. Inline também evita o flash entre o HTML do
			    servidor e a primeira execução do script. */}
			<div className="mb-2 flex justify-center overflow-hidden">
				<div ref={logoRef} style={{ transform: 'translateY(100%)' }}>
					<Image
						src="/images/embras-old-logo.png"
						alt="Embras Iluminação"
						width={500}
						height={145}
						priority
						className="h-11 md:h-16 lg:h-22 w-auto"
					/>
				</div>
			</div>

			{/* A altura AQUI é só o que o bloco ocupa no layout: 140px, que com os
			    8px de mb do logo acima fecham a distância até os itens de baixo.
			    O campo de partículas é bem mais alto que isso e transborda. */}
			<div aria-hidden className="relative w-full h-35">
				{/* A LINHA, em quatro camadas.

				    Nenhuma delas atravessa o bloco de ponta a ponta: todas nascem e
				    morrem em transparente, e é isso que faz a luz parecer emanar do
				    centro em vez de ser uma régua desenhada.

				    São dois pares. O par largo (50%) é azul e dá o alcance; o par
				    curto (1/6) é laranja e concentra o brilho no meio. Dentro de cada
				    par, uma cópia leva blur e serve de halo, e a outra fica nítida e
				    desenha a linha. Desfocar uma camada só borraria a própria linha.

				    Os quatro vão num wrapper porque a entrada anima o conjunto: com
				    opacidade em cada camada, o halo e a linha nítida cruzariam
				    valores intermediários e o miolo pareceria piscar. */}
				<div ref={lineRef} style={{ opacity: 0 }}>
					<div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 blur-sm bg-linear-to-r from-transparent via-(--color-beam-blue) to-transparent" />
					<div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-linear-to-r from-transparent via-(--color-beam-blue) to-transparent" />
					<div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/6 h-1.25 blur-sm bg-linear-to-r from-transparent via-(--color-highlight) to-transparent" />
					<div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/6 h-px bg-linear-to-r from-transparent via-(--color-highlight) to-transparent" />
				</div>

				{/* Campo de partículas, 440px contra os 140px do bloco: os 300px
				    excedentes correm por trás do conteúdo de baixo. Absoluto para
				    transbordar sem empurrar nada, e pointer-events-none para não
				    interceptar clique no que está por baixo.

				    A máscara vai NO PRÓPRIO campo, e não numa chapa opaca por cima
				    como faz a referência. Lá o truque funciona porque o fundo é preto
				    e a chapa é invisível; aqui ela precisaria transbordar junto e
				    apagaria o texto de baixo. Mascarando o campo, some a partícula e
				    não o que está atrás dela.

				    -z-10 joga o campo para trás de tudo que vem em fluxo, e depende
				    do isolate na <section> que hospeda este bloco.

				    Rompe o wrapper de 1280px: left-1/2 com -translate-x-1/2
				    recentraliza, e w-screen com max-w-site dá min(100vw, 1366px). */}
				<div
					ref={sparklesRef}
					style={{
						opacity: 0,
						WebkitMaskImage:
							'radial-gradient(660px 460px at top, white 15%, transparent 100%)',
						maskImage: 'radial-gradient(660px 460px at top, white 15%, transparent 100%)',
					}}
					className="absolute top-0 left-1/2 -translate-x-1/2 w-screen max-w-site h-110 -z-10 pointer-events-none"
				>
					<SparklesCore
						// key no tema força remontagem na troca. O tsparticles guarda as
						// opções no container ao inicializar, e trocar a cor na prop não
						// repinta as partículas já em cena.
						key={theme}
						minSize={0.8}
						maxSize={2.2}
						speed={2}
						// A densidade é por área de 400×400, então ela multiplica pelo
						// tamanho do campo: num canvas de 1366×440 são ~3.8 áreas.
						particleDensity={85}
						// Cinco laranjas para duas azuis: o tsparticles sorteia com peso
						// igual entre os itens, então a repetição é o que cria a
						// proporção. Dá cerca de 29% de azuis.
						particleColor={['#e54621', '#e54621', '#e54621', '#e54621', '#e54621', blue, blue]}
						className="w-full h-full"
					/>
				</div>
			</div>
		</div>
	)
}
