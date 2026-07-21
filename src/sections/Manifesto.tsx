'use client'
import { useRef, useState, useEffect } from 'react'
import { gsap, ScrollTrigger, SplitText } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'
import { useTheme } from '@/components/common/ThemeProvider'

const slides = [
	{
		id: 'missao',
		title: 'Missão',
		text: 'Desenvolver e oferecer soluções em iluminação que unam eficiência, qualidade e design, atendendo com precisão às necessidades de residências, empresas e espaços públicos. Produzimos luminárias robustas e de alto desempenho, garantindo confiabilidade, segurança e excelência em cada projeto.',
	},
	{
		id: 'visao',
		title: 'Visão',
		text: 'Ser referência no mercado de iluminação, reconhecida pela solidez, inovação contínua e compromisso com a satisfação plena dos clientes, consolidando a Embras como especialista na produção de luminárias de alta qualidade.',
	},
	{
		id: 'valores',
		title: 'Valores',
		text: 'Na Embras, somos guiados pela confiança, atuando com ética e transparência em cada relacionamento. Buscamos versatilidade para oferecer a melhor solução em cada projeto, com eficiência, qualidade e segurança. Evoluímos constantemente por meio da inovação, aprimorando processos e produtos para entregar sempre o melhor resultado.',
	},
]

// Tempo total que a onda leva para percorrer o parágrafo, do primeiro caractere
// ao último. A duração do reveal de um slide é este valor + 0.3s (a entrada de
// cada caractere). É o único número a mexer para acelerar/desacelerar o efeito.
const REVEAL_SPREAD_S = 1.6

// --- Centralizador (touch) ---
// Mesmo sistema da HeroProducts: quando o scroll ASSENTA perto da seção, ela
// encaixa (centraliza) na viewport — sem sequestrar a rolagem, só arrematando o
// enquadramento. Como a seção é h-screen, snapar o topo em 0 = tela cheia = a
// seção "pinada" na tela. Alcance maior na entrada (aciona mais cedo) e curto na
// saída (só corrige o excesso, sem prender quem quer seguir).
const SNAP_ENTER_REACH = 0.55
const SNAP_EXIT_REACH = 0.15
// Tempo após o usuário PARAR de rolar (último gesto) para o encaixe disparar.
const SNAP_DELAY_MS = 800
// Duração do deslize até a posição enquadrada.
const SNAP_DURATION_S = 1.0

export default function Manifesto() {
	const { theme } = useTheme()
	const isDark = theme === 'dark'

	const sectionRef = useRef<HTMLElement>(null)
	const lineHRef = useRef<HTMLDivElement>(null)
	const lineVRef = useRef<HTMLDivElement>(null)
	const bgRef = useRef<HTMLDivElement>(null)
	const [mounted, setMounted] = useState(false)
	// Touch (< lg): slide atual (para os dots) + navegação exposta aos dots.
	const [current, setCurrent] = useState(0)
	const goToRef = useRef<(n: number) => void>(() => {})

	useEffect(() => {
		setMounted(true)
	}, [])

	// --- Centralizador (só touch < lg): encaixa a seção no centro quando o scroll
	// para perto dela. Espera o scroll ASSENTAR (debounce) e só então corrige, e
	// apenas se já estiver perto (reach). Não sequestra a rolagem — o usuário
	// conduz, o encaixe só arremata. No desktop (>= lg) NÃO age: lá a seção tem o
	// próprio pin+scrub, e snapar brigaria com ele. Portado da HeroProducts.
	useEffect(() => {
		if (!mounted) return
		const lenis = (
			window as unknown as {
				__lenis?: {
					scrollTo: (t: HTMLElement, o?: { duration?: number }) => void
				}
			}
		).__lenis
		if (!lenis) return

		let timer: number | null = null
		const settle = () => {
			if (window.innerWidth >= 1024) return // desktop: pin+scrub próprio
			const el = sectionRef.current
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

		// Conta a partir do GESTO do usuário (roda/toque), não do 'scroll' do Lenis,
		// que segue emitindo durante todo o easing dele.
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
			if (!mounted || !sectionRef.current) return

			// 1. Entrada (scrub) — textos do slide 0 + linha vertical acompanham a seção entrando
			const entranceTl = gsap.timeline({
				scrollTrigger: {
					trigger: sectionRef.current,
					start: 'top bottom',
					end: 'top top',
					scrub: 1,
				},
			})
			entranceTl.fromTo(
				'.manifesto-left-text:first-child',
				{ opacity: 0, x: -220 },
				{ opacity: 1, x: 0, duration: 1 },
				0
			)
			entranceTl.fromTo(
				'.manifesto-right-text:first-child',
				{ opacity: 0, x: 220 },
				{ opacity: 1, x: 0, duration: 1 },
				0
			)
			entranceTl.fromTo(
				lineVRef.current,
				{ scaleY: 0, transformOrigin: 'top' },
				{ scaleY: 1, duration: 0.75, ease: 'none' },
				0.25
			)

			// 1.5 Linha horizontal (scrub)
			const lineHTl = gsap.timeline({
				scrollTrigger: {
					trigger: sectionRef.current,
					start: 'top 30%',
					end: 'top -30%',
					scrub: 1,
				},
			})
			lineHTl.fromTo(
				lineHRef.current,
				{ scaleX: 0, transformOrigin: 'left' },
				{ scaleX: 0.7, duration: 0.75, ease: 'none' }
			)
			lineHTl.to(lineHRef.current, { scaleX: 1, duration: 0.8, ease: 'none' })

			const leftTexts = gsap.utils.toArray<HTMLElement>('.manifesto-left-text')
			const rightTexts = gsap.utils.toArray<HTMLElement>('.manifesto-right-text')

			// Slides 1 e 2 começam ocultos
			gsap.set(leftTexts.slice(1), { autoAlpha: 0, y: 50 })
			gsap.set(rightTexts.slice(1), { autoAlpha: 0, y: 100 })

			// Divide os parágrafos em caracteres — nenhum visível até o reveal.
			// 'words,chars' e não só 'chars': o agrupamento por palavra é o que
			// mantém a quebra de linha correta. Sem ele cada caractere vira uma
			// caixa independente e o texto quebra no meio das palavras.
			const splits = gsap.utils
				.toArray<HTMLElement>('.manifesto-p')
				.map((p) => new SplitText(p, { type: 'words,chars', charsClass: 'char' }))
			// inline-block permite o transform; os chars começam invisíveis, um
			// pouco abaixo e desfocados — entram subindo e ganhando foco.
			gsap.set('.char', {
				display: 'inline-block',
				opacity: 0,
				y: 10,
				filter: 'blur(8px)',
			})

			// Reveal do texto: AUTOMÁTICO (roda em tempo real, sem scrub). Disparado
			// pelo call da timeline ao entrar no slide — sem nenhum outro efeito.
			const charsOf = (i: number) => splits[i]?.chars ?? []
			// Cada slide revela UMA vez (não reinicia por re-disparo do scrub)
			const played: boolean[] = []
			const autoReveal = (i: number) => {
				if (played[i]) return
				played[i] = true
				const c = charsOf(i)
				if (c.length) {
					gsap.to(c, {
						opacity: 1,
						y: 0,
						filter: 'blur(0px)',
						duration: 0.3,
						ease: 'power2.out',
						// `amount` (total distribuído) e não um valor por caractere:
						// com stagger fixo a duração vira refém do tamanho do texto —
						// "Valores" (329 chars) levava ~1,5x o tempo de "Visão" (220),
						// embora os dois fiquem retidos pelo mesmo tempo de scrub.
						// Assim todo slide revela em amount + duration, seja qual for.
						stagger: { amount: REVEAL_SPREAD_S },
						// Solta o filter no fim: filter permanente mantém uma camada
						// de composição viva por caractere, sem nada a exibir.
						clearProps: 'filter',
						overwrite: 'auto',
					})
				}
			}

			// Glow (onEnter) — acende ao ficar 100% visível.
			// overwrite:'auto' nos DOIS: sem ele, num vai-e-volta rápido o fade-in
			// (0.8s) e o fade-out (0.1s) coexistem — o fade-out vence por 0.1s e
			// depois o fade-in, ainda vivo, puxa a opacidade de volta pra 1, deixando
			// o glow preso aceso. Como nenhum tem delay, overwrite basta (mata o
			// concorrente que está renderizando; não precisa de killTweensOf).
			ScrollTrigger.create({
				trigger: sectionRef.current,
				start: 'top top',
				onEnter: () =>
					gsap.to(bgRef.current, { opacity: 1, duration: 0.8, ease: 'power2.out', overwrite: 'auto' }),
				onLeaveBack: () =>
					gsap.to(bgRef.current, { opacity: 0, duration: 0.1, overwrite: 'auto' }),
			})

			// 2. Troca de slides — comportamento por breakpoint (gsap.matchMedia
			//    reverte/reaplica sozinho ao cruzar o breakpoint no resize).
			const total = leftTexts.length
			const mm = gsap.matchMedia()

			// DESKTOP (lg+): PIN + SCRUB — o slide acompanha o scroll (original).
			mm.add('(min-width: 1024px)', () => {
				const tl = gsap.timeline({
					scrollTrigger: {
						trigger: sectionRef.current,
						start: 'top top',
						end: '+=300%',
						pin: true,
						scrub: 1,
					},
				})
				tl.call(() => autoReveal(0), undefined, '+=0.1')
				tl.to({}, { duration: 1.2 })
				tl.fromTo(leftTexts[0], { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -50, duration: 0.5 }, '+=0.2')
				tl.fromTo(rightTexts[0], { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -100, duration: 0.5 }, '<')
				tl.fromTo(leftTexts[1], { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.5 }, '+=0.1')
				tl.fromTo(rightTexts[1], { autoAlpha: 0, y: 100 }, { autoAlpha: 1, y: 0, duration: 0.5 }, '<')
				tl.call(() => autoReveal(1))
				tl.to({}, { duration: 1.2 })
				tl.fromTo(leftTexts[1], { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -50, duration: 0.5 }, '+=0.2')
				tl.fromTo(rightTexts[1], { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -100, duration: 0.5 }, '<')
				tl.fromTo(leftTexts[2], { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.5 }, '+=0.1')
				tl.fromTo(rightTexts[2], { autoAlpha: 0, y: 100 }, { autoAlpha: 1, y: 0, duration: 0.5 }, '<')
				tl.call(() => autoReveal(2))
				tl.to({}, { duration: 1.2 })
			})

			// TABLET/MOBILE (< lg): CARROSSEL DE SWIPE — sem pin, sem scrub, sem
			// Lenis. O antigo hijack do scroll (pin + scrub + snap via Lenis) travava
			// no touch: o momentum do Lenis brigava com o snap e o slide "prendia e
			// depois pulava vários de uma vez". Aqui a seção rola normalmente e os
			// slides trocam por SWIPE horizontal (ou tocando nos dots) — resposta
			// imediata, 1 swipe = 1 slide.
			mm.add('(max-width: 1023px)', () => {
				let cur = 0
				const show = (n: number) => {
					n = Math.max(0, Math.min(total - 1, n))
					if (n === cur) return
					const dir = n > cur ? 1 : -1
					autoReveal(n)
					gsap.to([leftTexts[cur], rightTexts[cur]], {
						autoAlpha: 0,
						y: dir > 0 ? -40 : 40,
						duration: 0.35,
						ease: 'power2.inOut',
						overwrite: 'auto',
					})
					gsap.fromTo(
						[leftTexts[n], rightTexts[n]],
						{ autoAlpha: 0, y: dir > 0 ? 40 : -40 },
						{ autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out', overwrite: 'auto' }
					)
					cur = n
					setCurrent(n)
				}
				// Exposto para os dots (renderizados no JSX) navegarem.
				goToRef.current = show

				// Revela o slide 0 quando a seção entra na viewport (sem pin).
				const revealST = ScrollTrigger.create({
					trigger: sectionRef.current,
					start: 'top 70%',
					onEnter: () => autoReveal(0),
				})

				// Swipe horizontal: p/ esquerda = próximo, p/ direita = anterior.
				// Só troca em gesto predominantemente horizontal, para não atrapalhar
				// o scroll vertical normal da página.
				const el = sectionRef.current as HTMLElement
				let sx = 0
				let sy = 0
				let tracking = false
				const onStart = (e: TouchEvent) => {
					const t = e.touches[0]
					sx = t.clientX
					sy = t.clientY
					tracking = true
				}
				const onEnd = (e: TouchEvent) => {
					if (!tracking) return
					tracking = false
					const t = e.changedTouches[0]
					const dx = t.clientX - sx
					const dy = t.clientY - sy
					if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
						show(cur + (dx < 0 ? 1 : -1))
					}
				}
				el.addEventListener('touchstart', onStart, { passive: true })
				el.addEventListener('touchend', onEnd, { passive: true })

				return () => {
					revealST.kill()
					el.removeEventListener('touchstart', onStart)
					el.removeEventListener('touchend', onEnd)
				}
			})

			return () => mm.revert()
		},
		{ dependencies: [mounted], scope: sectionRef }
	)

	if (!mounted) return null

	return (
		<section
			ref={sectionRef}
			id="manifesto"
			className="h-screen w-full bg-(--color-bg) flex overflow-hidden relative"
		>
			{/* BACKGROUND GLOW */}
			<div
				ref={bgRef}
				className="absolute inset-0 pointer-events-none opacity-0"
				style={{
					background: isDark
						? 'radial-gradient(65% 75% at 8% 5%, #6b6b6b 0%, #2a2a2a 45%, #050505 100%)'
						: 'radial-gradient(65% 75% at 8% 5%, #9e9b93 0%, #c4c1b9 45%, #f5f5f5 100%)',
				}}
			/>

			{/* GRID LAYOUT */}
			<div className="flex w-full h-full items-start relative z-10">
				{/* LEFT COLUMN — full-width no mobile (o título vertical vira marca
				    d'água atrás), 70% no desktop. z-10 para ficar sobre a marca. */}
				<div className="w-full md:w-[70%] h-full flex flex-col justify-between pl-6 md:pl-8 lg:pl-12 pr-6 md:pr-0 py-16 md:py-24 relative z-10 overflow-hidden">
					<div className="flex-1 flex items-center relative">
						{slides.map((slide) => (
							// pr no próprio manifesto-left-text (e não no pai): como ele
							// é absolute inset-0, um padding no pai é coberto por ele — o
							// texto encostava na divisória. Aqui o padding afasta o texto
							// da linha no desktop, em todas as larguras.
							<div
								key={slide.id}
								className="manifesto-left-text absolute inset-0 flex items-center md:pr-20"
							>
								{/* font-size/line-height vêm da regra .manifesto-p no
								    globals.css (media queries): valores arbitrários do
								    Tailwind (text-[]/[] e min-[1401px]:) não aplicavam de
								    forma confiável aqui. Até 1400px levemente menor; acima,
								    tamanho cheio. */}
								<p
									className="manifesto-p font-(--font-heading) text-(--color-accent) max-w-5xl"
									style={{ whiteSpace: 'pre-line' }}
								>
									{slide.text}
								</p>
							</div>
						))}
					</div>

					{/* Elemento Decorativo Inferior */}
					<div className="flex items-center gap-4 w-full mt-12 pb-12">
						<div className="flex gap-2">
							<div className="w-2 h-2 rounded-full bg-(--color-accent)" style={{ boxShadow: isDark ? '0 0 10px rgba(255,255,255,0.5)' : '0 0 10px rgba(0,0,0,0.2)' }} />
							<div className="w-2 h-2 rounded-full bg-(--color-accent)" style={{ boxShadow: isDark ? '0 0 10px rgba(255,255,255,0.5)' : '0 0 10px rgba(0,0,0,0.2)' }} />
						</div>
						<div
							className="flex-1 h-px bg-(--color-muted)"
							ref={lineHRef}
						/>
					</div>
				</div>

				{/* DIVIDER — só desktop (no mobile o texto é full-width). */}
				<div
					ref={lineVRef}
					className="hidden md:block w-px h-[75vh] shrink-0"
					style={{
						background: `linear-gradient(to bottom, var(--color-muted) 0%, var(--color-muted) 60%, transparent 100%)`,
					}}
				/>

				{/* RIGHT COLUMN — no mobile é uma marca d'água atrás do texto:
				    absoluta à direita, tênue (opacity-12) e sem fundo. No desktop
				    volta a ser a coluna de 30% sólida ao lado do texto. */}
				<div className="absolute right-0 inset-y-0 md:relative md:inset-auto w-[55%] md:w-[30%] h-full overflow-hidden flex items-center justify-center opacity-[0.12] md:opacity-100 bg-transparent md:bg-(--color-bg) pointer-events-none md:pointer-events-auto">
					{slides.map((slide) => (
						<div
							key={slide.id}
							className="manifesto-right-text absolute inset-0 flex items-center justify-end md:justify-center pr-6 md:pr-0"
						>
							{/* No mobile o texto sai do TOPO (items-start + folga de
							    50px), em vez de centralizado — assim a marca d'água
							    "desce" a partir do topo e a fonte pode voltar aos 156px
							    originais sem transbordar dos dois lados. No md+ volta a
							    centralizar na coluna lateral. */}
							<div className="relative h-full flex items-start md:items-center justify-center pt-[20px] md:pt-0 -mr-6 md:mr-0">
								<span
									className="harmonious relative font-(--font-heading) uppercase select-none text-[140px] md:text-[min(15vh,18vw)] lg:text-[min(20vh,40vw)]"
									style={{
										writingMode: 'vertical-rl',
										lineHeight: 0.8,
										transform: 'rotate(180deg)',
									}}
								>
									{slide.title}
								</span>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Navegação de slides (dots) — só touch (< lg). No desktop o scroll
			    controla os slides; aqui, com swipe horizontal ou toque nos dots. */}
			<div className="lg:hidden absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
				{slides.map((s, i) => (
					<button
						key={s.id}
						type="button"
						onClick={() => goToRef.current(i)}
						aria-label={`Ir para ${s.title}`}
						aria-current={current === i}
						className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
							current === i
								? 'w-7 bg-(--color-accent)'
								: 'w-2.5 bg-(--color-muted)'
						}`}
					/>
				))}
			</div>
		</section>
	)
}
