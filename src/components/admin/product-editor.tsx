'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronDown } from 'lucide-react'
import {
  createProductAction,
  updateProductAction,
  isProductSlugTaken,
  type ProductFormInput,
} from '@/server/product.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RichTextField } from '@/components/admin/rich-text-field'
import { R2Upload } from '@/components/admin/r2-upload'
import { R2ModelUpload } from '@/components/admin/r2-model-upload'
import { ProductImageGallery, type GalleryImage } from '@/components/admin/product-image-gallery'
import type {
  Model3dArScale,
  Model3dMaterialLabels,
  Model3dObjectType,
  Model3dVariation,
  Product,
  ProductCharacteristic,
} from '@/lib/db/schema'

// The variations panel pulls in @google/model-viewer to read materials, so it's
// loaded on demand — only when the 3D switcher is on. Products without a 3D model
// never download the library in the editor.
const Model3dVariations = dynamic(
  () => import('@/components/admin/Model3dVariations').then((m) => m.Model3dVariations),
  { ssr: false, loading: () => <p className="field-hint">Carregando editor 3D…</p> }
)

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
  short_description: z.string().optional(),
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
  model_3d_filename: z.string().optional(),
  model_3d_object_type: z.enum(['floor', 'wall']).optional(),
  model_3d_ar_scale: z.enum(['fixed', 'auto']).optional(),
  model_3d_material_labels: z.record(z.string(), z.string()).optional(),
  model_3d_variations: z
    .array(
      z.object({
        material: z.string(),
        name: z.string(),
        type: z.enum(['color', 'texture']),
        color: z.string().optional().nullable(),
        texture_url: z.string().optional().nullable(),
      })
    )
    .optional(),
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

type Props = {
  categories: CategoryOption[]
  characteristics: ProductCharacteristic[]
  product?: Product
  productPrimaryCategoryId?: string | null
  productSecondaryCategoryIds?: string[]
  productPrimaryMaterialId?: string | null
  productSecondaryMaterialIds?: string[]
  productSoqueteIds?: string[]
  productImages?: GalleryImage[]
}

export const ProductEditor = ({
  categories,
  characteristics,
  product,
  productPrimaryCategoryId = null,
  productSecondaryCategoryIds = [],
  productPrimaryMaterialId = null,
  productSecondaryMaterialIds = [],
  productSoqueteIds = [],
  productImages = [],
}: Props) => {
  const isEdit = !!product
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [primaryCategoryId, setPrimaryCategoryId] = useState<string>(productPrimaryCategoryId ?? '')
  const [secondaryCategoryIds, setSecondaryCategoryIds] = useState<string[]>(productSecondaryCategoryIds)
  const [primaryMaterialId, setPrimaryMaterialId] = useState<string>(productPrimaryMaterialId ?? '')
  const [secondaryMaterialIds, setSecondaryMaterialIds] = useState<string[]>(productSecondaryMaterialIds)
  const [soqueteIds, setSoqueteIds] = useState<string[]>(productSoqueteIds)
  const [images, setImages] = useState<GalleryImage[]>(productImages)

  // Auto-save (rascunho) — só na criação. Cria o produto assim que houver nome e
  // vai atualizando; se o usuário sair, o rascunho e os arquivos permanecem.
  const draftIdRef = useRef<string | null>(product?.id ?? null)
  const savingRef = useRef(false)
  const manualSubmitRef = useRef(false)
  const autosaveInitRef = useRef(false)
  const [draftSaved, setDraftSaved] = useState(false)

  // Lista única de materiais + soquetes vinda das características.
  const materialOptions = characteristics.filter((c) => c.type === 'material')
  const soqueteOptions = characteristics.filter((c) => c.type === 'soquete')
  const slugTouched = useRef(isEdit)
  const [showSlug, setShowSlug] = useState(false)
  const [slugTaken, setSlugTaken] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product?.name ?? '',
      slug: product?.slug ?? '',
      sku: product?.sku ?? '',
      description: product?.description ?? '',
      short_description: product?.short_description ?? '',
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
      model_3d_filename: product?.model_3d_filename ?? '',
      model_3d_object_type: product?.model_3d_object_type ?? 'floor',
      model_3d_ar_scale: product?.model_3d_ar_scale ?? 'fixed',
      model_3d_material_labels: product?.model_3d_material_labels ?? {},
      model_3d_variations: product?.model_3d_variations ?? [],
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
  const model3dFilename = watch('model_3d_filename')
  const model3dObjectType = watch('model_3d_object_type') ?? 'floor'
  const model3dArScale = watch('model_3d_ar_scale') ?? 'fixed'
  const model3dMaterialLabels = watch('model_3d_material_labels') ?? {}
  const model3dVariations = watch('model_3d_variations') ?? []

  const toggleSecondaryCategory = (id: string) =>
    setSecondaryCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )

  const toggleSecondaryMaterial = (id: string) =>
    setSecondaryMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )

  const toggleSoquete = (id: string) =>
    setSoqueteIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )

  const handleAiDescription = () => {
    toast.info('Esta é uma sugestão de função para o futuro.')
  }

  // Monta o payload a partir dos valores do form + seleções de taxonomia.
  const buildPayload = (data: FormValues): ProductFormInput => ({
    ...(draftIdRef.current ? { id: draftIdRef.current } : {}),
    ...data,
    primary_category_id: primaryCategoryId || null,
    secondary_category_ids: secondaryCategoryIds.filter((id) => id !== primaryCategoryId),
    primary_material_id: primaryMaterialId || null,
    secondary_material_ids: secondaryMaterialIds.filter((id) => id !== primaryMaterialId),
    soquete_ids: soqueteIds,
    images,
    has_3d_model: !!data.has_3d_model,
  })

  // Salva/atualiza o rascunho automaticamente (sem SEO por IA, sem navegar).
  const autosaveDraft = async () => {
    if (savingRef.current || manualSubmitRef.current) return
    const data = getValues()
    if (!(data.name ?? '').trim()) return
    savingRef.current = true
    try {
      const payload = buildPayload(data)
      const result = draftIdRef.current
        ? await updateProductAction(payload, { autosave: true })
        : await createProductAction(payload, { autosave: true })
      if (!('error' in result)) {
        if (!draftIdRef.current) draftIdRef.current = result.id
        setDraftSaved(true)
      }
    } finally {
      savingRef.current = false
    }
  }

  // Dispara o auto-save (debounce) sempre que algo muda — apenas na criação.
  const autosaveSnapshot = JSON.stringify({
    v: watch(),
    pc: primaryCategoryId,
    sc: secondaryCategoryIds,
    pm: primaryMaterialId,
    sm: secondaryMaterialIds,
    sq: soqueteIds,
    img: images,
  })
  useEffect(() => {
    if (isEdit) return
    // Pula a primeira execução (montagem) — só salva após uma alteração real.
    if (!autosaveInitRef.current) {
      autosaveInitRef.current = true
      return
    }
    const t = setTimeout(() => {
      autosaveDraft()
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosaveSnapshot, isEdit])

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null)
    manualSubmitRef.current = true

    const payload = buildPayload(data)
    const result = draftIdRef.current
      ? await updateProductAction(payload)
      : await createProductAction(payload)

    if ('error' in result) {
      setServerError(result.error)
      toast.error(result.error)
      manualSubmitRef.current = false
      return
    }

    toast.success(isEdit ? 'Produto atualizado!' : 'Produto criado!')
    setTimeout(() => router.push('/admin/products'), 800)
  })

  return (
    <form onSubmit={onSubmit} className="post-editor" noValidate>
      {serverError && <p className="form-error" role="alert">{serverError}</p>}

      {/* ---- Layout em duas colunas: esquerda 1fr + direita 320px fixa ---- */}
      <div className="editor-columns">
        {/* ===================== Coluna esquerda (principal) ===================== */}
        <div className="editor-col editor-col--main">
          {/* Nome + SKU + Slug */}
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

            {/* Slug — o título é o link que aciona o toggle; abaixo o preview */}
            <div className="field-group">
              <button
                type="button"
                className="slug-toggle"
                onClick={() => setShowSlug((v) => !v)}
                aria-expanded={showSlug}
              >
                <span className="slug-toggle-label">Slug</span>
                <ChevronDown
                  size={14}
                  strokeWidth={2}
                  aria-hidden="true"
                  className={`slug-toggle-chevron${showSlug ? ' slug-toggle-chevron--open' : ''}`}
                />
              </button>
              <span className="slug-toggle-text">/{effectiveSlug}</span>
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

          {/* Imagens do produto (invertido com Descrição) */}
          <div className="editor-section">
            <div className="field-group">
              <Label>Imagens do produto</Label>
              <ProductImageGallery value={images} onChange={setImages} folder={effectiveSlug} />
              <span className="field-hint field-hint--xs">{IMAGE_UPLOAD_HINT}</span>
            </div>
          </div>

          {/* Descrição */}
          <div className="editor-section">
            <div className="field-group">
              <Label htmlFor="short_description">Breve descrição</Label>
              <Textarea
                id="short_description"
                rows={3}
                maxLength={300}
                placeholder="Resumo curto do produto"
                {...register('short_description')}
              />
            </div>
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

          {/* Dimensões e Peso */}
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

          {/* Especificações — material principal (1) + secundários (N) + soquete (N) */}
          <div className="editor-section">
            <p className="editor-section-title">Especificações</p>
            {characteristics.length === 0 ? (
              <p className="field-hint" style={{ margin: 0 }}>
                Nenhuma característica cadastrada. Crie em “Especificações”.
              </p>
            ) : (
              <div className="char-groups-grid">
                {/* Material principal (aparece no card) */}
                <div className="char-group">
                  <p className="char-group-label">Material Principal</p>
                  <select
                    className="editor-select"
                    value={primaryMaterialId}
                    onChange={(e) => setPrimaryMaterialId(e.target.value)}
                  >
                    <option value="">— Nenhum —</option>
                    {materialOptions.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {/* Materiais secundários (filtram, não aparecem no card) */}
                <div className="char-group">
                  <p className="char-group-label">Materiais Secundários</p>
                  {materialOptions.filter((m) => m.id !== primaryMaterialId).length === 0 ? (
                    <p className="field-hint" style={{ margin: 0 }}>—</p>
                  ) : (
                    <div className="category-checklist">
                      {materialOptions
                        .filter((m) => m.id !== primaryMaterialId)
                        .map((m) => (
                          <label key={m.id} className="category-check">
                            <input
                              type="checkbox"
                              checked={secondaryMaterialIds.includes(m.id)}
                              onChange={() => toggleSecondaryMaterial(m.id)}
                            />
                            <span>{m.name}</span>
                          </label>
                        ))}
                    </div>
                  )}
                </div>

                {/* Tipo de Soquete (vários, filtram) */}
                <div className="char-group">
                  <p className="char-group-label">Tipo de Soquete</p>
                  {soqueteOptions.length === 0 ? (
                    <p className="field-hint" style={{ margin: 0 }}>—</p>
                  ) : (
                    <div className="category-checklist">
                      {soqueteOptions.map((s) => (
                        <label key={s.id} className="category-check">
                          <input
                            type="checkbox"
                            checked={soqueteIds.includes(s.id)}
                            onChange={() => toggleSoquete(s.id)}
                          />
                          <span>{s.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modelo 3D */}
          <div className="editor-section">
            <div className="switcher-row">
              <Controller
                control={control}
                name="has_3d_model"
                render={({ field }) => (
                  <Switch
                    id="has_3d_model"
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="has_3d_model" className="editor-section-title" style={{ margin: 0 }}>
                Modelo 3D
              </Label>
            </div>
            {has3d && (
              <div className="editor-3d-fields">
                <div className="field-group">
                  <Label>Modelo 3D (.glb)</Label>
                  <input type="hidden" {...register('model_3d_url')} />
                  <R2ModelUpload
                    value={model3dUrl ?? ''}
                    filename={model3dFilename ?? ''}
                    onChange={(url, filename) => {
                      setValue('model_3d_url', url)
                      setValue('model_3d_filename', filename ?? '')
                    }}
                    folder={effectiveSlug}
                  />
                  {!model3dUrl && (
                    <span className="field-hint field-hint--xs">
                      Envie um arquivo <strong>.glb</strong> acima para ler os materiais e configurar as variações de cor/textura.
                    </span>
                  )}
                </div>

                {/* Variações (cor/textura) + config de AR — carregado sob demanda */}
                <Model3dVariations
                  slug={effectiveSlug}
                  modelUrl={model3dUrl ?? ''}
                  isEdit={isEdit}
                  objectType={model3dObjectType as Model3dObjectType}
                  arScale={model3dArScale as Model3dArScale}
                  materialLabels={model3dMaterialLabels as Model3dMaterialLabels}
                  variations={model3dVariations as Model3dVariation[]}
                  onObjectTypeChange={(v) => setValue('model_3d_object_type', v)}
                  onArScaleChange={(v) => setValue('model_3d_ar_scale', v)}
                  onMaterialLabelsChange={(v) => setValue('model_3d_material_labels', v)}
                  onVariationsChange={(v) => setValue('model_3d_variations', v)}
                />
              </div>
            )}
          </div>
        </div>

        {/* ===================== Coluna direita (lateral) ===================== */}
        <div className="editor-col editor-col--side">
          {/* Status + botão Criar/Salvar */}
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
            {!isEdit && draftSaved && (
              <span className="field-hint field-hint--xs" style={{ margin: 0 }}>
                Rascunho salvo automaticamente
              </span>
            )}
          </div>

          {/* Imagem de capa (invertido com Área de uso) */}
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

          {/* Área de uso + Categorias */}
          <div className="editor-section">
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
              <div className="cat-fields">
                <div>
                  <p className="char-group-label">Categoria principal</p>
                  <select
                    id="primary_category"
                    className="editor-select"
                    value={primaryCategoryId}
                    onChange={(e) => setPrimaryCategoryId(e.target.value)}
                  >
                    <option value="">— Nenhuma —</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {'— '.repeat(cat.depth)}{cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="char-group-label">Categorias secundárias</p>
                  <div className="category-checklist">
                    {categories
                      .filter((cat) => cat.id !== primaryCategoryId)
                      .map((cat) => (
                        <label key={cat.id} className="category-check" style={{ paddingLeft: cat.depth * 18 }}>
                          <input
                            type="checkbox"
                            checked={secondaryCategoryIds.includes(cat.id)}
                            onChange={() => toggleSecondaryCategory(cat.id)}
                          />
                          <span>{cat.name}</span>
                        </label>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}
