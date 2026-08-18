import type { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Manifesto from '@/sections/Manifesto'
import { AnimatedPill } from '@/components/common/AnimatedTypography'
import { LazyVideo } from '@/components/common/LazyVideo'
import { ButtonLink } from '@/components/common/ButtonLink'

export const metadata: Metadata = {
  title: 'Quem somos',
  description:
    'A Embras Iluminação é uma indústria brasileira de postes, luminárias LED e soluções de iluminação, com 20 anos de experiência e fabricação própria.',
}

const PARAGRAPHS = [
  'Com uma área fabril de mais de 2.500 m², a Embras investe constantemente em maquinário moderno, tecnologia e processos próprios de fabricação, o que permite desenvolver desde produtos de linha até soluções personalizadas para projetos de diferentes portes.',
  'São 20 anos de experiência no segmento de iluminação, reunindo conhecimento técnico, capacidade produtiva e desenvolvimento contínuo de novos produtos.',
  'Ao longo dessa trajetória, mais de 10 mil clientes já foram atendidos, consolidando a confiança de construtoras, arquitetos, engenheiros, lojistas, empresas e profissionais de todo o Brasil.',
  'A qualidade também aparece na reputação da marca: zero reclamações registradas no Reclame Aqui, um resultado que reforça o compromisso da Embras com seus clientes, desde o primeiro atendimento até o pós-venda.',
  'E nossos produtos também ganharam espaço na televisão. A Embras Iluminação é fornecedora oficial de grandes realities da TV brasileira, levando seus postes e soluções de iluminação para produções de grande visibilidade nacional. A participação como fornecedora oficial de A Fazenda, por exemplo, já foi divulgada pela própria empresa.',
]

// Caminho do vídeo dentro do bucket. A base vem da env do CDN (a mesma que
// serve as fotos), então trocar de domínio não exige mexer aqui.
const VIDEO_KEY = 'site/institucional-embras.mp4'
const PDF_KEY = 'site/revistalume-ed122-embras.pdf'

const NUMBERS = [
  '+ 2.500 m² de área fabril',
  '+ 10 mil clientes atendidos',
  '20 anos de experiência',
  'Maquinário moderno e fabricação própria',
  'Zero reclamações no Reclame Aqui',
  'Fornecedora de grandes realities da televisão brasileira',
]

/**
 * Página institucional. Conteúdo estático: nada aqui vem do banco.
 */
export default function QuemSomosPage() {
  // Componente de servidor: pode ler a env sem expô-la ao cliente, e o que
  // chega ao navegador é só a URL final.
  const cdn = (process.env.R2_PUBLIC_BASE_URL ?? '').replace(new RegExp("/+$"), "")
  const videoSrc = `${cdn}/${VIDEO_KEY}`
  const pdfSrc = `${cdn}/${PDF_KEY}`

  return (
    <main className="min-h-screen bg-(--color-bg)">
      <Header variant="solid" />

      <article className="max-w-site mx-auto w-full px-6 md:px-8 lg:px-12 pt-20 lg:pt-20 pb-15 md:pb-20 lg:pb-32">
        <div className="flex flex-col gap-5">
          <AnimatedPill className="text-(--color-eyebrow) uppercase w-fit items-start">
            Nossa história
          </AnimatedPill>

          <h1 className="text-[22px] md:text-[1.75rem] font-(family-name:--font-libre) font-medium leading-[1.3] tracking-tight text-(--color-accent) md:max-w-[46ch]">
            Embras Iluminação: indústria, experiência e confiança
          </h1>
        </div>

        {/* Texto à esquerda, vídeo à direita. items-start impede o player de
            esticar até a altura do texto, que é bem mais alto.

            Empilhado, o gap deixa de separar colunas e passa a ser a distância
            entre o botão e o vídeo: 50px, o respiro padrão entre elementos fora
            do desktop. */}
        <div className="mt-12 md:mt-16 grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-[50px] lg:gap-16 items-start">
          <div className="blog-content">
            {PARAGRAPHS.map((text) => (
              <p key={text.slice(0, 40)}>{text}</p>
            ))}

            <h2>Números que contam nossa história</h2>

            <ul>
              {NUMBERS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <p>Embras Iluminação. Da nossa fábrica para grandes projetos em todo o Brasil.</p>

            <h2>A Embras foi referenciada na revista Lume Ed. 122</h2>

            {/* Link comum, e não <a download>: o arquivo vem de outro domínio
                (o CDN), e nesse caso o atributo download é ignorado pelo
                navegador. Quem manda baixar é o Content-Disposition definido no
                próprio objeto no R2. */}
            <ButtonLink href={pdfSrc} className="mt-2 self-start">
              Baixar a matéria em PDF
            </ButtonLink>
          </div>

          {/* Vídeo institucional: só é baixado quando o visitante dá o play,
              para não pesar no carregamento da página. */}
          {/* Teto de largura: em 9:16 a coluna cheia deixaria o player com
              cerca de 900px de altura, desproporcional ao texto ao lado. Menor
              até lg, onde as colunas empilham e o player passa a ocupar a
              largura inteira da página. Centrado no empilhamento e encostado à
              direita a partir de lg. */}
          <div className="w-full max-w-[300px] lg:max-w-[430px] mx-auto lg:mx-0 lg:ml-auto aspect-9/16">
            <LazyVideo
              src={videoSrc}
              poster="/images/embras-poster.png"
              label="Vídeo institucional da Embras Iluminação"
            />
          </div>
        </div>
      </article>

      {/* Manifesto (missão, visão e valores): saiu da home e passa a fechar
          esta página. Ele ocupa a tela inteira e pede a barra fixa do header
          recolhida — o atributo que faz isso está na própria seção. */}
      <Manifesto />

      {/* Respiro até o rodapé, na escala do site. */}
      <div className="h-15 md:h-20 lg:h-32" />

      <Footer />
    </main>
  )
}
