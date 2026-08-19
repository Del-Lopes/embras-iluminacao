'use server'

// ================================================================
// hero.actions.ts — resolve os slides do hero da home.
//
// As imagens vêm da configuração, feitas sob medida para o hero. O banco entra
// só para dois detalhes que mudam sozinhos: o destino do botão, que precisa
// existir para não levar a um 404, e o nome do produto, usado no texto
// alternativo da foto.
// ================================================================

import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { HERO_SLIDES } from '@/config/hero-slides'

export type HeroSlide = {
	id: string
	projectImage: string
	projectAlt: string
	productImage: string
	productAlt: string
	headline: string
	tagline: string
	description: string
	cta: string
	href: string
	gradient: string
}

export const getHeroSlides = async (): Promise<HeroSlide[]> => {
	const supabase = await createSupabaseServerClient()

	// Só o que está publicado: apontar para um rascunho exporia conteúdo que
	// ainda não deveria estar no ar.
	const { data: products } = await supabase
		.from('products')
		.select('slug, name')
		.in('slug', HERO_SLIDES.map((s) => s.productSlug))
		.eq('status', 'published')

	const bySlug = new Map((products ?? []).map((p) => [p.slug, p]))

	return HERO_SLIDES.map((slide) => {
		const product = bySlug.get(slide.productSlug)

		return {
			id: slide.productSlug,
			projectImage: slide.projectImage,
			projectAlt: `Projeto de iluminação com ${slide.headline.toLowerCase()} da Embras`,
			productImage: slide.productImage,
			productAlt: product?.name ?? slide.headline,
			headline: slide.headline,
			tagline: slide.tagline,
			description: slide.description,
			cta: slide.cta,
			// Sem o produto cadastrado o botão leva ao catálogo, e não a uma
			// página que responderia 404.
			href: product ? `/catalogo/${product.slug}` : '/catalogo',
			gradient: slide.gradient,
		}
	})
}
