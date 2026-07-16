'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'
import ThemeToggle from '@/components/common/ThemeToggle'
import { navItems } from '@/config/navigation'
import SparklesCore from '@/components/common/SparklesCore'
import ImageGallery from '@/components/common/ImageGallery'
import CascadeText from '@/components/common/CascadeText'
import { useTheme } from '@/components/common/ThemeProvider'

// Galeria no topo da cena. Placeholders do próprio projeto — trocar pelas fotos
// reais do catálogo quando houver.
const GALLERY_IMAGES = [
	'/images/hero-product-1.png',
	'/images/hero-product-2.png',
	'/images/hero-product-3.png',
	'/images/hero-product-4.png',
	'/images/hero-product-5.png',
]
const GALLERY_TOP = '8vh'
const GALLERY_H = '42vh'
// Largura útil do container da galeria (`w-full max-w-5xl px-4`): capada em
// 1024px menos 32px de padding. Ou seja, ela NÃO cresce com o viewport — daí o
// texto EMBRAS derivar deste mesmo valor, e não de vw (ver EMBRAS_FONT_CSS).
const GALLERY_W_CSS = 'min(100vw - 32px, 992px)'
const galleryWidthPx = () => Math.min(window.innerWidth - 32, 992)

// --- Tema light: depois dos 100%, a cena vira clara ---
// A transição de entrada (escurecer + subir o texto) NÃO muda: ela continua indo
// para o preto. Só ao chegar nos 100% o fundo troca para claro.
const SCENE_DARK = '#050505' // cor do overlay = cena escura padrão
const SCENE_LIGHT = '#F5F5F5'
const EMBRAS_DARK = '#F8F7F3' // cor durante a subida, antes dos 100%
const PARTICLE_DARK = '#FFFFFF' // claras no tema dark
const PARTICLE_LIGHT = '#000000' // oposto no espectro do preto
const THEME_FADE_S = 0.6 // rápido, porém suave

// SUBIDA — máscara com dissolve longo. Só a camada da subida a usa: na CHEGADA
// o texto é chapado, sem máscara. Com a Playfair o dissolve começa em 50% e some
// em 85% (pontos intermediários de 5 em 5), deixando mais da letra visível.
const EMBRAS_MASK_RISE =
	'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.4) 55%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.2) 65%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.05) 75%, rgba(0,0,0,0.01) 80%, rgba(0,0,0,0.0) 85%, rgba(0,0,0,0) 92%, rgba(0,0,0,0) 100%)'

// Classe compartilhada pelas duas camadas do texto — elas precisam ficar
// exatamente sobrepostas, então qualquer divergência aqui desalinharia.
// O tamanho NÃO fica aqui: o Tailwind exige literal (text-[12vw]), o que duplicaria
// o EMBRAS_FONT_CSS e deixaria os dois livres para divergir. Vai por style inline.
// TESTE de fonte: Playfair Display só no wordmark (as duas camadas compartilham
// esta classe). Voltar para família Outfit = font-(family-name:--font-outfit).
// PRECISA do prefixo family-name: em Tailwind v4 — sem ele (o antigo
// font-(--font-heading)) NÃO gera font-family e o texto caía no sans do sistema.
const EMBRAS_TEXT_CLS =
	'font-(family-name:--font-playfair) uppercase leading-none tracking-[0.05em] whitespace-nowrap'
// Estado de chegada: dourado sólido, igual nos dois temas. var(--color-highlight)
// resolve o tom por tema sozinho (#C9A86A dark / #8A6A28 light) — a única coisa
// que muda entre eles.

// --- Centralizador do slide ---
// Alcance (fração da tela) para ele arrematar o encaixe.
// Entrada: precisa cobrir o ponto em que a tela já ficou preta (DARKEN_END, a
// 50% = 450px de distância). Fica acima de 0.5 porque a medição é feita com o
// Lenis ainda deslizando (~86% do caminho), o que encurta o alcance na prática.
const SNAP_ENTER_REACH = 0.55
// Saída: curto — corrige só o excesso, sem prender quem quer seguir.
const SNAP_EXIT_REACH = 0.15
// Tempo após o usuário PARAR DE ROLAR (último gesto) para o encaixe disparar.
const SNAP_DELAY_MS = 800
// Duração do movimento do encaixe em si (deslize até a posição enquadrada).
const SNAP_DURATION_S = 1.2

// Onde o escurecimento do hero se completa, medido pela posição do topo da seção
// seguinte na tela. 'top bottom' = scroll 0 (início); 'top top' = 1 tela de scroll.
// Portanto 'top 50%' = meia tela → escurece 2x mais rápido. Menor % = mais rápido.
const DARKEN_END = 'top 50%'

// --- Texto EMBRAS ---
// A fonte deriva da LARGURA DA GALERIA: o texto tem que medir o mesmo que ela.
// 4.214 é a razão largura/fonte de "EMBRAS" na Playfair Display — medida no
// browser (1032px de largura a 245px de fonte) e estável entre viewports, porque
// depende só das métricas dos glifos. Ao TROCAR a fonte, remedir (na Outfit era
// ~4.05; num teste, medir a razão nova e atualizar aqui).
// Em `calc` e não em vw: a galeria é capada em 1024px, então num monitor largo o
// texto em vw cresceria além dela. Aqui os dois param juntos.
const EMBRAS_W_PER_FONT = 4.214
const EMBRAS_FONT_CSS = `calc(${GALLERY_W_CSS} / ${EMBRAS_W_PER_FONT})`
const embrasFontPx = () => galleryWidthPx() / EMBRAS_W_PER_FONT
// Posição FINAL: centro do texto a 70vh (= 20% abaixo do centro da tela).
// centro = 100vh − bottom − fonte/2  →  bottom = 30vh − fonte/2
const EMBRAS_BOTTOM = `calc(30vh - ${GALLERY_W_CSS} / ${EMBRAS_W_PER_FONT} / 2)`
// Posição INICIAL: a mesma de antes (base no rodapé + sangramento de 22%), cujo
// centro ficava em 100vh − 0.28×fonte. Como o repouso agora é 70vh, o deslocamento
// inicial é: 30vh − 0.28×fonte. Em px, para o GSAP animar até 0.
const embrasStartY = () => window.innerHeight * 0.3 - embrasFontPx() * 0.28

// --- Partículas (campo de fundo, atrás do texto e da galeria) ---
// Cascata (nesta ordem): o texto encaixa → fundo/texto trocam de cor e a galeria
// entra (sem atraso nenhum) → as partículas acendem logo atrás. Nada antes dos
// 100%. Os tempos encolheram junto com a saída do feixe: ele era o degrau do meio
// da cascata, e sem ele não há mais o que esperar entre a cor e as partículas.
const SPARKLES_DELAY_S = 0.5
const SPARKLES_FADE_S = 1.4 // ainda controlada, só que sem arrastar
// A densidade do tsparticles é por ÁREA (400×400), então cobrir a tela inteira
// multiplicaria a contagem por ~3 em relação à faixa de 36vh de antes. 70 devolve
// o total ao mesmo patamar de ~550 numa tela 1440×900 — o campo fica mais espalhado,
// não mais pesado.
const SPARKLES_DENSITY = 70

export default function HeroProductsWrapper() {
	const heroRef = useRef<HTMLElement>(null)
	const lineRef = useRef<HTMLDivElement>(null)
	const overlayRef = useRef<HTMLDivElement>(null)
	const embrasTextRef = useRef<HTMLDivElement>(null)
	const embrasRiseRef = useRef<HTMLHeadingElement>(null)
	const embrasFinalRef = useRef<HTMLHeadingElement>(null)

	const carouselTriggerRef = useRef<HTMLDivElement>(null)
	const sparklesRef = useRef<HTMLDivElement>(null)

	const { theme } = useTheme()
	const isLight = theme === 'light'

	const [mounted, setMounted] = useState(false)
	// true depois que a tela chega a 100% (mesmo gatilho do feixe/partículas).
	const [revealed, setRevealed] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	// --- Tema light: ao chegar nos 100%, a cena escura vira clara. ---
	// Fica num efeito próprio (e não no useGSAP) porque depende do tema: o cleanup
	// do useGSAP mata TODOS os ScrollTriggers da página, então recriá-lo a cada
	// toggle de tema quebraria as outras seções. Aqui, alternar o tema com a cena
	// já aberta também reaplica as cores na hora.
	useEffect(() => {
		if (!mounted) return
		const light = revealed && isLight
		gsap.to(overlayRef.current, {
			backgroundColor: light ? SCENE_LIGHT : SCENE_DARK,
			duration: THEME_FADE_S,
			ease: 'power2.inOut',
			overwrite: 'auto',
		})
		// Aos 100%, cross-fade entre as duas camadas do texto: sai a clara da
		// subida, entra a dourada que dissolve para escuro. Anima só opacidade —
		// o gradiente é CSS e resolve o dourado por tema sozinho.
		gsap.to(embrasRiseRef.current, {
			opacity: revealed ? 0 : 1,
			duration: THEME_FADE_S,
			ease: 'power2.inOut',
			overwrite: 'auto',
		})
		gsap.to(embrasFinalRef.current, {
			opacity: revealed ? 1 : 0,
			duration: THEME_FADE_S,
			ease: 'power2.inOut',
			overwrite: 'auto',
		})
	}, [mounted, revealed, isLight])

	// --- Centralizador: encaixa o slide no centro quando o scroll para perto dele.
	// Espera o scroll ASSENTAR (debounce) e só então corrige, e apenas se já estiver
	// perto (25% da tela). Ou seja: não sequestra a rolagem — o usuário conduz, o
	// encaixe só arremata.
	useEffect(() => {
		if (!mounted) return
		const lenis = (
			window as unknown as {
				__lenis?: {
					on: (e: string, cb: () => void) => void
					off: (e: string, cb: () => void) => void
					scrollTo: (
						t: HTMLElement,
						o?: { duration?: number }
					) => void
				}
			}
		).__lenis
		if (!lenis) return

		let timer: number | null = null
		const settle = () => {
			const el = carouselTriggerRef.current
			if (!el) return
			const delta = el.getBoundingClientRect().top
			const vh = window.innerHeight
			// delta > 0: seção ainda abaixo (entrando) → aciona mais cedo.
			// delta < 0: já passou (saindo) → alcance menor, só corrige o excesso.
			const reach = vh * (delta > 0 ? SNAP_ENTER_REACH : SNAP_EXIT_REACH)
			if (Math.abs(delta) > 2 && Math.abs(delta) < reach) {
				lenis.scrollTo(el, { duration: SNAP_DURATION_S })
			}
		}

		// Conta a partir do GESTO do usuário (roda/toque), e não do evento 'scroll'
		// do Lenis: ele segue emitindo durante todo o easing dele (~1,9s), o que
		// empurrava o encaixe para ~2,4s depois da roda.
		const onInput = () => {
			if (timer !== null) clearTimeout(timer)
			timer = window.setTimeout(settle, SNAP_DELAY_MS)
		}

		window.addEventListener('wheel', onInput, { passive: true })
		window.addEventListener('touchmove', onInput, { passive: true })
		return () => {
			window.removeEventListener('wheel', onInput)
			window.removeEventListener('touchmove', onInput)
			if (timer !== null) clearTimeout(timer)
		}
	}, [mounted])

	useGSAP(
		() => {
			if (
				!mounted ||
				!heroRef.current ||
				!lineRef.current ||
				!carouselTriggerRef.current ||
				!overlayRef.current
			)
				return

			// 1. Hero local scroll animation (the line indicator)
			gsap.to(lineRef.current, {
				y: 90, // Updated for 120px height - 30px indicator
				ease: 'none',
				scrollTrigger: {
					trigger: heroRef.current,
					start: 'top top',
					end: 'bottom top',
					scrub: 0.5,
				},
			})

			// 2. Escurecimento do hero conforme a seção seguinte sobe.
			//    Completa na METADE do percurso (DARKEN_END) em vez de só no fim:
			//    a tela fica preta mais cedo e o EMBRAS termina de subir sobre ela.
			gsap.fromTo(
				overlayRef.current,
				{ opacity: 0 },
				{
					opacity: 1, // Full black for deep contrast #070707
					ease: 'none',
					scrollTrigger: {
						trigger: carouselTriggerRef.current,
						start: 'top bottom', // seção entra na tela (scroll 0)
						end: DARKEN_END,
						scrub: true,
					},
				}
			)

			// Parte da posição original (rodapé) e sobe até 70vh conforme o scroll.
			// `y` é função para recalcular no refresh/resize.
			// O blur acompanha o percurso e só zera na chegada: o texto ENTRA EM FOCO
			// (borrado durante a subida → nítido quando a tela está 100%).
			gsap.fromTo(
				embrasTextRef.current,
				{ opacity: 0, filter: 'blur(4px)', y: () => embrasStartY() },
				{
					opacity: 1, // chega 100% visível e nítido ao fim do percurso
					filter: 'blur(0px)',
					y: 0,
					ease: 'none',
					scrollTrigger: {
						trigger: carouselTriggerRef.current,
						start: 'top 95%',
						end: 'top top',
						scrub: true,
						invalidateOnRefresh: true,
					},
				}
			)

			// (Sem pin.) O pin adicionava uma tela extra de scroll parado só para
			// segurar a cena — era o "scrollar bastante" para sair do hero.
			// Agora o hero é 1 slide: a tela seguinte é o próprio trecho em que o
			// EMBRAS sobe, e ao terminar o hero já sai para as linhas de produtos.

			// 4. Cascata ao chegar a 100%: cor do fundo/texto e galeria entram juntas,
			//    e as partículas acendem depois, com entrada lenta. Nada antes dos
			//    100%. Não é scrub — são fades por tempo, daí o gatilho ser onEnter.
			ScrollTrigger.create({
				trigger: carouselTriggerRef.current,
				// 'top top+=4' e não 'top top': o centralizador pousa EXATAMENTE em
				// 'top top', e o último evento de scroll do Lenis chega em ~899,97 —
				// ainda antes do gatilho. Ele assenta nos 900 sem emitir mais nada, e
				// sem novo evento o onEnter nunca é avaliado. Os 4px tiram o gatilho
				// de cima da borda (dispara a 99,6% — imperceptível, e as entradas
				// lentas garantem que a luz só se forme com o slide já enquadrado).
				start: 'top top+=4',
				onEnter: () => {
					// Dispara primeiro a troca de cor do fundo/texto + a galeria.
					setRevealed(true)
					// Partículas: por último e devagar — a cascata.
					gsap.to(sparklesRef.current, {
						opacity: 1,
						duration: SPARKLES_FADE_S,
						delay: SPARKLES_DELAY_S,
						ease: 'power1.inOut',
						overwrite: 'auto',
					})
				},
				// Voltou antes dos 100%: apaga (o overwrite cancela um fade-in que
				// ainda esteja em curso, inclusive o atrasado).
				onLeaveBack: () => {
					setRevealed(false)
					gsap.to(sparklesRef.current, {
						opacity: 0,
						duration: 0.25,
						overwrite: 'auto',
					})
				},
			})

			return () => {
				ScrollTrigger.getAll().forEach((t) => t.kill())
			}
		},
		{ dependencies: [mounted] }
	)

	if (!mounted) {
		return (
			<section className="h-screen w-full bg-black flex items-center justify-center">
				<div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
			</section>
		)
	}

	// z-10 no wrapper: mantém a cena acima da seção seguinte no empilhamento.
	return (
		<div className="relative z-10 w-full bg-black">
			{/* --- HERO SECTION (STICKY) --- */}
			<section
				ref={heroRef}
				className="h-screen w-full flex items-center justify-center bg-black overflow-hidden sticky top-0 z-0"
			>
				{/* BG RADIAL GRADIENT */}
				<div
					className="absolute inset-0 overflow-hidden"
					style={{
						background:
							'radial-gradient(circle at 50% 45%, #84796a 0%, #5e5448 45%, #2e2923 100%)',
					}}
				/>

				{/* TEXTURE EFFECT (REPEATING RADIAL) */}
				<div
					className="absolute inset-0 pointer-events-none opacity-[0.8] z-0 mix-blend-overlay"
					style={{
						backgroundImage: `
							repeating-radial-gradient(
								circle at 20% 30%,
								rgba(255,255,255,0.1) 0,
								rgba(255,255,255,0.1) 1px,
								transparent 1px,
								transparent 4px
							),
							repeating-radial-gradient(
								circle at 80% 70%,
								rgba(255,255,255,0.05) 0,
								rgba(255,255,255,0.05) 1px,
								transparent 1px,
								transparent 4px
							)
						`,
						backgroundSize: '100px 100px',
					}}
				/>

				{/* HEADER ABSOLUTE INSIDE HERO */}
				<header className="absolute top-0 left-0 w-full z-20">
					<div className="flex items-center justify-between px-8 md:px-24 py-8">
						<div className="flex items-center">
							<Link
								href="/"
								aria-label="Ir para a home"
								className="w-[120px] h-8 relative block"
							>
								<Image
									src="/images/embras-logo-w.png"
									alt="Embras"
									fill
									sizes="120px"
									className="object-contain"
								/>
							</Link>
						</div>
						<nav className="hidden md:flex gap-10 items-center">
							{navItems.map((item) =>
								item.disabled ? (
									<span
										key={item.label}
										className="text-[10px] uppercase tracking-[0.3em] text-white cursor-default"
									>
										{item.label}
									</span>
								) : (
									<a
										key={item.label}
										href={item.href}
										className="text-[10px] uppercase tracking-[0.3em] text-white hover:text-white/50 transition-colors"
									>
										{item.label}
									</a>
								)
							)}
						</nav>
						<ThemeToggle />
					</div>
				</header>

				{/* CONTENT HIERARCHY - SIMPLE FLEX COLUMN */}
				<div className="relative z-20 flex flex-col items-start px-8 md:px-24 w-full pointer-events-none">
					<h1 className="text-[clamp(2.5rem,7vw,10rem)] md:text-[clamp(4rem,8.3vw,18rem)] whitespace-nowrap font-(--font-heading) leading-none tracking-tight text-[#f2e6cf] drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] pt-[19vh] ml-[-0.03em]">
						ILUMINAÇÃO <span className="text-white">PREMIUM</span>
					</h1>

					<div className="mt-8 flex flex-col items-start gap-8 max-w-[420px] pointer-events-auto">
						<p className="text-[#f2efe9]/80! font-sans text-[18px] font-light leading-relaxed">
							Iluminação projetada para espaços onde cada detalhe
							importa. Soluções exclusivas para residências,
							estúdios e ambientes de alto padrão.
						</p>
						{/* <a> e não <button>: é navegação para a seção de linhas de
						    produtos, então precisa de href (funciona sem JS, abre em
						    nova aba, e o Lenis o intercepta para rolar suave).
						    inline-block: em <a> inline o padding vertical não empurra
						    a caixa, e a moldura sairia achatada. */}
						<a
							href="#produtos"
							className="inline-block rounded-none border border-white px-8 py-4 bg-transparent text-white hover:bg-white hover:text-black transition-all uppercase tracking-[2px] text-[11px] font-semibold backdrop-blur-sm"
						>
							Conheça nossas linhas
						</a>
					</div>
				</div>

				{/* Chandelier Image Layer */}
				<div className="absolute right-[5%] md:right-[15%] top-[-5%] h-[85%] w-[50%] md:w-[40%] z-10 pointer-events-none">
					<Image
						src="/images/lustres-dourado.webp"
						alt="Chandeliers"
						fill
						priority
						sizes="(max-width: 768px) 50vw, 40vw"
						className="object-contain object-top"
					/>
				</div>

				{/* RIGHT SCROLL INDICATOR */}
				<div className="absolute top-1/2 -translate-y-1/2 right-8 md:right-12 z-20">
					<div className="relative w-0.5 h-[120px] flex justify-center">
						<div className="absolute inset-0 bg-[#474747]" />
						<div
							ref={lineRef}
							className="absolute top-0 w-0.5 h-[30px] bg-white z-10 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
						/>
					</div>
				</div>

				{/* TRANSITION OVERLAY */}
				<div
					ref={overlayRef}
					className="absolute inset-0 bg-[#050505] z-30 pointer-events-none opacity-0"
				/>

				{/* PARTÍCULAS — campo de fundo cobrindo o container inteiro, sem
				    máscara (antes eram uma faixa concentrada sob o feixe).
				    Vivem DENTRO do hero, e não no wrapper como antes: o hero é um
				    contexto de empilhamento (z-0), então qualquer camada no wrapper
				    fica acima dele INTEIRO — inclusive do texto. Aqui, entre o overlay
				    (z-30) e o EMBRAS (z-40), elas ficam atrás do texto; a galeria é
				    z-30 no wrapper, logo acima do hero todo. Ordem final:
				    partículas < texto < galeria. */}
				<div
					ref={sparklesRef}
					className="absolute inset-0 z-35 pointer-events-none opacity-0"
				>
					<SparklesCore
						minSize={0.4}
						maxSize={1}
						particleDensity={SPARKLES_DENSITY}
						speed={2}
						particleColor={isLight ? PARTICLE_LIGHT : PARTICLE_DARK}
						className="w-full h-full"
					/>
				</div>

				{/* BOTTOM GRADIENT TEXT - EMBRAS - RESTORED TO HERO SECTION */}
				{/* SEM overflow-hidden de propósito: o texto agora percorre um trecho
				    longo (parte do rodapé até 70vh), e o corte deste container ficaria
				    no MEIO da tela. O próprio hero já tem overflow-hidden, então o
				    sangramento continua sendo cortado na base da tela, como no original. */}
				<div
					className="absolute left-0 w-full pointer-events-none select-none z-40 flex items-end justify-center"
					style={{
						bottom: EMBRAS_BOTTOM,
						height: EMBRAS_FONT_CSS,
					}}
				>
					{/* Wrapper recebe a animação de scroll (y / opacity / blur). Dentro
					    dele, duas camadas do mesmo texto fazem cross-fade aos 100%. */}
					<div
						ref={embrasTextRef}
						className="relative"
						style={{ opacity: 0 }}
					>
						{/* SUBIDA — claro e dissolvendo na base. */}
						<h2
							ref={embrasRiseRef}
							className={EMBRAS_TEXT_CLS}
							style={{
								fontSize: EMBRAS_FONT_CSS,
								color: EMBRAS_DARK,
								WebkitMaskImage: EMBRAS_MASK_RISE,
								maskImage: EMBRAS_MASK_RISE,
							}}
						>
							EMBRAS
						</h2>
						{/* CHEGADA — palavra inteira, sem máscara nem recorte, com a
						    cascata por letra no hover. As duas cores vêm de var(), e o
						    tema resolve os dois tons sozinho, sem JS: --color-accent é
						    #FFF no dark / #0A0A0A no light, e --color-highlight é o
						    dourado de cada tema.
						    O ref fica no WRAPPER, e não no CascadeText: ele é memo()
						    sem forwardRef, e é a opacidade deste nó que o GSAP cruza
						    com a camada da subida.
						    `flex` no wrapper para o CascadeText (inline-block com
						    overflow-hidden) não ser alinhado pela baseline da linha —
						    isso o deslocaria do h2 da subida e a emenda apareceria
						    como um pulo no cross-fade. */}
						<div
							ref={embrasFinalRef}
							className="absolute top-0 left-0 flex"
							style={{
								opacity: 0,
								// Só há hover depois dos 100%: opacity 0 não impede
								// hit-test, e esta camada fica POR CIMA da subida. O
								// container acima é pointer-events-none — 'auto' reabilita.
								pointerEvents: revealed ? 'auto' : 'none',
							}}
						>
							<CascadeText
								text="EMBRAS"
								as="span"
								ariaHidden
								className={EMBRAS_TEXT_CLS}
								fontSize={EMBRAS_FONT_CSS}
								color="var(--color-accent)"
								hoverColor="var(--color-highlight)"
								// padding 0: o default do componente (0.4em nas laterais)
								// entraria na largura e quebraria o casamento com a galeria.
								style={{ padding: 0 }}
							/>
						</div>
					</div>
				</div>
			</section>

			{/* --- SLIDE PÓS-HERO --- */}
			{/* Uma tela transparente. Ela é o GATILHO do overlay e do texto EMBRAS
			    (por isso permanece mesmo vazia) e é o trecho de scroll em que o texto
			    sobe até 70vh. Fundo transparente: o hero escuro atrás é a cena.
			    pointer-events-none: vazia, mas z-10 a põe acima do hero INTEIRO (z-0)
			    e cobrindo a tela — sem isto ela intercepta o hover do EMBRAS, que
			    vive dentro do hero. (A galeria escapava por ser z-30, acima dela.) */}
			<div
				ref={carouselTriggerRef}
				className="relative w-full h-screen z-10 overflow-hidden bg-transparent pointer-events-none"
			/>

			{/* --- GALERIA --- */}
			{/* Camada sticky, ancorada no TOPO da viewport. Sticky (e não dentro da
			    seção que rola) para ela ENTRAR aos 100%, em vez de deslizar de baixo
			    junto com a seção. z-30 aqui no wrapper = acima do hero INTEIRO, logo
			    acima das partículas (que são z-[35] dentro do hero, cujo contexto é
			    z-0). É a largura deste container que dita o tamanho do texto EMBRAS.
			    `play={revealed}`: mesma flag da troca de cor do texto, sem atraso —
			    é o que faz as duas coisas acontecerem juntas. */}
			<div className="absolute inset-0 z-30 pointer-events-none">
				<div className="sticky top-0 h-screen w-full">
					<div
						className="absolute left-1/2 -translate-x-1/2 w-full max-w-5xl px-4"
						style={{ top: GALLERY_TOP, height: GALLERY_H }}
					>
						<ImageGallery images={GALLERY_IMAGES} play={revealed} />
					</div>
				</div>
			</div>
		</div>
	)
}
