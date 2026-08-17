'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { gsap } from '@/lib/gsap'
import { useGSAP } from '@gsap/react'
import { cn } from '@/lib/utils/cn'
import { AnimatedPill, AnimatedParagraph } from '@/components/common/AnimatedTypography'
import { ButtonLink } from '@/components/common/ButtonLink'

export type ProductLine = {
  id: string
  label: string
}

type Category = {
  label: string
  /** slug em product_categories — é o que o catálogo aceita em ?tipo= */
  slug: string
  /** RASCUNHO: textos escritos como marcador, aguardando a copy real. */
  description: string
  /** Ausente = placeholder. Preencher com o caminho da imagem quando houver. */
  image?: string
}

// Seleção curada por área. É estática de propósito: a home destaca três
// entradas, não espelha o catálogo inteiro — assim cadastrar uma categoria
// nova no admin não altera a home sem alguém decidir por isso.
//
// ATENÇÃO: os slugs precisam existir em product_categories, senão o catálogo
// abre sem resultados. Hoje só 'postes' e 'pendentes' estão cadastrados; os
// demais foram previstos aqui e dependem de cadastro no admin.
const AREA_CATEGORIES: Record<string, Category[]> = {
  externo: [
    {
      label: 'Postes',
      slug: 'postes',
      description:
        'Postes decorativos e de iluminação pública, em alturas e acabamentos sob medida.',
    },
    {
      label: 'Projetores Spot',
      slug: 'projetores-spot',
      description:
        'Projetores direcionais para fachadas, jardins e destaques arquitetônicos.',
    },
    {
      label: 'Balizadores',
      slug: 'balizadores',
      description:
        'Marcação de caminhos e acessos com luz rasante, discreta e uniforme.',
    },
  ],
  interno: [
    {
      label: 'Pendentes',
      slug: 'pendentes',
      description:
        'Luminárias suspensas para salas, mesas e ambientes de convivência.',
    },
    {
      label: 'Embutidos',
      slug: 'embutidos',
      description:
        'Soluções de embutir em forro, com foco em luz difusa e sem ofuscamento.',
    },
    {
      label: 'Arandelas',
      slug: 'arandelas',
      description:
        'Iluminação de parede para corredores, quartos e áreas sociais.',
    },
  ],
}

export default function ProductLines({
  lines,
  defaultActive,
}: {
  lines: ProductLine[]
  defaultActive?: string
}) {
  const initial =
    (defaultActive && lines.some((l) => l.id === defaultActive) ? defaultActive : undefined) ??
    lines[0]?.id ??
    ''
  const [activeTab, setActiveTab] = useState(initial)
  const current = lines.find((l) => l.id === activeTab) || lines[0]
  const categories = AREA_CATEGORIES[activeTab] ?? []

  // Entrada das abas: deslizam de baixo do próprio bloco, que tem
  // overflow-hidden e funciona como máscara — antes de entrar elas estão fora
  // da área visível, não apenas transparentes.
  const tabsMaskRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  // Entrada dos cards: fade + subida, em cascata.
  const cardsRef = useRef<HTMLDivElement>(null)
  const primeiraEntrada = useRef(true)

  useGSAP(
    () => {
      const container = cardsRef.current
      if (!container) return
      const cards = container.querySelectorAll('[data-card]')
      if (!cards.length) return

      const to: gsap.TweenVars = {
        opacity: 1,
        y: 0,
        duration: 1.1,
        ease: 'power3.out',
        stagger: 0.22,
      }
      const from: gsap.TweenVars = { opacity: 0, y: 28 }

      // Na primeira vez o gatilho é o scroll: a seção está abaixo da dobra e a
      // cascata deve acontecer quando ela entra na tela.
      // Na troca de aba não — aí o usuário já está olhando para os cards, e um
      // ScrollTrigger já disparado nunca rodaria de novo. Anima na hora.
      if (primeiraEntrada.current) {
        primeiraEntrada.current = false
        gsap.fromTo(cards, from, {
          ...to,
          scrollTrigger: {
            trigger: container,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        })
      } else {
        gsap.fromTo(cards, from, to)
      }
    },
    // activeTab nas dependências: os cards têm key com a aba, então trocam de
    // instância no DOM e precisam ser recapturados a cada troca.
    { dependencies: [activeTab] }
  )

  useGSAP(
    () => {
      if (!tabsMaskRef.current || !tabsRef.current) return

      // fromTo (e não to): com immediateRender o estado inicial é aplicado na
      // criação, antes do gatilho. Com `to` as abas apareceriam na posição
      // final por um quadro e só então saltariam para baixo.
      gsap.fromTo(
        tabsRef.current,
        { yPercent: 100 },
        {
          yPercent: 0,
          duration: 1,
          // Atraso para entrarem DEPOIS do parágrafo acima, que tem
          // delay 0.7 + duração 0.8 no AnimatedParagraph.
          delay: 0.5,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: tabsMaskRef.current,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        }
      )
    },
    { dependencies: [] }
  )

  return (
    <>
    {/* ---------------- Apresentação (fundo preto) ---------------- */}
    <section
      id="produtos"
      // Escala vertical padrão das seções: 60px no mobile, 80px no tablet,
      // 128px no desktop. A base não tem padding: as abas fecham a seção
      // coladas na borda, e o respiro do texto acima vem do pb do bloco interno.
      // pl-band (globals.css) traz o fundo e a reescrita dos tokens de cor
      // desta faixa. Estava tudo em style inline aqui, mas inline não varia por
      // tema, e a faixa precisa inverter no dark: preta no tema claro, clara no
      // escuro. Com a classe, a inversão é um bloco de CSS e o JSX não sabe de
      // tema nenhum.
      className="pl-band pt-15 md:pt-20 lg:pt-32 w-full relative"
    >
      <div className="max-w-site mx-auto w-full px-6 md:px-8 lg:px-12">
        <div className="flex flex-col items-start gap-5 pb-15 md:pb-20 lg:pb-32">
          <AnimatedPill className="text-(--color-eyebrow) uppercase w-fit items-start">
            Linha de Produtos
          </AnimatedPill>
          {/* Mesma medida e entrelinha da seção anterior, para as duas
              declarações da home lerem como um par. O `!` no leading é
              necessário: `p { line-height: 1.65 }` do globals.css está fora
              de cascade layer e vence as utilities do Tailwind. */}
          <AnimatedParagraph direction="left" className="text-[22px] md:text-[1.75rem] font-(family-name:--font-libre) font-medium leading-[1.3]! tracking-tight text-pretty md:max-w-[46ch] text-(--color-accent)!">
            Fabricamos postes, luminárias LED e soluções completas de
            iluminação, atendendo projetos em todo o território nacional.
            Conheça algumas das nossas principais linhas para área interna e
            externa.
          </AnimatedParagraph>
        </div>
      </div>

      {/* Abas — Área Interna / Externa. Fecham a seção, contidas na mesma
          largura do conteúdo acima. Continuam sendo o filtro das categorias,
          que agora vivem na seção seguinte — daí a seta para baixo, que indica
          onde o resultado aparece. */}
      <div className="max-w-site mx-auto w-full px-6 md:px-8 lg:px-12">
        {/* A máscara recorta o que estiver fora: é ela que faz as abas
            surgirem "de dentro" do bloco, e não flutuando por cima. */}
        <div ref={tabsMaskRef} className="overflow-hidden">
        <div ref={tabsRef} className="grid grid-cols-1 md:grid-cols-2 w-full">
          {lines.map((line) => {
            const isActive = activeTab === line.id
            return (
              <button
                key={line.id}
                onClick={() => setActiveTab(line.id)}
                aria-pressed={isActive}
                className={cn(
                  'group relative w-full py-5 md:py-6 px-6 flex items-center justify-center gap-3',
                  'text-xs uppercase tracking-[0.2em] font-semibold',
                  'border-t-2 transition-colors duration-500 cursor-pointer',
                  // Em repouso tudo lê --color-accent, que dentro da .pl-band é a
                  // tinta da faixa: branca no tema claro, escura no dark. Antes
                  // eram três `white` cravados, e quando a faixa inverteu a aba
                  // ficou branca sobre claro, sem barra e sem texto visíveis.
                  // O ativo mantém texto branco fixo: o fundo dele é o laranja
                  // nos dois temas, então a tinta da faixa não se aplica.
                  isActive
                    ? 'bg-(--color-highlight) border-t-(--color-highlight) text-white'
                    : 'bg-(--color-accent)/10 border-t-(--color-accent) text-(--color-accent) hover:bg-(--color-highlight) hover:text-white'
                )}
              >
                {line.label}
                <svg
                  className={cn(
                    'w-3.5 h-3.5 transition-transform duration-500',
                    isActive ? 'translate-y-0.5' : 'opacity-60 group-hover:translate-y-0.5'
                  )}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
              </button>
            )
          })}
        </div>
        </div>
      </div>
    </section>

    {/* ---------------- Categorias (fundo claro) ---------------- */}
    {/* O pt é a distância das abas até os cards, e não o padding da seção: 50px
        no celular e 80px do tablet para cima, o padrão de distância entre
        elementos. Já a base segue a escala de seção (60 / 80 / 128px). */}
    <section className="bg-(--color-bg) w-full pt-12.5 md:pt-20 pb-15 md:pb-20 lg:pb-32">
      <div className="max-w-site mx-auto w-full px-6 md:px-8 lg:px-12 flex flex-col items-center">
        {/* Três colunas só a partir de lg. No tablet a largura não comporta
            três cards em pé sem espremer o título em duas linhas e afinar a
            descrição, então cada card ocupa a linha inteira e vira horizontal. */}
        <div ref={cardsRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 w-full">
          {categories.map((cat) => (
            <Link
              // key com a aba: troca de área remonta os cards, e a transição
              // de entrada roda de novo em vez de só trocar o texto.
              key={`${activeTab}-${cat.slug}`}
              data-card
              href={`/catalogo?environment=${activeTab}&tipo=${cat.slug}`}
              // SEM border CSS e SEM overflow-hidden.
              //
              // A borda é desenhada por segmentos absolutos (cinza em repouso,
              // laranja no hover) porque os lados inferior e direito precisam
              // PARAR nas pontas do triângulo. Uma borda CSS correria por baixo
              // dele, e era isso que obrigava o triângulo a avançar 2px para
              // escondê-la — agora ele encosta no vértice sem sobrar nada.
              //
              // O zoom da imagem é contido pelo overflow-hidden do container
              // dela, não daqui.
              // md:flex-row = a disposição de tablet (imagem à esquerda, texto à
              // direita). Volta a empilhar em lg, quando os três cards dividem
              // a linha. Os segmentos da borda e o triângulo são absolutos em
              // relação ao card, então acompanham as duas formas sem ajuste.
              className="group relative flex flex-col md:flex-row lg:flex-col"
            >
              {/* Imagem — placeholder enquanto não há arte definitiva.
                  overflow-hidden no card + scale no hover dão o zoom sutil. */}
              {/* shrink-0 no tablet: sem ele o flex encolheria a imagem para
                  caber o texto, e a proporção 4/3 iria junto. */}
              <div className="relative aspect-4/3 w-full md:w-2/5 md:shrink-0 lg:w-full overflow-hidden bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)]">
                {cat.image ? (
                  <Image
                    src={cat.image}
                    alt={cat.label}
                    fill
                    sizes="(max-width: 767px) 100vw, (max-width: 1023px) 40vw, 33vw"
                    className="object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                ) : (
                  // O mesmo zoom vale para o placeholder: sem isso o efeito só
                  // apareceria depois que as imagens reais entrassem, e não dá
                  // para avaliar o gesto agora.
                  <span
                    aria-hidden
                    className="absolute inset-0 m-auto w-14 h-14 bg-[color-mix(in_srgb,var(--color-accent)_18%,transparent)] transition-transform duration-1000 group-hover:scale-105"
                    style={{
                      maskImage: 'url(/images/embras-form-w.png)',
                      WebkitMaskImage: 'url(/images/embras-form-w.png)',
                      maskSize: 'contain',
                      WebkitMaskSize: 'contain',
                      maskRepeat: 'no-repeat',
                      WebkitMaskRepeat: 'no-repeat',
                      maskPosition: 'center',
                      WebkitMaskPosition: 'center',
                    }}
                  />
                )}
              </div>

              {/* Texto. pr-14 abre espaço para o canto diagonal não cobrir a
                  última linha da descrição. */}
              {/* flex-1 ocupa o que sobra ao lado da imagem no tablet, e
                  justify-center centraliza o texto pela altura dela. */}
              <div className="flex flex-1 flex-col justify-center lg:justify-start gap-3.75 p-6 md:p-8 pr-14 md:pr-16">
                <h3 className="font-(family-name:--font-libre) font-medium text-2xl md:text-3xl tracking-tight text-(--color-accent)">
                  {cat.label}
                </h3>
                <p className="text-[15px] text-(--color-muted)!">{cat.description}</p>
              </div>

              {/* ---- Borda em repouso ----
                  Os quatro lados cobrem o perímetro inteiro. Eles passam POR
                  BAIXO do triângulo (z-10), que os esconde no trecho do canto,
                  então não precisam parar antes dele. */}
              <span aria-hidden className="absolute top-0 left-0 right-0 h-px bg-(--color-divider)" />
              <span aria-hidden className="absolute left-0 top-0 bottom-0 w-px bg-(--color-divider)" />
              <span aria-hidden className="absolute bottom-0 left-0 right-0 h-px bg-(--color-divider)" />
              <span aria-hidden className="absolute right-0 top-0 bottom-0 w-px bg-(--color-divider)" />

              {/* ---- Borda desenhada no hover ----
                  Dois braços partem do canto SUPERIOR ESQUERDO e se encontram
                  no canto inferior direito, fechando o perímetro:
                    braço A → topo (esquerda p/ direita) e depois desce a lateral direita
                    braço B → lateral esquerda (de cima p/ baixo) e depois a base
                  O segundo trecho de cada braço espera o primeiro (delay-300), e
                  os delays invertem no repouso para o traço recolher pelo mesmo
                  caminho por onde veio.

                  Anima WIDTH/HEIGHT, e não transform: scale. Com scale o
                  navegador promove a linha a uma camada de GPU e rasteriza o
                  1px com antialiasing — ela engrossava durante a animação e só
                  afinava ao terminar, quando a camada é descartada. Como são
                  elementos absolutos, mudar a dimensão não causa reflow da
                  página, só o repaint deles.

                  A âncora é que define a direção do crescimento: ancorado à
                  esquerda, o traço cresce para a direita; ancorado no topo,
                  cresce para baixo. */}
              <span
                aria-hidden
                className="absolute top-0 left-0 h-px w-0 group-hover:w-full bg-(--color-highlight) transition-[width] duration-300 delay-300 group-hover:delay-0"
              />
              <span
                aria-hidden
                className="absolute left-0 top-0 w-px h-0 group-hover:h-full bg-(--color-highlight) transition-[height] duration-300 delay-300 group-hover:delay-0"
              />
              <span
                aria-hidden
                className="absolute right-0 top-0 w-px h-0 group-hover:h-full bg-(--color-highlight) transition-[height] duration-300 delay-0 group-hover:delay-300"
              />
              <span
                aria-hidden
                className="absolute bottom-0 left-0 h-px w-0 group-hover:w-full bg-(--color-highlight) transition-[width] duration-300 delay-0 group-hover:delay-300"
              />

              {/* right-0/bottom-0, sem avanço negativo: não há borda CSS no
                  card, e os segmentos que formam a borda passam por baixo
                  deste triângulo — nada sobra para esconder. */}
              {/* Azul em repouso, laranja no hover — mas só a partir dos 500ms,
                  quando o segundo trecho da borda (que sai aos 300ms e dura
                  300ms) está chegando aqui. A troca lê como consequência da
                  linha alcançar o triângulo, não como um evento paralelo.

                  É essa sincronia que autoriza os segmentos a avançarem para
                  dentro do triângulo: quando eles entram, ele já está virando
                  laranja, e a sobreposição desaparece na mesma cor. No repouso
                  o delay é 0, para o azul voltar assim que o traço recolhe. */}
              <span
                aria-hidden
                className="absolute right-0 bottom-0 z-10 w-16 h-16 bg-(--color-brand-blue) group-hover:bg-(--color-highlight) transition-colors duration-300 delay-0 group-hover:delay-500"
                style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
              />
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute right-2 bottom-2 z-20 w-5 h-5 text-white transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              >
                <path d="M7 17L17 7M17 7H9M17 7v8" />
              </svg>
            </Link>
          ))}
        </div>

        <div className="mt-12.5 md:mt-16">
          <ButtonLink href={`/catalogo?environment=${activeTab}`}>
            Ver todos de {current?.label ?? 'produtos'}
          </ButtonLink>
        </div>
      </div>
    </section>
    </>
  )
}
