'use server'

// ================================================================
// banner.actions.ts — os slides do hero da home.
//
// Antes eles viviam fixos em src/config/hero-slides.ts. A leitura pública é
// feita por getHomeBanners; o resto é o CRUD do painel, todo com o cliente
// normal, para a RLS continuar valendo (só admin e editor escrevem).
// ================================================================

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import type { HomeBanner } from '@/lib/db/schema'

// Linha do banner já com o que a home precisa do produto: o slug monta o
// link, e o nome vira o texto alternativo da foto.
export type BannerWithProduct = HomeBanner & {
	product: { slug: string; name: string } | null
}

const SELECT = '*, product:products(slug, name)'

// ================================================================
// Leitura
// ================================================================

// Home: só os ativos, na ordem definida no painel. O created_at desempata,
// senão dois banners com a mesma posição trocariam de lugar entre recargas.
export const getHomeBanners = async (): Promise<BannerWithProduct[]> => {
	const supabase = await createSupabaseServerClient()
	const { data } = await supabase
		.from('home_banners')
		.select(SELECT)
		.eq('is_active', true)
		.order('sort_order', { ascending: true })
		.order('created_at', { ascending: true })

	return (data ?? []) as unknown as BannerWithProduct[]
}

// Painel: todos, inclusive os fora do ar.
export const getBanners = async (): Promise<BannerWithProduct[]> => {
	const supabase = await createSupabaseServerClient()
	const { data } = await supabase
		.from('home_banners')
		.select(SELECT)
		.order('sort_order', { ascending: true })
		.order('created_at', { ascending: true })

	return (data ?? []) as unknown as BannerWithProduct[]
}

// Lista para o seletor de produto do formulário. Só o publicado: apontar para
// um rascunho levaria o visitante a uma página que ainda não existe.
export type BannerProductOption = { id: string; name: string; sku: string }

export const getBannerProductOptions = async (): Promise<BannerProductOption[]> => {
	const supabase = await createSupabaseServerClient()
	const { data } = await supabase
		.from('products')
		.select('id, name, sku')
		.eq('status', 'published')
		.order('name', { ascending: true })

	return (data ?? []) as BannerProductOption[]
}

// ================================================================
// Escrita
// ================================================================

export type BannerFormState = { error?: string; ok?: boolean }

type BannerInput = {
	id?: string
	headline: string
	tagline: string
	description: string
	ctaLabel: string
	projectImage: string
	productImage: string
	productId: string | null
	gradient: string
	isActive: boolean
}

const parse = (formData: FormData): BannerInput => ({
	id: (formData.get('id') as string) || undefined,
	headline: ((formData.get('headline') as string) ?? '').trim(),
	tagline: ((formData.get('tagline') as string) ?? '').trim(),
	description: ((formData.get('description') as string) ?? '').trim(),
	ctaLabel: ((formData.get('ctaLabel') as string) ?? '').trim() || 'Ver o produto',
	projectImage: ((formData.get('projectImage') as string) ?? '').trim(),
	productImage: ((formData.get('productImage') as string) ?? '').trim(),
	productId: ((formData.get('productId') as string) ?? '').trim() || null,
	gradient: ((formData.get('gradient') as string) ?? 'areia').trim(),
	isActive: formData.get('isActive') === 'on',
})

const revalidate = () => {
	revalidatePath('/admin/banners')
	revalidatePath('/')
}

export const saveBannerAction = async (
	_prev: BannerFormState,
	formData: FormData
): Promise<BannerFormState> => {
	const input = parse(formData)

	if (!input.headline) return { error: 'Informe o título do banner.' }
	if (!input.projectImage) return { error: 'Envie a imagem da esquerda (projeto).' }
	if (!input.productImage) return { error: 'Envie a imagem do produto.' }

	const supabase = await createSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()
	if (!user) return { error: 'Sessão expirada. Entre de novo.' }

	const linha = {
		headline: input.headline,
		tagline: input.tagline || null,
		description: input.description || null,
		cta_label: input.ctaLabel,
		project_image: input.projectImage,
		product_image: input.productImage,
		product_id: input.productId,
		gradient: input.gradient,
		is_active: input.isActive,
	}

	if (input.id) {
		const { error } = await supabase.from('home_banners').update(linha).eq('id', input.id)
		if (error) return { error: error.message }
	} else {
		// Entra no fim da fila: buscar a maior posição e somar 1 evita que o
		// banner novo apareça na frente sem ninguém ter pedido.
		const { data: ultimo } = await supabase
			.from('home_banners')
			.select('sort_order')
			.order('sort_order', { ascending: false })
			.limit(1)
			.maybeSingle()

		const { error } = await supabase.from('home_banners').insert({
			...linha,
			sort_order: (ultimo?.sort_order ?? -1) + 1,
			author_id: user.id,
		})
		if (error) return { error: error.message }
	}

	revalidate()
	return { ok: true }
}

export const deleteBannerAction = async (formData: FormData): Promise<void> => {
	const id = formData.get('id') as string
	if (!id) return

	const supabase = await createSupabaseServerClient()
	// As imagens ficam no R2: apagar a linha não as remove, e é de propósito.
	// Uma foto de banner costuma ser reaproveitada, e o gerenciador de Storage
	// já existe para a limpeza.
	await supabase.from('home_banners').delete().eq('id', id)

	revalidate()
}

export const toggleBannerAction = async (formData: FormData): Promise<void> => {
	const id = formData.get('id') as string
	const ativo = formData.get('isActive') === 'true'
	if (!id) return

	const supabase = await createSupabaseServerClient()
	await supabase.from('home_banners').update({ is_active: !ativo }).eq('id', id)

	revalidate()
}

// Sobe ou desce um banner trocando a posição com o vizinho. Reordenar assim,
// aos pares, mantém a lista coerente mesmo se as posições estiverem com
// buracos ou repetidas, o que um "salvar tudo" com índices recalculados não
// garante quando duas abas editam ao mesmo tempo.
export const moveBannerAction = async (formData: FormData): Promise<void> => {
	const id = formData.get('id') as string
	const direcao = formData.get('direction') === 'up' ? -1 : 1
	if (!id) return

	const supabase = await createSupabaseServerClient()
	const { data } = await supabase
		.from('home_banners')
		.select('id, sort_order')
		.order('sort_order', { ascending: true })
		.order('created_at', { ascending: true })

	const lista = data ?? []
	const atual = lista.findIndex((b) => b.id === id)
	const vizinho = atual + direcao
	if (atual < 0 || vizinho < 0 || vizinho >= lista.length) return

	// Grava a posição pelo ÍNDICE da lista, e não trocando os valores antigos:
	// se dois banners tiverem o mesmo sort_order, a troca simples não mudaria
	// nada e o botão pareceria quebrado.
	const reordenada = [...lista]
	const [movido] = reordenada.splice(atual, 1)
	reordenada.splice(vizinho, 0, movido)

	await Promise.all(
		reordenada.map((b, i) =>
			b.sort_order === i
				? Promise.resolve()
				: supabase.from('home_banners').update({ sort_order: i }).eq('id', b.id)
		)
	)

	revalidate()
}
