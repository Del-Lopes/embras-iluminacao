'use server'

// ================================================================
// hero.actions.ts — resolve os slides do hero da home.
//
// A fonte é a tabela home_banners, editada em /admin/banners. Enquanto ela
// estiver vazia, os três slides originais de src/config/hero-slides.ts entram
// no lugar: assim a home nunca aparece sem hero, nem antes de alguém cadastrar
// o primeiro banner nem se todos forem tirados do ar por engano.
// ================================================================

import { getHomeBanners } from '@/server/banner.actions'
import { gradientCss } from '@/config/banner-gradients'
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

const doConfig = (): HeroSlide[] =>
	HERO_SLIDES.map((slide) => ({
		id: slide.productSlug,
		projectImage: slide.projectImage,
		projectAlt: `Projeto de iluminação com ${slide.headline.toLowerCase()} da Embras`,
		productImage: slide.productImage,
		productAlt: slide.headline,
		headline: slide.headline,
		tagline: slide.tagline,
		description: slide.description,
		cta: slide.cta,
		href: '/catalogo',
		gradient: slide.gradient,
	}))

export const getHeroSlides = async (): Promise<HeroSlide[]> => {
	const banners = await getHomeBanners()
	if (!banners.length) return doConfig()

	return banners.map((b) => ({
		id: b.id,
		projectImage: b.project_image,
		projectAlt: `Projeto de iluminação com ${b.headline.toLowerCase()} da Embras`,
		productImage: b.product_image,
		productAlt: b.product?.name ?? b.headline,
		headline: b.headline,
		tagline: b.tagline ?? '',
		description: b.description ?? '',
		cta: b.cta_label,
		// Sem produto vinculado o botão leva ao catálogo, e não a uma página
		// que responderia 404.
		href: b.product ? `/catalogo/${b.product.slug}` : '/catalogo',
		gradient: gradientCss(b.gradient),
	}))
}
