import type { MetadataRoute } from 'next'
import { absoluteUrl, siteUrl } from '@/config/seo'

// ================================================================
// robots.txt
//
// Antes liberava tudo, inclusive o painel, e apontava o sitemap para um
// domínio que não existe.
//
// O painel é bloqueado por educação com o robô, não por segurança: quem
// protege /admin é o middleware de sessão. O Disallow só evita gastar
// orçamento de rastreio em páginas que respondem redirect para o login.
// ================================================================

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: '*',
				allow: '/',
				disallow: [
					'/admin',
					'/api',

					// Busca interna: o Google pede explicitamente para não indexar
					// resultado de busca de site, que é conteúdo montado na hora.
					'/*?q=',

					// Ordenação: muda a ordem, não o conteúdo. Cada valor criaria
					// uma cópia da mesma listagem.
					'/*?sort=',

					// Filtros do catálogo e dos projetos. Combinados, poucas opções
					// viram centenas de URLs quase idênticas, e o robô gasta nelas o
					// tempo que deveria gastar nas páginas de conteúdo.
					'/*?tipo=',
					'/*?environment=',
					'/*?material=',
					'/*?location=',
					'/*?period=',
				],

				// ?page= e ?category= NÃO entram na lista acima, embora sejam
				// parâmetros: a paginação é o caminho pelo qual o robô alcança os
				// posts além da primeira página, e as categorias são a estrutura
				// do blog. Bloqueá-los deixaria 544 posts dependendo só do
				// sitemap, sem nenhum link interno apontando para eles.
			},
		],
		sitemap: absoluteUrl('/sitemap.xml'),
		host: siteUrl,
	}
}
