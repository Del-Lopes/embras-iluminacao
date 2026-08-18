'use client'

import { useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'
import { cn } from '@/lib/utils/cn'

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

    },
    { scope: rootRef }
  )

  return (
    <div
      ref={rootRef}
      className={cn(
        'shutter-text relative flex items-center justify-center w-full overflow-hidden',
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

      {/* Cantos: dois filetes em diagonal opostos, marcando o quadro. */}
      <div className="absolute top-2 left-2 w-12 h-12 border-l border-t border-(--color-divider) pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-12 h-12 border-r border-b border-(--color-divider) pointer-events-none" />
    </div>
  )
}
