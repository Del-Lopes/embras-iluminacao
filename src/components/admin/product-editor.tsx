'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  createProductAction,
  updateProductAction,
  isProductSlugTaken,
  type ProductFormInput,
} from '@/server/product.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextField } from '@/components/admin/rich-text-field'
import { R2Upload } from '@/components/admin/r2-upload'
import { R2ModelUpload } from '@/components/admin/r2-model-upload'
import { ProductImageGallery, type GalleryImage } from '@/components/admin/product-image-gallery'
import type { Product, ProductCharacteristic, ProductCharacteristicType } from '@/lib/db/schema'

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  // Slug opcional — gerado a partir do nome quando deixado em branco.
  slug: z
    .string()
    .optional()
    .refine(
      (s) => !s || SLUG_RE.test(s),
      'Slug deve conter apenas letras minúsculas, números e hífens'
    ),
  sku: z.string().min(1, 'SKU é obrigatório'),
  description: z.string().optional(),
  cover_image: z.string().optional(),
  status: z.enum(['draft', 'published']),
  environment: z.enum(['interno', 'externo']),
  height_cm: z.string().optional(),
  width_cm: z.string().optional(),
  depth_cm: z.string().optional(),
  weight_kg: z.string().optional(),
  has_3d_model: z.boolean().optional(),
  model_3d_url: z.string().optional(),
  model_3d_poster: z.string().optional(),
  model_3d_alt: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const toSlug = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100)

const numToStr = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n))

// Aviso de formatos/tamanho exibido abaixo dos uploaders de imagem.
const IMAGE_UPLOAD_HINT = 'Formatos aceitos: JPG, PNG, WebP, TIFF. Tamanho máximo 5mb por arquivo.'

type CategoryOption = { id: string; name: string; depth: number }

// Grupos de características exibidos no seletor à direita do editor.
const CHARACTERISTIC_GROUPS: { type: ProductCharacteristicType; label: string }[] = [
  { type: 'material_principal', label: 'Material Principal' },
  { type: 'material_secundario', label: 'Materiais Secundários' },
  { type: 'soquete', label: 'Tipo de Soquete' },
]

type Props = {
  categories: CategoryOption[]
  characteristics: ProductCharacteristic[]
  product?: Product
  productCategoryIds?: string[]
  productCharacteristicIds?: string[]
  productImages?: GalleryImage[]
}

export const ProductEditor = ({
  categories,
  characteristics,
  product,
  productCategoryIds = [],
  productCharacteristicIds = [],
  productImages = [],
}: Props) => {
  const isEdit = !!product
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [categoryIds, setCategoryIds] = useState<string[]>(productCategoryIds)
  const [characteristicIds, setCharacteristicIds] = useState<string[]>(productCharacteristicIds)
  const [images, setImages] = useState<GalleryImage[]>(productImages)
  const slugTouched = useRef(isEdit)
  const [showSlug, setShowSlug] = useState(false)
  const [slugTaken, setSlugTaken] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product?.name ?? '',
      slug: product?.slug ?? '',
      sku: product?.sku ?? '',
      description: product?.description ?? '',
      cover_image: product?.cover_image ?? '',
      status: product?.status ?? 'draft',
      environment: product?.environment ?? 'interno',
      height_cm: numToStr(product?.height_cm),
      width_cm: numToStr(product?.width_cm),
      depth_cm: numToStr(product?.depth_cm),
      weight_kg: numToStr(product?.weight_kg),
      has_3d_model: product?.has_3d_model ?? false,
      model_3d_url: product?.model_3d_url ?? '',
      model_3d_poster: product?.model_3d_poster ?? '',
      model_3d_alt: product?.model_3d_alt ?? '',
    },
  })

  // Auto-generate slug from name until the user edits the slug.
  const nameValue = watch('name')
  useEffect(() => {
    if (!slugTouched.current) {
      setValue('slug', toSlug(nameValue), { shouldValidate: false })
    }
  }, [nameValue, setValue])

  // Slug efetivo (informado ou derivado do nome) + checagem de duplicidade.
  const slugValue = watch('slug') ?? ''
  const effectiveSlug = slugValue.trim() || toSlug(nameValue)
  useEffect(() => {
    if (!effectiveSlug || !SLUG_RE.test(effectiveSlug)) {
      setSlugTaken(false)
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      const taken = await isProductSlugTaken(effectiveSlug, product?.id)
      if (!cancelled) setSlugTaken(taken)
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [effectiveSlug, product?.id])

  const coverImage = watch('cover_image')
  const has3d = watch('has_3d_model')
  const model3dUrl = watch('model_3d_url')
  const model3dPoster = watch('model_3d_poster')

  const toggleCategory = (id: string) =>
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )

  const toggleCharacteristic = (id: string) =>
    setCharacteristicIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )

  const handleAiDescription = () => {
    toast.info('Geração de descrição por IA será habilitada em uma próxima etapa.')
  }

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null)

    const payload: ProductFormInput = {
      ...(isEdit ? { id: product!.id } : {}),
      ...data,
      category_ids: categoryIds,
      characteristic_ids: characteristicIds,
      images,
      has_3d_model: !!data.has_3d_model,
    }

    const result = isEdit
      ? await updateProductAction(payload)
      : await createProductAction(payload)

    if ('error' in result) {
      setServerError(result.error)
      toast.error(result.error)
      return
    }

    toast.success(isEdit ? 'Produto atualizado!' : 'Produto criado!')
    setTimeout(() => router.push('/admin/products'), 800)
  })

  return (
    <form onSubmit={onSubmit} className="post-editor" noValidate>
      {serverError && <p className="form-error" role="alert">{serverError}</p>}

      {/* ---- Layout em pares (cada linha: esquerda 1fr + direita 320px fixa) ---- */}
      <div className="editor-stack">
        {/* Linha 1 — Nome | Status + Criar produto */}
        <div className="editor-pair">
          <div className="editor-section">
            {/* Nome + SKU na mesma linha (50/50) */}
            <div className="editor-row editor-row--2">
              <div className="field-group">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" placeholder="Nome do produto" aria-invalid={!!errors.name} {...register('name')} />
                {errors.name && <span className="field-error">{errors.name.message}</span>}
                {slugTaken && (
                  <span className="field-warning">
                    ⚠ Já existe um produto com este slug (<code>{effectiveSlug}</code>). Defina um slug personalizado para diferenciar.
                  </span>
                )}
              </div>
              <div className="field-group">
                <Label htmlFor="sku">SKU *</Label>
                <Input id="sku" placeholder="EMB-0001" aria-invalid={!!errors.sku} {...register('sku')} />
                {errors.sku && <span className="field-error">{errors.sku.message}</span>}
              </div>
            </div>

            {/* Slug — opcional e recolhido */}
            <div className="field-group">
              <Label htmlFor="slug">Slug</Label>
              <button
                type="button"
                className="slug-toggle"
                onClick={() => setShowSlug((v) => !v)}
                aria-expanded={showSlug}
              >
                <span className={`slug-toggle-arrow${showSlug ? ' slug-toggle-arrow--open' : ''}`} aria-hidden="true">›</span>
                <span className="slug-toggle-text">{effectiveSlug ? `/${effectiveSlug}` : 'definir manualmente'}</span>
              </button>
              {showSlug && (
                <>
                  <Input
                    id="slug"
                    placeholder="meu-produto"
                    aria-label="Slug personalizado"
                    aria-invalid={!!errors.slug}
                    {...register('slug', { onChange: () => { slugTouched.current = true } })}
                  />
                  <span className="field-hint">Deixe em branco para gerar automaticamente a partir do nome.</span>
                  {errors.slug && <span className="field-error">{errors.slug.message}</span>}
                </>
              )}
            </div>
          </div>

          {/* Status + botão Criar produto — primeiro container da direita */}
          <div className="editor-section">
            <div className="field-group">
              <Label htmlFor="status">Status *</Label>
              <select id="status" className="editor-select" {...register('status')}>
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
              </select>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar produto'}
            </Button>
          </div>
        </div>

        {/* Linha 2 — Descrição | Área de uso + Categorias */}
        <div className="editor-pair">
          <div className="editor-section">
            <div className="field-group">
              <div className="field-label-row">
                <Label>Descrição</Label>
                <button type="button" className="btn-secondary btn-ai" onClick={handleAiDescription}>
                  ✨ Gerar com IA
                </button>
              </div>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <RichTextField value={field.value ?? ''} onChange={field.onChange} />
                )}
              />
            </div>
          </div>

          <div className="editor-section">
            {/* Área de uso — no topo do bloco de categorias */}
            <div className="field-group">
              <Label htmlFor="environment">Área de uso *</Label>
              <select id="environment" className="editor-select" {...register('environment')}>
                <option value="interno">Interno</option>
                <option value="externo">Externo</option>
              </select>
            </div>

            <p className="editor-section-title">Categorias</p>
            {categories.length === 0 ? (
              <p className="field-hint" style={{ margin: 0 }}>
                Nenhuma categoria cadastrada. Crie em “Categorias” antes de classificar o produto.
              </p>
            ) : (
              <div className="category-checklist">
                {categories.map((cat) => (
                  <label key={cat.id} className="category-check" style={{ paddingLeft: cat.depth * 18 }}>
                    <input
                      type="checkbox"
                      checked={categoryIds.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                    />
                    <span>{cat.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Linha 3 — Imagens do produto | Imagem de capa */}
        <div className="editor-pair">
          <div className="editor-section">
            <div className="field-group">
              <Label>Imagens do produto</Label>
              <ProductImageGallery value={images} onChange={setImages} folder={effectiveSlug} />
              <span className="field-hint field-hint--xs">{IMAGE_UPLOAD_HINT}</span>
            </div>
          </div>
          <div className="editor-section">
            <div className="field-group">
              <Label>Imagem de capa</Label>
              <input type="hidden" {...register('cover_image')} />
              <R2Upload
                value={coverImage ?? ''}
                onChange={(url) => setValue('cover_image', url)}
                group="product"
                folder={effectiveSlug}
              />
              <span className="field-hint field-hint--xs">{IMAGE_UPLOAD_HINT}</span>
            </div>
          </div>
        </div>

        {/* Linha 4 — Dimensões e Peso | Especificações */}
        <div className="editor-pair">
          <div className="editor-section">
            <p className="editor-section-title">Dimensões e Peso</p>
            <div className="editor-row editor-row--4">
              <div className="field-group">
                <Label htmlFor="height_cm">Altura (cm)</Label>
                <Input id="height_cm" type="number" step="0.01" {...register('height_cm')} />
              </div>
              <div className="field-group">
                <Label htmlFor="width_cm">Largura (cm)</Label>
                <Input id="width_cm" type="number" step="0.01" {...register('width_cm')} />
              </div>
              <div className="field-group">
                <Label htmlFor="depth_cm">Profundidade (cm)</Label>
                <Input id="depth_cm" type="number" step="0.01" {...register('depth_cm')} />
              </div>
              <div className="field-group">
                <Label htmlFor="weight_kg">Peso (kg)</Label>
                <Input id="weight_kg" type="number" step="0.001" {...register('weight_kg')} />
              </div>
            </div>
          </div>
          <div className="editor-section">
            <p className="editor-section-title">Especificações</p>
            {characteristics.length === 0 ? (
              <p className="field-hint" style={{ margin: 0 }}>
                Nenhuma especificação cadastrada. Crie em “Especificações”.
              </p>
            ) : (
              CHARACTERISTIC_GROUPS.map((group) => {
                const opts = characteristics.filter((c) => c.type === group.type)
                return (
                  <div key={group.type} className="char-group">
                    <p className="char-group-label">{group.label}</p>
                    {opts.length === 0 ? (
                      <p className="field-hint" style={{ margin: 0 }}>—</p>
                    ) : (
                      <div className="category-checklist">
                        {opts.map((c) => (
                          <label key={c.id} className="category-check">
                            <input
                              type="checkbox"
                              checked={characteristicIds.includes(c.id)}
                              onChange={() => toggleCharacteristic(c.id)}
                            />
                            <span>{c.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Linha 5 — Modelo 3D | (direita vazia) */}
        <div className="editor-pair">
          <div className="editor-section">
            <label className="switcher-row">
              <input type="checkbox" {...register('has_3d_model')} />
              <span className="editor-section-title" style={{ margin: 0 }}>Modelo 3D</span>
            </label>
            {has3d && (
              <div className="editor-3d-fields">
                <p className="field-hint">
                  Envie um arquivo <strong>.glb</strong> (ou cole uma URL). O poster é a imagem exibida enquanto o modelo carrega.
                </p>
                <div className="field-group">
                  <Label>Modelo 3D (.glb)</Label>
                  <input type="hidden" {...register('model_3d_url')} />
                  <R2ModelUpload value={model3dUrl ?? ''} onChange={(url) => setValue('model_3d_url', url)} folder={effectiveSlug} />
                </div>
                <div className="editor-row">
                  <div className="field-group">
                    <Label>Poster (imagem de carregamento)</Label>
                    <input type="hidden" {...register('model_3d_poster')} />
                    <R2Upload
                      value={model3dPoster ?? ''}
                      onChange={(url) => setValue('model_3d_poster', url)}
                      group="model"
                      folder={effectiveSlug}
                    />
                  </div>
                  <div className="field-group">
                    <Label htmlFor="model_3d_alt">Texto alternativo</Label>
                    <Input id="model_3d_alt" placeholder="Descrição do modelo" {...register('model_3d_alt')} />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="editor-pair-spacer" />
        </div>

      </div>
    </form>
  )
}
