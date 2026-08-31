import type { SEOConfig } from '@/types'

// ================================================================
// Endereço público do site.
//
// Vem do ambiente para não haver um domínio chumbado no código: era assim que
// o site inteiro acabou apontando canonical, sitemap e Open Graph para
// https://embras.com.br, um domínio que não responde. Para o Google, uma
// canonical apontando para fora significa "a versão boa desta página está lá",
// e o resultado é o site não ser indexado.
//
// Sem barra no fim: todas as montagens de URL abaixo já a acrescentam.
export const siteUrl = (
	process.env.NEXT_PUBLIC_SITE_URL ?? 'https://embrasilumina.com.br'
).replace(/\/+$/, '')

// Nome usado no template de título, no Open Graph e no schema.org. Um lugar
// só: a marca precisa aparecer idêntica em todos eles para o Google associar
// as páginas à mesma entidade.
export const siteName = 'Embras Iluminação'

// Monta a URL absoluta de um caminho interno. Canonical, sitemap e Open Graph
// exigem URL completa, e concatenar à mão espalha erro de barra dupla.
export const absoluteUrl = (path = '/') =>
	`${siteUrl}${path.startsWith('/') ? path : `/${path}`}`.replace(/\/$/, '') || siteUrl

// Dados da empresa. Ficam aqui porque alimentam o schema.org, o rodapé e as
// páginas institucionais: repetidos em cada lugar, divergiriam na primeira
// atualização, e endereço divergente entre site e Google Perfil da Empresa
// atrapalha justamente a busca pelo nome da marca.
export const business = {
	legalName: 'Embras Iluminação LTDA',
	// Confirmar antes de publicar: veio do cadastro público da empresa.
	streetAddress: 'Rodovia José Simões Louro Júnior, 40925 — Val Flor',
	addressLocality: 'Embu-Guaçu',
	addressRegion: 'SP',
	postalCode: '06906-100',
	addressCountry: 'BR',
	telephone: '+551136051589',
	whatsapp: '+5511947467797',
	email: 'vendas@embrasiluminacao.com.br',
	foundingYear: '2006',
} as const

// O layout acrescenta " | Embras Iluminação" a todo título. Quando o título
// da página JÁ traz a marca — caso dos seo_title cadastrados no painel, que
// costumam terminar com o nome da empresa — o resultado sai com a marca
// repetida, e ainda ocupa o espaço da linha do resultado de busca com ela.
//
// Devolver { absolute } desliga o template para aquela página.
export const pageTitle = (raw: string): string | { absolute: string } =>
	/embras/i.test(raw) ? { absolute: raw } : raw

export const defaultSEO: SEOConfig = {
	// A marca vem PRIMEIRO no título da home. O objetivo declarado é ser
	// encontrado pelo nome, e numa busca por "Embras Iluminação" o Google dá
	// peso a onde o termo aparece no título. O resto da linha carrega os dois
	// produtos que definem a empresa.
	title: 'Embras Iluminação | Fabricante de Postes e Luminárias LED',
	description:
		'Indústria brasileira de iluminação em Embu-Guaçu (SP). Fabricação própria de postes, luminárias LED, arandelas e balizadores para projetos residenciais, comerciais e públicos em todo o Brasil.',
	openGraph: {
		title: 'Embras Iluminação | Fabricante de Postes e Luminárias LED',
		description:
			'Indústria brasileira de iluminação com fabricação própria de postes, luminárias LED e soluções completas para projetos em todo o Brasil.',
		url: siteUrl,
		siteName,
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
		title: 'Embras Iluminação | Fabricante de Postes e Luminárias LED',
		description:
			'Indústria brasileira de postes, luminárias LED e soluções completas de iluminação.',
		images: [`${siteUrl}/images/og-image.jpg`],
	},
}
