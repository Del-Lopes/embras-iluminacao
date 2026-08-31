import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/config/seo'
import { createSupabasePublicClient } from '@/lib/db/supabase-public'

// ================================================================
// Sitemap do site.
//
// Antes ele tinha UMA url, a home, e ainda por cima no domínio errado. Agora é
// montado a cada geração: as páginas fixas mais tudo o que está publicado no
// banco. Post novo entra sozinho, sem ninguém editar arquivo nenhum.
//
// A leitura usa o cliente anônimo (sem cookies) porque um sitemap é conteúdo
// público: com o cliente de sessão a rota viraria dinâmica e seria remontada a
// cada acesso de robô.
// ================================================================

// De hora em hora. O sitemap é barato de gerar, e um post publicado hoje não
// deve esperar o próximo deploy para aparecer.
export const revalidate = 3600

type Entrada = MetadataRoute.Sitemap[number]

// Páginas fixas. A prioridade é relativa DENTRO do site: serve para dizer ao
// robô o que olhar primeiro numa varredura, não para competir com terceiros.
const PAGINAS_FIXAS: { path: string; priority: number; changeFrequency: Entrada['changeFrequency'] }[] = [
	{ path: '/', priority: 1, changeFrequency: 'weekly' },
	{ path: '/catalogo', priority: 0.9, changeFrequency: 'weekly' },
	// /postes NÃO entra: a landing page se declara noindex no próprio layout
	// (é peça de campanha, não conteúdo de busca). Listar no sitemap uma URL
	// que manda o robô não indexar é mandar dois sinais opostos, e o Google
	// registra isso como erro de cobertura no Search Console.
	{ path: '/projetos', priority: 0.8, changeFrequency: 'weekly' },
	{ path: '/quem-somos', priority: 0.7, changeFrequency: 'yearly' },
	{ path: '/blog', priority: 0.7, changeFrequency: 'daily' },
	{ path: '/politica-de-privacidade', priority: 0.2, changeFrequency: 'yearly' },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const supabase = createSupabasePublicClient()

	// As três consultas são independentes: buscar em paralelo evita somar três
	// idas ao banco na geração.
	const [posts, produtos, projetos] = await Promise.all([
		supabase
			.from('posts')
			.select('slug, published_at, updated_at')
			.eq('status', 'published')
			.order('published_at', { ascending: false }),
		supabase
			.from('products')
			.select('slug, updated_at')
			.eq('status', 'published')
			.order('updated_at', { ascending: false }),
		supabase
			.from('projects')
			.select('slug, updated_at')
			.eq('status', 'published')
			.order('updated_at', { ascending: false }),
	])

	const agora = new Date()

	const fixas: MetadataRoute.Sitemap = PAGINAS_FIXAS.map((p) => ({
		url: absoluteUrl(p.path),
		lastModified: agora,
		changeFrequency: p.changeFrequency,
		priority: p.priority,
	}))

	// lastModified real, e não a data de hoje: repetir "modificado agora" em
	// tudo faz o robô desconfiar do campo inteiro e passar a ignorá-lo.
	const doBlog: MetadataRoute.Sitemap = (posts.data ?? []).map((p) => ({
		url: absoluteUrl(`/blog/${p.slug}`),
		lastModified: new Date(p.updated_at ?? p.published_at ?? agora),
		changeFrequency: 'monthly',
		priority: 0.6,
	}))

	const doCatalogo: MetadataRoute.Sitemap = (produtos.data ?? []).map((p) => ({
		url: absoluteUrl(`/catalogo/${p.slug}`),
		lastModified: new Date(p.updated_at ?? agora),
		changeFrequency: 'monthly',
		priority: 0.8,
	}))

	const dosProjetos: MetadataRoute.Sitemap = (projetos.data ?? []).map((p) => ({
		url: absoluteUrl(`/projetos/${p.slug}`),
		lastModified: new Date(p.updated_at ?? agora),
		changeFrequency: 'monthly',
		priority: 0.7,
	}))

	return [...fixas, ...doCatalogo, ...dosProjetos, ...doBlog]
}
