'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { R2Upload } from '@/components/admin/r2-upload'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { BANNER_GRADIENTS, DEFAULT_GRADIENT, gradientCss } from '@/config/banner-gradients'
import {
	deleteBannerAction,
	moveBannerAction,
	saveBannerAction,
	toggleBannerAction,
	type BannerProductOption,
	type BannerWithProduct,
} from '@/server/banner.actions'

type Props = {
	banners: BannerWithProduct[]
	products: BannerProductOption[]
}

const VAZIO = {
	id: '',
	headline: '',
	tagline: '',
	description: '',
	ctaLabel: 'Ver o produto',
	projectImage: '',
	productImage: '',
	productId: '',
	gradient: DEFAULT_GRADIENT.key,
	isActive: true,
}

type Rascunho = typeof VAZIO

const paraRascunho = (b: BannerWithProduct): Rascunho => ({
	id: b.id,
	headline: b.headline,
	tagline: b.tagline ?? '',
	description: b.description ?? '',
	ctaLabel: b.cta_label,
	projectImage: b.project_image,
	productImage: b.product_image,
	productId: b.product_id ?? '',
	gradient: b.gradient,
	isActive: b.is_active,
})

// Seletor de produto: lista o que já está cadastrado, com busca por nome ou
// SKU. Evita o campo de URL colada, que quebra silenciosamente quando o slug
// do produto muda.
function ProductPicker({
	produtos,
	valor,
	onChange,
}: {
	produtos: BannerProductOption[]
	valor: string
	onChange: (id: string) => void
}) {
	const [aberto, setAberto] = useState(false)
	const [busca, setBusca] = useState('')

	const selecionado = produtos.find((p) => p.id === valor) ?? null

	const filtrados = useMemo(() => {
		const termo = busca.trim().toLowerCase()
		if (!termo) return produtos
		return produtos.filter(
			(p) => p.name.toLowerCase().includes(termo) || p.sku.toLowerCase().includes(termo)
		)
	}, [produtos, busca])

	return (
		<div className="banner-picker">
			<button type="button" className="banner-picker-trigger" onClick={() => setAberto((v) => !v)}>
				<span className={selecionado ? '' : 'banner-picker-empty'}>
					{selecionado ? selecionado.name : 'Nenhum produto vinculado'}
				</span>
				<Search size={15} strokeWidth={1.7} />
			</button>

			{aberto && (
				<div className="banner-picker-panel">
					<div className="banner-picker-search">
						<Search size={14} strokeWidth={1.7} />
						<input
							type="text"
							value={busca}
							onChange={(e) => setBusca(e.target.value)}
							placeholder="Buscar por nome ou SKU"
							autoFocus
						/>
					</div>

					<ul className="banner-picker-list">
						<li>
							<button
								type="button"
								className="banner-picker-item"
								onClick={() => {
									onChange('')
									setAberto(false)
								}}
							>
								<span className="banner-picker-empty">Sem vínculo</span>
								{!valor && <Check size={14} strokeWidth={2} />}
							</button>
						</li>

						{filtrados.map((p) => (
							<li key={p.id}>
								<button
									type="button"
									className="banner-picker-item"
									onClick={() => {
										onChange(p.id)
										setAberto(false)
									}}
								>
									<span>
										{p.name}
										<small>{p.sku}</small>
									</span>
									{valor === p.id && <Check size={14} strokeWidth={2} />}
								</button>
							</li>
						))}

						{!filtrados.length && (
							<li className="banner-picker-none">Nenhum produto encontrado.</li>
						)}
					</ul>
				</div>
			)}
		</div>
	)
}

export function BannersManager({ banners, products }: Props) {
	const [rascunho, setRascunho] = useState<Rascunho | null>(null)
	const [estado, salvar, salvando] = useActionState(saveBannerAction, {})
	const formRef = useRef<HTMLFormElement>(null)

	// O fechamento do formulário reage ao RESULTADO da ação, e não ao clique:
	// fechando no clique, um erro de validação sumiria da tela antes de ser
	// lido.
	useEffect(() => {
		if (estado.ok) {
			toast.success('Banner salvo.')
			setRascunho(null)
		} else if (estado.error) {
			toast.error(estado.error)
		}
	}, [estado])

	const editar = (b: BannerWithProduct) => {
		setRascunho(paraRascunho(b))
		// O formulário fica no topo; sem isso, editar o último item da lista
		// parece não fazer nada.
		requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
	}

	const campo = (k: keyof Rascunho, v: string | boolean) =>
		setRascunho((r) => (r ? { ...r, [k]: v } : r))

	return (
		<div className="banners-manager">
			{/* ---------- Formulário ---------- */}
			{rascunho ? (
				<form ref={formRef} action={salvar} className="editor-section banner-form">
					<div className="banner-form-head">
						<h2 className="editor-section-title">
							{rascunho.id ? 'Editar banner' : 'Novo banner'}
						</h2>
						<button
							type="button"
							className="btn-ghost"
							onClick={() => setRascunho(null)}
							aria-label="Cancelar"
						>
							<X size={16} strokeWidth={1.7} />
						</button>
					</div>

					<input type="hidden" name="id" value={rascunho.id} />
					<input type="hidden" name="projectImage" value={rascunho.projectImage} />
					<input type="hidden" name="productImage" value={rascunho.productImage} />
					<input type="hidden" name="productId" value={rascunho.productId} />

					<div className="banner-form-cols">
						{/* Coluna esquerda do slide */}
						<fieldset className="banner-fieldset">
							<legend>Lado esquerdo (projeto)</legend>

							<div className="field-group">
								<label className="cat-label">Imagem</label>
								<R2Upload
									value={rascunho.projectImage}
									onChange={(url) => campo('projectImage', url)}
									group="banner"
									folder={rascunho.headline || 'banner'}
								/>
							</div>

							<div className="field-group">
								<label className="cat-label" htmlFor="headline">
									Título (categoria)
								</label>
								<Input
									id="headline"
									name="headline"
									value={rascunho.headline}
									onChange={(e) => campo('headline', e.target.value)}
									placeholder="Postes"
									maxLength={60}
									required
								/>
							</div>

							<div className="field-group">
								<label className="cat-label" htmlFor="tagline">
									Linha de apoio
								</label>
								<Input
									id="tagline"
									name="tagline"
									value={rascunho.tagline}
									onChange={(e) => campo('tagline', e.target.value)}
									placeholder="Presença que estrutura o espaço"
									maxLength={120}
								/>
							</div>
						</fieldset>

						{/* Coluna direita do slide */}
						<fieldset className="banner-fieldset">
							<legend>Lado direito (produto)</legend>

							<div className="field-group">
								<label className="cat-label">Imagem</label>
								<R2Upload
									value={rascunho.productImage}
									onChange={(url) => campo('productImage', url)}
									group="banner"
									folder={rascunho.headline || 'banner'}
								/>
							</div>

							<div className="field-group">
								<label className="cat-label" htmlFor="description">
									Texto descritivo
								</label>
								<Textarea
									id="description"
									name="description"
									rows={3}
									value={rascunho.description}
									onChange={(e) => campo('description', e.target.value)}
									placeholder="Estrutura, altura e acabamento pensados para..."
									maxLength={280}
								/>
							</div>

							<div className="field-group">
								<label className="cat-label">Produto vinculado</label>
								<ProductPicker
									produtos={products}
									valor={rascunho.productId}
									onChange={(id) => campo('productId', id)}
								/>
								<p className="field-hint">
									Define o destino do botão. Sem vínculo, ele leva ao catálogo.
								</p>
							</div>

							<div className="field-group">
								<label className="cat-label" htmlFor="ctaLabel">
									Texto do botão
								</label>
								<Input
									id="ctaLabel"
									name="ctaLabel"
									value={rascunho.ctaLabel}
									onChange={(e) => campo('ctaLabel', e.target.value)}
									maxLength={40}
								/>
							</div>
						</fieldset>
					</div>

					<div className="banner-form-row">
						<div className="field-group">
							<label className="cat-label" htmlFor="gradient">
								Fundo do slide
							</label>
							<select
								id="gradient"
								name="gradient"
								className="editor-select"
								value={rascunho.gradient}
								onChange={(e) => campo('gradient', e.target.value)}
							>
								{BANNER_GRADIENTS.map((g) => (
									<option key={g.key} value={g.key}>
										{g.label}
									</option>
								))}
							</select>
							<span
								className="banner-gradient-preview"
								style={{ backgroundImage: gradientCss(rascunho.gradient) }}
								aria-hidden
							/>
						</div>

						<label className="banner-switch">
							<input
								type="checkbox"
								name="isActive"
								checked={rascunho.isActive}
								onChange={(e) => campo('isActive', e.target.checked)}
							/>
							Exibir na home
						</label>
					</div>

					<div className="banner-form-actions">
						<button type="submit" className="btn-primary" disabled={salvando}>
							{salvando ? 'Salvando…' : 'Salvar banner'}
						</button>
					</div>
				</form>
			) : (
				<button type="button" className="btn-primary banner-new" onClick={() => setRascunho({ ...VAZIO })}>
					<Plus size={16} strokeWidth={2} />
					Novo banner
				</button>
			)}

			{/* ---------- Lista ---------- */}
			{!banners.length ? (
				<p className="dashboard-empty">
					Nenhum banner cadastrado. Enquanto a lista estiver vazia, a home exibe os
					três slides originais que ficaram no código.
				</p>
			) : (
				<ul className="banner-list">
					{banners.map((b, i) => (
						<li key={b.id} className={b.is_active ? 'banner-row' : 'banner-row banner-row--off'}>
							<span className="banner-order">{i + 1}</span>

							<span
								className="banner-thumbs"
								style={{ backgroundImage: gradientCss(b.gradient) }}
							>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img src={b.project_image} alt="" className="banner-thumb" />
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img src={b.product_image} alt="" className="banner-thumb banner-thumb--product" />
							</span>

							<span className="banner-info">
								<strong>{b.headline}</strong>
								<small>{b.tagline || 'sem linha de apoio'}</small>
								<small className="banner-info-link">
									{b.product ? b.product.name : 'sem produto vinculado'}
								</small>
							</span>

							<span className="banner-actions">
								<form action={moveBannerAction}>
									<input type="hidden" name="id" value={b.id} />
									<input type="hidden" name="direction" value="up" />
									<button type="submit" className="btn-ghost" aria-label="Subir" disabled={i === 0}>
										<ArrowUp size={15} strokeWidth={1.8} />
									</button>
								</form>

								<form action={moveBannerAction}>
									<input type="hidden" name="id" value={b.id} />
									<input type="hidden" name="direction" value="down" />
									<button
										type="submit"
										className="btn-ghost"
										aria-label="Descer"
										disabled={i === banners.length - 1}
									>
										<ArrowDown size={15} strokeWidth={1.8} />
									</button>
								</form>

								<form action={toggleBannerAction}>
									<input type="hidden" name="id" value={b.id} />
									<input type="hidden" name="isActive" value={String(b.is_active)} />
									<button
										type="submit"
										className="btn-ghost"
										aria-label={b.is_active ? 'Tirar do ar' : 'Publicar'}
									>
										{b.is_active ? <Eye size={15} strokeWidth={1.8} /> : <EyeOff size={15} strokeWidth={1.8} />}
									</button>
								</form>

								<button
									type="button"
									className="btn-ghost"
									onClick={() => editar(b)}
									aria-label="Editar"
								>
									<Pencil size={15} strokeWidth={1.8} />
								</button>

								<form
									action={deleteBannerAction}
									onSubmit={(e) => {
										if (!confirm(`Excluir o banner "${b.headline}"?`)) e.preventDefault()
									}}
								>
									<input type="hidden" name="id" value={b.id} />
									<button type="submit" className="btn-ghost btn-ghost--danger" aria-label="Excluir">
										<Trash2 size={15} strokeWidth={1.8} />
									</button>
								</form>
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
