'use client'

import { useState } from 'react'
import Nav from './Nav'
import Hero from './Hero'
import Pain from './Pain'
import Solution from './Solution'
import Products from './Products'
import Proof from './Proof'
import ObjectionsAndGuarantee from './ObjectionsAndGuarantee'
import FAQ from './FAQ'
import CTAFinal from './CTAFinal'
import LPFooter from './LPFooter'
import WhatsAppFab from './WhatsAppFab'
import Modal from './Modal'
import type { CarouselLine } from './LineCarousel'

// ── Copy variants ────────────────────────────────────────────────
export const COPY = {
  direct: {
    heroSub:
      'Produção em aço galvanizado e alumínio, com qualidade consistente e estrutura para atender projetos de qualquer porte - usados por grandes construtoras e produções nacionais.',
    painIntro:
      'Se você está aqui, provavelmente já perdeu cronograma por causa de fornecedor ruim. O problema quase nunca é o projeto — é quem executa.',
    painBottom: (
      <>
        Tudo isso impacta <strong>diretamente no seu projeto</strong>, no seu cliente e na sua
        reputação. A Embras resolve — produção real, prazo real.
      </>
    ),
    solBody:
      'Somos fabricantes nacionais com estrutura de produção real — capazes de atender desde projetos pontuais até demandas em larga escala, sem comprometer prazo, qualidade ou custo.',
    ctaFinal:
      'Se você quer evitar atraso, retrabalho e fornecedor que não entrega — fale com quem fabrica. A escolha do parceiro certo faz toda a diferença.',
    ps: 'A escolha do parceiro certo faz toda a diferença. Fale com a Embras e tenha um fornecedor à altura do seu projeto.',
  },
  editorial: {
    heroSub:
      'Produção em aço galvanizado e alumínio, com qualidade consistente e estrutura para atender projetos de qualquer porte - usados por grandes construtoras e produções nacionais.',
    painIntro:
      'Há um padrão comum nos projetos que atrasam ou encarecem: a falha raramente está no desenho. Está na cadeia de fornecimento — quando quem executa não acompanha a ambição de quem projeta.',
    painBottom: (
      <>
        Cada um destes pontos compromete projeto, cliente e reputação. A Embras foi construída
        precisamente para remover essas fricções da operação industrial.
      </>
    ),
    solBody:
      'Indústria nacional dedicada à fabricação de postes em aço galvanizado e alumínio, com capacidade produtiva dimensionada para atender desde demandas pontuais até grandes projetos de larga escala.',
    ctaFinal:
      'Há projetos que exigem um fornecedor à altura do próprio projeto. Convidamos você a conhecer a Embras e avaliar a diferença entre comprar postes e contratar quem os fabrica.',
    ps: 'Quando cada detalhe do projeto importa, a escolha do fornecedor deixa de ser logística e passa a ser arquitetura de decisão. Fale com a Embras.',
  },
} as const

export type CopyTone = keyof typeof COPY
export type CopyVariant = (typeof COPY)[CopyTone]

// ── Headline variants ────────────────────────────────────────────
export type HeadlineKey = 'v1' | 'v2' | 'v3'

export const HEADLINES: Record<
  HeadlineKey,
  { top: string; mid: string; midWhite?: string; bottom: string; accent?: string; outline?: string }
> = {
  v1: { top: 'POSTES DIRETO DA', mid: 'FÁBRICA,', midWhite: ' COM PRAZO', bottom: 'QUE VOCÊ PODE CONFIAR', accent: 'CONFIAR' },
  v2: { top: 'SE VOCÊ PRECISA', mid: 'DE POSTES EM', bottom: 'ESCALA', accent: 'ESCALA' },
  v3: { top: 'PARE DE PERDER', mid: 'PRAZO E DINHEIRO', bottom: 'COM FORNECEDORES', outline: 'FORNECEDORES' },
}

// ── App ──────────────────────────────────────────────────────────
export default function LandingPage({ lines }: { lines: CarouselLine[] }) {
  const [modalOpen, setModalOpen] = useState(false)

  const copy: CopyVariant = COPY.editorial
  const headline: HeadlineKey = 'v1'

  const openForm = () => setModalOpen(true)
  const closeForm = () => setModalOpen(false)

  return (
    <>
      <Nav openForm={openForm} />
      <Hero copy={copy} headline={headline} openForm={openForm} />
      <Pain copy={copy} />
      <Solution copy={copy} openForm={openForm} />
      <Products openForm={openForm} lines={lines} />
      <Proof />
      <ObjectionsAndGuarantee />
      <FAQ openForm={openForm} />
      <CTAFinal copy={copy} openForm={openForm} />
      <LPFooter />
      <WhatsAppFab />
      <Modal open={modalOpen} onClose={closeForm} />
    </>
  )
}
