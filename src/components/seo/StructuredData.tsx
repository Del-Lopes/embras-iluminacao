import { absoluteUrl, business, siteName, siteUrl } from '@/config/seo'

// ================================================================
// Dados estruturados (JSON-LD).
//
// Servem para o Google entender QUE ENTIDADE é esta, e não só que palavras a
// página tem. Numa busca pelo nome da marca é o que liga o site à empresa, ao
// telefone, ao endereço e aos perfis oficiais.
//
// Regra que vale para tudo aqui: só descrever o que está visível na página. O
// schema existe para explicar o conteúdo, não para prometer algo que a página
// não mostra.
// ================================================================

// Script único: dois blocos separados fariam o Google tratar as entidades como
// desconexas, e o @graph existe justamente para dizer que a organização, o
// site e a página são a mesma coisa vista de ângulos diferentes.
function Json({ data }: { data: unknown }) {
	return (
		<script
			type="application/ld+json"
			// O conteúdo é montado pelo servidor a partir de dados nossos, nunca
			// de entrada do visitante. O escape de "<" evita que um texto vindo
			// do banco feche a tag antes da hora.
			dangerouslySetInnerHTML={{
				__html: JSON.stringify(data).replace(/</g, '\\u003c'),
			}}
		/>
	)
}

const ORGANIZATION_ID = `${siteUrl}/#organizacao`
const WEBSITE_ID = `${siteUrl}/#site`

/**
 * Identidade da empresa e do site. Vai na home, uma vez só.
 */
export function OrganizationSchema({ sameAs = [] }: { sameAs?: string[] }) {
	return (
		<Json
			data={{
				'@context': 'https://schema.org',
				'@graph': [
					{
						// LocalBusiness, e não só Organization: a empresa tem fábrica
						// com endereço, e é isso que sustenta a busca por marca somada
						// a lugar.
						'@type': ['Organization', 'LocalBusiness'],
						'@id': ORGANIZATION_ID,
						name: siteName,
						legalName: business.legalName,
						url: siteUrl,
						logo: {
							'@type': 'ImageObject',
							url: absoluteUrl('/images/embras-logo-w.png'),
						},
						image: absoluteUrl('/images/og-image.jpg'),
						description:
							'Indústria brasileira de iluminação com fabricação própria de postes, luminárias LED, arandelas e balizadores para projetos residenciais, comerciais e públicos.',
						foundingDate: business.foundingYear,
						address: {
							'@type': 'PostalAddress',
							streetAddress: business.streetAddress,
							addressLocality: business.addressLocality,
							addressRegion: business.addressRegion,
							postalCode: business.postalCode,
							addressCountry: business.addressCountry,
						},
						telephone: business.telephone,
						email: business.email,
						areaServed: { '@type': 'Country', name: 'Brasil' },
						// Perfis oficiais: é por eles que o Google confirma que o site
						// e a empresa das redes sociais são a mesma entidade.
						sameAs,
					},
					{
						'@type': 'WebSite',
						'@id': WEBSITE_ID,
						url: siteUrl,
						name: siteName,
						inLanguage: 'pt-BR',
						publisher: { '@id': ORGANIZATION_ID },
					},
				],
			}}
		/>
	)
}

/**
 * Trilha de navegação. O Google usa para montar o caminho no lugar da URL crua
 * no resultado da busca.
 */
export function BreadcrumbSchema({
	items,
}: {
	items: { name: string; path: string }[]
}) {
	return (
		<Json
			data={{
				'@context': 'https://schema.org',
				'@type': 'BreadcrumbList',
				itemListElement: items.map((item, i) => ({
					'@type': 'ListItem',
					position: i + 1,
					name: item.name,
					item: absoluteUrl(item.path),
				})),
			}}
		/>
	)
}

/**
 * Post do blog.
 */
export function ArticleSchema({
	title,
	description,
	slug,
	image,
	publishedAt,
	updatedAt,
	authorName,
}: {
	title: string
	description?: string | null
	slug: string
	image?: string | null
	publishedAt?: string | null
	updatedAt?: string | null
	authorName?: string | null
}) {
	return (
		<Json
			data={{
				'@context': 'https://schema.org',
				'@type': 'BlogPosting',
				headline: title,
				description: description ?? undefined,
				image: image ?? absoluteUrl('/images/og-image.jpg'),
				datePublished: publishedAt ?? undefined,
				dateModified: updatedAt ?? publishedAt ?? undefined,
				// Sem autor declarado o texto é institucional, e quem assina é a
				// empresa. Inventar uma pessoa aqui seria descrever o que a página
				// não mostra.
				author: authorName
					? { '@type': 'Person', name: authorName }
					: { '@id': ORGANIZATION_ID },
				publisher: { '@id': ORGANIZATION_ID },
				mainEntityOfPage: absoluteUrl(`/blog/${slug}`),
				inLanguage: 'pt-BR',
			}}
		/>
	)
}

/**
 * Produto do catálogo.
 *
 * SEM offers: o catálogo não tem preço nem compra, e declarar oferta sem preço
 * é justamente o tipo de marcação que o Google trata como inválida.
 */
export function ProductSchema({
	name,
	description,
	slug,
	image,
	sku,
	material,
}: {
	name: string
	description?: string | null
	slug: string
	image?: string | null
	sku?: string | null
	material?: string | null
}) {
	return (
		<Json
			data={{
				'@context': 'https://schema.org',
				'@type': 'Product',
				name,
				description: description ?? undefined,
				image: image ?? undefined,
				sku: sku ?? undefined,
				material: material ?? undefined,
				brand: { '@type': 'Brand', name: siteName },
				manufacturer: { '@id': ORGANIZATION_ID },
				url: absoluteUrl(`/catalogo/${slug}`),
			}}
		/>
	)
}
