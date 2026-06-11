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
  type ProductFormInput,
} from '@/server/product.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RichTextField } from '@/components/admin/rich-text-field'
import { R2Upload } from '@/components/admin/r2-upload'
import { R2ModelUpload } from '@/components/admin/r2-model-upload'
import { ProductImageGallery, type GalleryImage } from '@/components/admin/product-image-gallery'
import type { Product } from '@/lib/db/schema'

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  slug: z
    .string()
    .min(1, 'Slug é obrigatório')
    .regex(SLUG_RE, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  sku: z.string().min(1, 'SKU é obrigatório'),
  description: z.string().optional(),
  cover_image: z.string().optional(),
  status: z.enum(['draft', 'published']),
  environment: z.enum(['interno', 'externo']),
  primary_material: z.string().optional(),
  height_cm: z.string().optional(),
  width_cm: z.string().optional(),
  depth_cm: z.string().optional(),
  weight_kg: z.string().optional(),
  materials: z.string().optional(),
  socket_type: z.string().optional(),
  has_3d_model: z.boolean().optional(),
  model_3d_url: z.string().optional(),
  model_3d_poster: z.string().optional(),
  model_3d_alt: z.string().optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  seo_keywords: z.string().optional(),
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

type CategoryOption = { id: string; name: string; depth: number }

type Props = {
  categories: CategoryOption[]
  product?: Product
  productCategoryIds?: string[]
  productImages?: GalleryImage[]
}

export const ProductEditor = ({
  categories,
  product,
  productCategoryIds = [],
  productImages = [],
}: Props) => {
  const isEdit = !!product
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [categoryIds, setCategoryIds] = useState<string[]>(productCategoryIds)
  const [images, setImages] = useState<GalleryImage[]>(productImages)
  const slugTouched = useRef(isEdit)

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
      primary_material: product?.primary_material ?? '',
      height_cm: numToStr(product?.height_cm),
      width_cm: numToStr(product?.width_cm),
      depth_cm: numToStr(product?.depth_cm),
      weight_kg: numToStr(product?.weight_kg),
      materials: product?.materials?.join(', ') ?? '',
      socket_type: product?.socket_type ?? '',
      has_3d_model: product?.has_3d_model ?? false,
      model_3d_url: product?.model_3d_url ?? '',
      model_3d_poster: product?.model_3d_poster ?? '',
      model_3d_alt: product?.model_3d_alt ?? '',
      seo_title: product?.seo_title ?? '',
      seo_description: product?.seo_description ?? '',
      seo_keywords: product?.seo_keywords?.join(', ') ?? '',
    },
  })

  // Auto-generate slug from name until the user edits the slug.
  const nameValue = watch('name')
  useEffect(() => {
    if (!slugTouched.current) {
      setValue('slug', toSlug(nameValue), { shouldValidate: false })
    }
  }, [nameValue, setValue])

  const coverImage = watch('cover_image')
  const has3d = watch('has_3d_model')
  const model3dUrl = watch('model_3d_url')
  const model3dPoster = watch('model_3d_poster')

  const toggleCategory = (id: string) =>
    setCategoryIds((prev) =>
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

      {/* ---- Primary ---- */}
      <div className="editor-section">
        <div className="field-group">
          <Label htmlFor="name">Nome *</Label>
          <Input id="name" placeholder="Nome do produto" aria-invalid={!!errors.name} {...register('name')} />
          {errors.name && <span className="field-error">{errors.name.message}</span>}
        </div>

        <div className="editor-row">
          <div className="field-group">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              placeholder="meu-produto"
              aria-invalid={!!errors.slug}
              {...register('slug', { onChange: () => { slugTouched.current = true } })}
            />
            {errors.slug && <span className="field-error">{errors.slug.message}</span>}
          </div>

          <div className="field-group">
            <Label htmlFor="sku">SKU *</Label>
            <Input id="sku" placeholder="EMB-0001" aria-invalid={!!errors.sku} {...register('sku')} />
            {errors.sku && <span className="field-error">{errors.sku.message}</span>}
          </div>
        </div>

        <div className="editor-row">
          <div className="field-group">
            <Label htmlFor="environment">Área de uso *</Label>
            <select id="environment" className="editor-select" {...register('environment')}>
              <option value="interno">Interno</option>
              <option value="externo">Externo</option>
            </select>
          </div>

          <div className="field-group">
            <Label htmlFor="status">Status *</Label>
            <select id="status" className="editor-select" {...register('status')}>
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
            </select>
          </div>
        </div>
      </div>

      {/* ---- Categories (cascading, multiple) ---- */}
      <div className="editor-section">
        <p className="editor-section-title">Categorias</p>
        {categories.length === 0 ? (
          <p className="field-hint">
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

      {/* ---- Cover image ---- */}
      <div className="editor-section">
        <div className="field-group">
          <Label>Imagem de capa</Label>
          <input type="hidden" {...register('cover_image')} />
          <R2Upload value={coverImage ?? ''} onChange={(url) => setValue('cover_image', url)} />
        </div>
      </div>

      {/* ---- Carousel ---- */}
      <div className="editor-section">
        <div className="field-group">
          <Label>Imagens do carrossel</Label>
          <ProductImageGallery value={images} onChange={setImages} />
        </div>
      </div>

      {/* ---- Description ---- */}
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

      {/* ---- Technical specs ---- */}
      <div className="editor-section">
        <p className="editor-section-title">Especificações técnicas</p>
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
        <div className="editor-row">
          <div className="field-group">
            <Label htmlFor="primary_material">Material principal (filtro)</Label>
            <Input id="primary_material" placeholder="Ex: aço" {...register('primary_material')} />
          </div>
          <div className="field-group">
            <Label htmlFor="socket_type">Tipo de soquete</Label>
            <Input id="socket_type" placeholder="Ex: E27" {...register('socket_type')} />
          </div>
        </div>
        <div className="field-group">
          <Label htmlFor="materials">Materiais (separados por vírgula)</Label>
          <Input id="materials" placeholder="aço, vidro, latão" {...register('materials')} />
        </div>
      </div>

      {/* ---- 3D model (behind switcher; fields filled in a future step) ---- */}
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
              <R2ModelUpload value={model3dUrl ?? ''} onChange={(url) => setValue('model_3d_url', url)} />
            </div>
            <div className="editor-row">
              <div className="field-group">
                <Label>Poster (imagem de carregamento)</Label>
                <input type="hidden" {...register('model_3d_poster')} />
                <R2Upload value={model3dPoster ?? ''} onChange={(url) => setValue('model_3d_poster', url)} />
              </div>
              <div className="field-group">
                <Label htmlFor="model_3d_alt">Texto alternativo</Label>
                <Input id="model_3d_alt" placeholder="Descrição do modelo" {...register('model_3d_alt')} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---- SEO ---- */}
      <div className="editor-section editor-section--collapsible">
        <p className="editor-section-title">SEO (opcional)</p>
        <div className="field-group">
          <Label htmlFor="seo_title">SEO Title</Label>
          <Input id="seo_title" {...register('seo_title')} />
        </div>
        <div className="field-group">
          <Label htmlFor="seo_description">SEO Description</Label>
          <Textarea id="seo_description" rows={2} {...register('seo_description')} />
        </div>
        <div className="field-group">
          <Label htmlFor="seo_keywords">Keywords (separadas por vírgula)</Label>
          <Input id="seo_keywords" placeholder="luminária, led, externa" {...register('seo_keywords')} />
        </div>
      </div>

      <div className="editor-actions">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar produto'}
        </Button>
      </div>
    </form>
  )
}
