'use client'

import { useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'
import { cn } from '@/lib/utils/cn'
import SparklesCore from '@/components/common/SparklesCore'
import { useTheme } from '@/components/common/ThemeProvider'

type Props = {
  text?: string
  className?: string
}

// As três faixas horizontais que varrem cada letra, recortadas por clip-path.
// A do meio vai no sentido contrário das outras duas, que é o que dá a leitura
// de obturador se abrindo em vez de um brilho passando.
const SLICES = [
  { clip: 'polygon(0 0, 100% 0, 100% 35%, 0 35%)', from: -100, to: 100, delay: 0, accent: true },
  { clip: 'polygon(0 35%, 100% 35%, 100% 65%, 0 65%)', from: 100, to: -100, delay: 0.1, accent: false },
  { clip: 'polygon(0 65%, 100% 65%, 100% 100%, 0 100%)', from: -100, to: 100, delay: 0.2, accent: true },
]

const STAGGER = 0.04
const SWEEP = 0.7

// Quando o texto termina de assentar: as letras começam em 0.3, duram 0.8 e a
// última entra STAGGER × 5 depois da primeira. As partículas partem daí, e não
// de um número solto: mexendo nos tempos acima, a entrada delas acompanha.
const TEXT_END = 0.3 + 0.8 + STAGGER * 5
const SPARKLES_FADE = 0.9

// Azul das partículas por tema. Espelha o token --color-beam-blue do
// globals.css, e existe duplicado aqui porque o tsparticles desenha em canvas:
// as cores viram propriedade de objeto lida pelo engine, e var() do CSS não
// chega até lá. Mexeu num, mexa no outro.
const BEAM_BLUE = { light: '#102a58', dark: '#5b8fe0' } as const

// A densidade é por área de 400×400, então ela multiplica pelo tamanho do
// campo: num canvas de 1366×440 são cerca de 3,8 áreas.
const SPARKLES_DENSITY = 85

/**
 * Abertura da seção de números: a palavra entra letra a letra, saindo do
 * desfoque, enquanto três faixas varrem cada caractere.
 *
 * Versão em GSAP do efeito original em framer-motion. A diferença de fundo é o
 * gatilho: lá a animação rodava na montagem e se repetia por um botão; aqui ela
 * dispara quando a seção entra na tela, uma vez só, como as demais entradas da
 * home.
 */
export function ShutterText({ text = 'EMBRAS', className }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const sparklesRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()
  const blue = BEAM_BLUE[theme] ?? BEAM_BLUE.light
  const characters = text.split('')

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      })

      // Letras: do desfoque para o foco. O delay de 0.3 deixa as faixas
      // passarem antes de a palavra assentar.
      tl.fromTo(
        root.querySelectorAll('[data-char]'),
        { opacity: 0, filter: 'blur(10px)' },
        { opacity: 1, filter: 'blur(0px)', duration: 0.8, stagger: STAGGER, ease: 'power2.out' },
        0.3
      )

      // Faixas: cada grupo entra por um lado e sai pelo outro. O deslocamento e
      // a opacidade são dois tweens, e não um só: a opacidade precisa ir de 0 a
      // 1 e voltar a 0 no mesmo intervalo, o que aqui sai de yoyo + repeat.
      SLICES.forEach((slice, index) => {
        const els = root.querySelectorAll(`[data-slice="${index}"]`)
        tl.fromTo(
          els,
          { xPercent: slice.from },
          { xPercent: slice.to, duration: SWEEP, stagger: STAGGER, ease: 'power1.inOut' },
          slice.delay
        )
        tl.fromTo(
          els,
          { opacity: 0 },
          {
            opacity: 1,
            duration: SWEEP / 2,
            stagger: STAGGER,
            ease: 'none',
            yoyo: true,
            repeat: 1,
          },
          slice.delay
        )
      })

      // Partículas: só depois que a palavra assenta. O fade fica no wrapper, e
      // não no SparklesCore, porque ele tem uma entrada própria ao carregar o
      // engine, e as duas brigariam pela mesma opacidade.
      if (sparklesRef.current) {
        tl.to(
          sparklesRef.current,
          { opacity: 1, duration: SPARKLES_FADE, ease: 'power2.out' },
          TEXT_END
        )
      }
    },
    { scope: rootRef }
  )

  return (
    <div
      ref={rootRef}
      className={cn(
        // Sem recorte: o campo de partículas fica ABAIXO da palavra e mais
        // largo que o wrapper, então qualquer overflow aqui o comeria. Cada
        // letra já tem o próprio recorte para as faixas que a varrem, e o
        // clamp do tamanho impede a palavra de estourar a linha.
        'shutter-text relative flex items-center justify-center w-full',
        className
      )}
    >
      <div className="relative z-10 flex flex-wrap justify-center items-center w-full">
        {characters.map((char, i) => (
          // A caixa recorta as faixas que varrem a letra, então precisa de
          // folga lateral: com tracking negativo o glifo é mais largo que o
          // próprio avanço e sobrava para fora, sendo cortado junto.
          <div key={`${char}-${i}`} className="relative px-[0.05em] overflow-hidden">
            {/* clamp no lugar de um vw puro: em telas muito largas o tamanho
                solto passava do container e a página inteira rolava na
                horizontal. */}
            <span
              data-char
              className="block font-(family-name:--font-libre) font-black leading-[1.05] text-[clamp(2.5rem,17vw,13rem)]"
            >
              {char === ' ' ? ' ' : char}
            </span>

            {SLICES.map((slice, index) => (
              <span
                key={index}
                data-slice={index}
                aria-hidden="true"
                className={cn(
                  // Mesmo padding da caixa: inset-0 cobre a caixa inteira, e
                  // sem repetir o recuo o texto da faixa nasceria deslocado em
                  // relação à letra que ela deveria cobrir.
                  'absolute inset-0 px-[0.05em] z-10 pointer-events-none font-(family-name:--font-libre) font-black leading-[1.05] text-[clamp(2.5rem,17vw,13rem)]',
                  slice.accent ? 'text-(--color-highlight)' : 'text-(--color-brand-blue)'
                )}
                style={{ clipPath: slice.clip, opacity: 0 }}
              >
                {char === ' ' ? ' ' : char}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Campo de partículas sob a palavra: 440px de altura, bem além do
          respiro da seção, então o excedente corre POR TRÁS do conteúdo de
          baixo. Absoluto para transbordar sem empurrar nada.

          Rompe o wrapper de 1280px da seção: left-1/2 com -translate-x-1/2
          recentraliza, e w-screen com max-w-site dá min(100vw, 1366px), que é
          a largura de container do site.

          A máscara vai NO PRÓPRIO campo, e não numa chapa opaca por cima: uma
          chapa precisaria transbordar junto e apagaria o texto de baixo.
          Mascarando o campo, some a partícula e não o que está atrás dela.

          -z-10 joga o campo para trás do que vem em fluxo, e depende do
          isolate na <section> que hospeda o bloco. */}
      <div
        ref={sparklesRef}
        aria-hidden
        style={{
          opacity: 0,
          WebkitMaskImage:
            'radial-gradient(660px 460px at top, white 15%, transparent 100%)',
          maskImage: 'radial-gradient(660px 460px at top, white 15%, transparent 100%)',
        }}
        className="absolute top-full left-1/2 -translate-x-1/2 w-screen max-w-site h-110 -z-10 pointer-events-none"
      >
        <SparklesCore
          // key no tema força remontagem na troca. O tsparticles guarda as
          // opções no container ao inicializar, e trocar a cor na prop não
          // repinta as partículas já em cena.
          key={theme}
          minSize={0.8}
          maxSize={2.2}
          speed={2}
          particleDensity={SPARKLES_DENSITY}
          // Quatro laranjas para três azuis: o tsparticles sorteia com peso
          // igual entre os itens, então a repetição é o que cria a proporção.
          // Dá cerca de 43% de azuis.
          particleColor={['#e54621', '#e54621', '#e54621', '#e54621', blue, blue, blue]}
          className="w-full h-full"
        />
      </div>

      {/* Cantos: dois filetes em diagonal opostos, marcando o quadro. */}
      <div className="absolute top-2 left-2 w-12 h-12 border-l border-t border-(--color-divider) pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-12 h-12 border-r border-b border-(--color-divider) pointer-events-none" />
    </div>
  )
}
