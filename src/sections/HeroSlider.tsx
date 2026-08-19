'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { gsap } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'
import type { HeroSlide } from '@/server/hero.actions'

const AUTOPLAY = true

// Os produtos do slider ainda não existem no catálogo, então o botão fica sem
// link: ele é só o rótulo da categoria. Voltando para true, cada slide volta a
// apontar para a página do próprio produto, que já vem resolvida no href.
const CTA_LINKS = false

// Segundos que cada slide fica parado na tela. A contagem só começa quando a
// transição termina, senão os primeiros segundos seriam gastos com a animação
// e o slide ficaria menos tempo legível do que o número diz.
//
// Quem conta o tempo é a própria barra de progresso, e não um setTimeout em
// paralelo: assim o que a pessoa vê preenchendo É o relógio, sem risco de a
// barra e a troca saírem de sincronia depois de uma pausa.
const SLIDE_HOLD = 5

// A transição tem três movimentos simultâneos, cada um no seu tempo. É a
// diferença entre eles que faz o efeito: se todos durassem o mesmo, tudo se
// encontraria no meio da tela e viraria uma cortina comum.
//
// O degradê do slide que entra sobe cobrindo a tela inteira.
const BG_RISE = 1.05
// A foto do slide que sai se fecha pelo topo, e bem mais rápido que a subida
// do degradê: é essa diferença que leva o ponto de encontro entre as duas para
// cerca de 70% da altura, abaixo do centro, em vez de exatamente no meio.
// Medido no navegador: 0.45 leva o encontro a 82%, 0.66 a 77%, 0.85 a 62%.
// 0.75 põe o cruzamento em torno dos 70% da altura.
const OUT_IMAGE = 0.75
// A foto que entra se revela do topo para baixo, mais devagar que tudo: ela
// ainda está se formando quando o degradê já cobriu a tela.
const IN_IMAGE = 1.5
// Só depois disso os textos sobem de dentro das máscaras.
const RISE_AT = 1.2
// Folga extra, em pixels, no recolhimento do conteúdo. Um deslocamento de
// exatos 100% da própria altura deixa passar uma linha de um pixel por
// arredondamento de subpixel, e numa foto ela aparece.
const RISE_CLEARANCE = 8
const RISE_DURATION = 0.7
const RISE_STAGGER = 0.07

// Sem desvio para prefers-reduced-motion: o slider era o ÚNICO componente do
// site a honrar a preferência, e com ela ligada — por opção do sistema ou pela
// emulação do DevTools, que fica ativa sem avisar — a troca virava um corte
// seco enquanto todo o resto da página continuava animando. Ou o site inteiro
// respeita a regra, ou nenhum pedaço respeita sozinho.

// Recortes retangulares. Escondido "acima" quer dizer que sobrou só a borda de
// cima, então abrir revela do topo para baixo; "abaixo" é o contrário.
const OPEN = 'inset(0% 0% 0% 0%)'
const HIDDEN_ABOVE = 'inset(0% 0% 100% 0%)'
const HIDDEN_BELOW = 'inset(100% 0% 0% 0%)'

type Props = { slides: HeroSlide[] }

function ChevronIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
			<path d="M6 15l6-6 6 6" />
		</svg>
	)
}

/**
 * Hero da home: um slide por vez, foto de projeto à esquerda e o produto usado
 * nele à direita.
 *
 * As camadas, de baixo para cima: o degradê do slide cobre a TELA INTEIRA, e
 * as duas colunas são sobreposições nele. Na troca, o degradê do slide que
 * entra sobe da base ao topo engolindo o slide anterior, a foto que sai se
 * fecha pelo topo e a foto que entra se revela do topo para baixo. Os três
 * correm ao mesmo tempo, em velocidades diferentes.
 *
 * Os textos moram dentro das colunas, então saem junto com elas, sem animação
 * de saída própria; a entrada é deles, subindo de dentro de uma máscara depois
 * que o degradê já cobriu a tela.
 *
 * Voltar um slide roda a mesma coreografia com as bordas trocadas, então o
 * movimento é exatamente o contrário do avanço.
 */
export default function HeroSlider({ slides }: Props) {
	const root = useRef<HTMLElement>(null)
	const [current, setCurrent] = useState(0)

	// O índice também vive num ref: os callbacks do GSAP e o timer do autoplay
	// leem o valor no momento em que rodam, e um state congelado na closure
	// faria a segunda troca partir do slide errado.
	const currentRef = useRef(0)
	const animating = useRef(false)
	const progressFill = useRef<SVGCircleElement>(null)
	const progress = useRef<gsap.core.Tween | null>(null)
	// Pausa enquanto a aba está em segundo plano ou o hero saiu da tela: sem
	// isso o slider continua girando para ninguém e o visitante volta no meio
	// de uma transição.
	const paused = useRef(false)

	const slideEls = useCallback(
		() => Array.from(root.current?.querySelectorAll<HTMLElement>('.hero-slide') ?? []),
		[]
	)

	const partsOf = (slide: HTMLElement) => ({
		bg: slide.querySelector<HTMLElement>('.hero-bg'),
		left: slide.querySelector<HTMLElement>('.hero-panel--left'),
		right: slide.querySelector<HTMLElement>('.hero-panel--right'),
		risers: Array.from(slide.querySelectorAll<HTMLElement>('.hero-rise')),
	})

	const clearTimer = () => {
		progress.current?.kill()
		progress.current = null
		if (progressFill.current) gsap.set(progressFill.current, { strokeDashoffset: 100 })
	}

	// Enche a barra em SLIDE_HOLD segundos e, ao encher, troca de slide.
	const schedule = useCallback(() => {
		clearTimer()
		const fill = progressFill.current
		if (!AUTOPLAY || paused.current || slides.length < 2 || !fill) return
		// pathLength="100" no SVG faz o traço andar de 100 a 0, sem depender do
		// raio: mudando o tamanho do ícone, a conta continua a mesma.
		progress.current = gsap.fromTo(
			fill,
			{ strokeDashoffset: 100 },
			{
				strokeDashoffset: 0,
				duration: SLIDE_HOLD,
				// Linear: a barra representa tempo, e qualquer aceleração faria
				// ela mentir sobre quanto falta.
				ease: 'none',
				onComplete: () => goTo(currentRef.current + 1, 1),
			}
		)
		// goTo é declarado abaixo e é estável dentro do ciclo de vida do
		// componente; incluí-lo aqui criaria um ciclo de dependências.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [slides.length])

	const goTo = useCallback(
		(rawTarget: number, dir: 1 | -1) => {
			const els = slideEls()
			if (els.length < 2 || animating.current) return

			// Circular: do último volta para o primeiro nos dois sentidos.
			const target = (rawTarget + els.length) % els.length
			if (target === currentRef.current) return

			const out = els[currentRef.current]
			const inn = els[target]
			const outParts = partsOf(out)
			const innParts = partsOf(inn)

			animating.current = true
			clearTimer()
			setCurrent(target)
			currentRef.current = target

			// Avançando, tudo corre de baixo para cima: o degradê sobe, a foto
			// nova se abre a partir do topo e a velha se fecha pelo topo.
			// Voltando, as três bordas trocam de lado.
			const revealFrom = dir === 1 ? HIDDEN_ABOVE : HIDDEN_BELOW
			const outClose = dir === 1 ? HIDDEN_BELOW : HIDDEN_ABOVE

			const tl = gsap.timeline({
				onComplete: () => {
					animating.current = false
					schedule()
				},
			})

			tl.set(inn, { autoAlpha: 1, zIndex: 3 })
			tl.set(out, { zIndex: 2 })
			// A foto que entra começa escondida, e o conteúdo dela recolhido
			// dentro da máscara.
			tl.set(innParts.left, { clipPath: revealFrom })
			tl.set(innParts.risers, { yPercent: 100 * dir, y: RISE_CLEARANCE * dir })

			// 1. O degradê novo sobe cobrindo a tela inteira, inclusive a coluna
			//    da direita do slide anterior, que por isso não precisa de saída
			//    própria: ele passa por cima dela.
			tl.fromTo(
				innParts.bg,
				{ yPercent: 100 * dir },
				{ yPercent: 0, duration: BG_RISE, ease: 'power2.inOut' },
				0
			)

			// 2. A foto que sai se fecha pelo topo. Rápida de propósito: ela
			//    precisa encontrar a borda do degradê que sobe bem abaixo do meio
			//    da tela, e não no centro.
			tl.to(
				outParts.left,
				{ clipPath: outClose, duration: OUT_IMAGE, ease: 'power2.inOut' },
				0
			)

			// 3. A foto nova se forma do topo para baixo, no tempo mais longo dos
			//    três: ela ainda está preenchendo a coluna quando o resto já
			//    assentou.
			tl.to(
				innParts.left,
				{ clipPath: OPEN, duration: IN_IMAGE, ease: 'power2.inOut' },
				0
			)

			tl.to(
				innParts.risers,
				{ yPercent: 0, y: 0, duration: RISE_DURATION, stagger: RISE_STAGGER, ease: 'power3.out' },
				RISE_AT
			)

			// Devolve o slide que saiu ao estado neutro, pronto para entrar de
			// novo pelo lado certo na próxima volta.
			tl.set(out, { autoAlpha: 0, zIndex: 1 })
			tl.set([outParts.left, innParts.left], { clipPath: 'none' })
			tl.set(outParts.bg, { yPercent: 0 })
		},
		[slideEls, schedule]
	)

	// Estado inicial e entrada do primeiro slide.
	useGSAP(
		() => {
			const els = slideEls()
			if (!els.length) return

			gsap.set(els, { autoAlpha: 0, zIndex: 1 })
			gsap.set(els[0], { autoAlpha: 1, zIndex: 2 })

			const first = partsOf(els[0])
			gsap.fromTo(
				first.risers,
				{ yPercent: 100, y: RISE_CLEARANCE },
				{
					yPercent: 0,
					y: 0,
					duration: RISE_DURATION,
					stagger: RISE_STAGGER,
					delay: 0.25,
					ease: 'power3.out',
				}
			)

			schedule()
			return () => clearTimer()
		},
		{ scope: root, dependencies: [slides.length] }
	)

	// Aba escondida ou hero fora da tela: o relógio para e volta a andar quando
	// o slider está de novo à vista.
	useEffect(() => {
		const el = root.current
		if (!el) return

		const setPaused = (value: boolean) => {
			paused.current = value
			if (value) {
				// Pausa, e não mata: voltando, a barra retoma de onde parou em vez
				// de dar ao slide um tempo extra que ele já tinha consumido.
				progress.current?.pause()
				return
			}
			if (animating.current) return
			if (progress.current) progress.current.resume()
			else schedule()
		}

		const onVisibility = () => setPaused(document.hidden)
		document.addEventListener('visibilitychange', onVisibility)

		const io =
			typeof IntersectionObserver === 'undefined'
				? null
				: new IntersectionObserver(([entry]) => setPaused(!entry.isIntersecting), {
						threshold: 0.25,
					})
		io?.observe(el)

		return () => {
			document.removeEventListener('visibilitychange', onVisibility)
			io?.disconnect()
			clearTimer()
		}
	}, [schedule])

	if (!slides.length) return null

	return (
		<section
			ref={root}
			className="hero-slider"
			aria-roledescription="carrossel"
			aria-label="Projetos e produtos em destaque"
		>
			{slides.map((slide, i) => (
				<article
					key={slide.id}
					className="hero-slide"
					aria-hidden={i !== current}
					aria-roledescription="slide"
					aria-label={`${i + 1} de ${slides.length}`}
				>
					{/* Degradê do slide. Cobre a TELA INTEIRA, e não só a metade
					    direita: as colunas são sobreposições nele, e é ele que sobe
					    na troca engolindo o slide anterior. */}
					<div className="hero-bg" style={{ backgroundImage: slide.gradient }} aria-hidden />

					{/* Metade esquerda: a foto do projeto e o título sobre ela. */}
					<div className="hero-panel hero-panel--left">
						<Image
							src={slide.projectImage}
							alt={slide.projectAlt}
							fill
							sizes="(max-width: 900px) 100vw, 50vw"
							// Só a primeira foto entra como prioritária: ela é o maior
							// elemento da primeira tela, e as demais só aparecem depois
							// de uma interação.
							priority={i === 0}
							className="hero-panel-img"
						/>
						{/* Véu escuro: as fotos variam demais para o texto branco
						    apostar no acaso de cair numa área escura. */}
						<div className="hero-panel-veil" aria-hidden />

						<div className="hero-left-content">
							<div className="hero-mask">
								<h2 className="hero-rise hero-headline">{slide.headline}</h2>
							</div>
							<div className="hero-mask">
								<p className="hero-rise hero-tagline">{slide.tagline}</p>
							</div>
						</div>
					</div>

					{/* Metade direita: sem fundo próprio, ela apenas sobrepõe o
					    degradê com o produto na moldura de vidro, o texto e o botão. */}
					<div className="hero-panel hero-panel--right">
						<div className="hero-right-content">
							{/* Cartão de vidro com a foto por cima: o padding do cartão
							    é a espessura da moldura. */}
							<div className="hero-mask hero-mask--product">
								<div className="hero-rise hero-glass">
									<div className="hero-glass-photo">
										<Image
											src={slide.productImage}
											alt={slide.productAlt}
											fill
											sizes="(max-width: 900px) 70vw, 30vw"
											priority={i === 0}
											className="hero-glass-img"
										/>
									</div>
								</div>
							</div>

							<div className="hero-mask">
								<p className="hero-rise hero-description">{slide.description}</p>
							</div>

							<div className="hero-mask">
								<div className="hero-rise">
									{CTA_LINKS ? (
										<Link href={slide.href} className="hero-cta" tabIndex={i === current ? 0 : -1}>
											{slide.cta}
										</Link>
									) : (
										// span, e não um link sem href: um <a> sem destino
										// continua no caminho do teclado e do leitor de tela,
										// prometendo uma navegação que não existe.
										<span className="hero-cta hero-cta--static">{slide.cta}</span>
									)}
								</div>
							</div>
						</div>
					</div>
				</article>
			))}

			{/* Anel de progresso, no canto direito. Fica preso ao slider, e não a
			    um slide, senão viajaria junto com o painel na transição. */}
			{slides.length > 1 && AUTOPLAY && (
				<div className="hero-progress" aria-hidden>
					<svg viewBox="0 0 36 36">
						<circle className="hero-progress-track" cx="18" cy="18" r="16" />
						<circle
							ref={progressFill}
							className="hero-progress-fill"
							cx="18"
							cy="18"
							r="16"
							pathLength="100"
						/>
					</svg>
				</div>
			)}

			{slides.length > 1 && (
				<div className="hero-nav">
					<button
						type="button"
						className="hero-nav-btn"
						onClick={() => goTo(currentRef.current - 1, -1)}
						aria-label="Slide anterior"
					>
						<ChevronIcon />
					</button>
					<button
						type="button"
						className="hero-nav-btn hero-nav-btn--next"
						onClick={() => goTo(currentRef.current + 1, 1)}
						aria-label="Próximo slide"
					>
						<ChevronIcon />
					</button>
				</div>
			)}
		</section>
	)
}
