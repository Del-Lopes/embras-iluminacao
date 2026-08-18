import type { SEOConfig } from '@/types'

export const siteUrl = 'https://embras.com.br'

export const defaultSEO: SEOConfig = {
  title: 'Fabricante e distribuidor de luminárias Led, postes e soluções completas de iluminação',
  description:
    'Indústria brasileira de iluminação: fabricação própria de postes, luminárias LED e soluções para residências, empresas e espaços públicos, com atendimento em todo o país.',
  openGraph: {
    title: 'Fabricante e distribuidor de luminárias Led, postes e soluções completas de iluminação',
    description:
      'Indústria brasileira de iluminação: fabricação própria de postes, luminárias LED e soluções para residências, empresas e espaços públicos, com atendimento em todo o país.',
    url: siteUrl,
    siteName: 'Embras Iluminação',
    images: [
      {
        url: `${siteUrl}/images/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Embras Iluminação — fabricante de postes e luminárias LED',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fabricante e distribuidor de luminárias Led, postes e soluções completas de iluminação',
    description:
      'Indústria brasileira de postes, luminárias LED e soluções completas de iluminação.',
    images: [`${siteUrl}/images/og-image.jpg`],
  },
}
