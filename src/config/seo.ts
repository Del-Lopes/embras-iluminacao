import type { SEOConfig } from '@/types'

export const siteUrl = 'https://embras.com.br'

export const defaultSEO: SEOConfig = {
  title: 'Embras Premium Lighting | Iluminação Arquitetônica de Alto Padrão',
  description:
    'Especialistas em projetos de iluminação para mansões, casas luxuosas e fazendas. A luz esculpida para os espaços mais exclusivos.',
  openGraph: {
    title: 'Embras Premium Lighting | Iluminação Arquitetônica de Alto Padrão',
    description:
      'Especialistas em projetos de iluminação para mansões, casas luxuosas e fazendas. A luz esculpida para os espaços mais exclusivos.',
    url: siteUrl,
    siteName: 'Embras Iluminação',
    images: [
      {
        url: `${siteUrl}/images/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Embras Premium Lighting — Iluminação Arquitetônica de Alto Padrão',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Embras Premium Lighting | Iluminação Arquitetônica de Alto Padrão',
    description:
      'Especialistas em projetos de iluminação para mansões, casas luxuosas e fazendas.',
    images: [`${siteUrl}/images/og-image.jpg`],
  },
}
