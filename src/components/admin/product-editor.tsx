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
import { R2FileUpload } from '@/components/admin/r2-file-upload'
import { ProductImageGallery, type GalleryImage } from '@/components/admin/product-image-gallery'
import { SpecLabelInput } from '@/components/admin/spec-label-input'
import { normalizeLabel } from '@/lib/utils/normalize-label'
import type {
  Model3dArScale,
  Model3dMaterialLabels,
  Model3dObjectType,
  Model3dVariation,
  Product,
  ProductCharacteristic,
  ProductSpecLabel,
  ProductSpecValue,
  ProductTechSpec,
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
  applications: z.string().optional(),
  datasheet_url: z.string().optional(),
  datasheet_filename: z.string().optional(),
  ies_url: z.string().optional(),
  ies_filename: z.string().optional(),
  certificates_url: z.string().optional(),
  certificates_filename: z.string().optional(),
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
  specLabels?: ProductSpecLabel[]
  specValues?: ProductSpecValue[]
  product?: Product
  productPrimaryCategoryId?: string | null
  productSecondaryCategoryIds?: string[]
  productPrimaryMaterialId?: string | null
  productSecondaryMaterialIds?: string[]
  productImages?: GalleryImage[]
}

export const ProductEditor = ({
  categories,
  characteristics,
  specLabels = [],
  specValues = [],
  product,
  productPrimaryCategoryId = null,
  productSecondaryCategoryIds = [],
  productPrimaryMaterialId = null,
  productSecondaryMaterialIds = [],
  productImages = [],
}: Props) => {
  const isEdit = !!product
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [primaryCategoryId, setPrimaryCategoryId] = useState<string>(productPrimaryCategoryId ?? '')
  const [secondaryCategoryIds, setSecondaryCategoryIds] = useState<string[]>(productSecondaryCategoryIds)
  const [primaryMaterialId, setPrimaryMaterialId] = useState<string>(productPrimaryMaterialId ?? '')
  const [secondaryMaterialIds, setSecondaryMaterialIds] = useState<string[]>(productSecondaryMaterialIds)
  const [images, setImages] = useState<GalleryImage[]>(productImages)
  // Aba Informações Técnicas (linhas rótulo/valor).
  const [techSpecs, setTechSpecs] = useState<ProductTechSpec[]>(product?.tech_specs ?? [])
  // Índices das linhas cujo rótulo o usuário marcou para virar preset. Fica
  // fora de techSpecs de propósito: é decisão de cadastro, não conteúdo do
  // produto, e não deve acabar gravado no tech_specs.
  const [saveLabel, setSaveLabel] = useState<Set<number>>(new Set())

  // Auto-save (rascunho) — só na criação. Cria o produto assim que houver nome e
  // vai atualizando; se o usuário sair, o rascunho e os arquivos permanecem.
  const draftIdRef = useRef<string | null>(product?.id ?? null)
  const savingRef = useRef(false)
  const manualSubmitRef = useRef(false)
  const autosaveInitRef = useRef(false)
  const [draftSaved, setDraftSaved] = useState(false)

  // Lista de materiais vinda das características cadastradas.
  const materialOptions = characteristics.filter((c) => c.type === 'material')
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
      applications: product?.applications ?? '',
      datasheet_url: product?.datasheet_url ?? '',
      datasheet_filename: product?.datasheet_filename ?? '',
      ies_url: product?.ies_url ?? '',
      ies_filename: product?.ies_filename ?? '',
      certificates_url: product?.certificates_url ?? '',
      certificates_filename: product?.certificates_filename ?? '',
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
  const datasheetUrl = watch('datasheet_url') ?? ''
  const datasheetFilename = watch('datasheet_filename') ?? ''
  const iesUrl = watch('ies_url') ?? ''
  const iesFilename = watch('ies_filename') ?? ''
  const certificatesUrl = watch('certificates_url') ?? ''
  const certificatesFilename = watch('certificates_filename') ?? ''

  // Índice dos rótulos já cadastrados, pela forma normalizada. É o que permite
  // reconhecer que "tensao" digitado à mão é o preset "Tensão".
  const labelByNormalized = new Map(specLabels.map((l) => [l.normalized, l]))

  // Valores agrupados pelo rótulo a que pertencem. É o índice da cascata: o
  // campo de valor de uma linha só enxerga o grupo do rótulo daquela linha.
  const valuesByLabel = new Map<string, ProductSpecValue[]>()
  for (const v of specValues) {
    const list = valuesByLabel.get(v.label_normalized) ?? []
    list.push(v)
    valuesByLabel.set(v.label_normalized, list)
  }
  const valuesForLabel = (label: string) => valuesByLabel.get(normalizeLabel(label)) ?? []

  // Helpers — Informações Técnicas (linhas rótulo/valor)
  const addSpec = () => setTechSpecs((prev) => [...prev, { label: '', value: '' }])
  const updateSpec = (i: number, key: 'label' | 'value', val: string) =>
    setTechSpecs((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)))

  const toggleSaveLabel = (i: number) =>
    setSaveLabel((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  // Ao sair do campo, um rótulo digitado que corresponda a um preset assume a
  // grafia canônica dele. Assim o produto grava "Tensão" mesmo que o usuário
  // tenha escrito "tensao", e a coluna da ficha técnica fica uniforme entre
  // produtos. Também desmarca o "salvar": não há o que salvar, já existe.
  const resolveSpecLabel = (i: number) => {
    const preset = labelByNormalized.get(normalizeLabel(techSpecs[i]?.label ?? ''))
    if (!preset) return
    if (preset.name !== techSpecs[i].label) updateSpec(i, 'label', preset.name)
    setSaveLabel((prev) => {
      if (!prev.has(i)) return prev
      const next = new Set(prev)
      next.delete(i)
      return next
    })
  }

  // Mesma ideia para o valor, sem a parte do "salvar": aqui não há caixa para
  // desmarcar, porque quem decide promover é a contagem de uso. A busca do
  // preset é dentro do rótulo da linha, pela mesma razão da cascata.
  const resolveSpecValue = (i: number) => {
    const row = techSpecs[i]
    if (!row) return
    const target = normalizeLabel(row.value)
    const preset = valuesForLabel(row.label).find((v) => v.normalized === target)
    if (!preset || preset.name === row.value) return
    updateSpec(i, 'value', preset.name)
  }
  // Remover uma linha reindexa as seguintes, então o conjunto de marcados
  // precisa ser remapeado junto: sem isso, apagar a linha 0 faria a marca dela
  // "escorregar" para a linha que assumiu o índice 0.
  const removeSpec = (i: number) => {
    setTechSpecs((prev) => prev.filter((_, idx) => idx !== i))
    setSaveLabel((prev) => {
      const next = new Set<number>()
      for (const idx of prev) {
        if (idx === i) continue
        next.add(idx > i ? idx - 1 : idx)
      }
      return next
    })
  }

  const toggleSecondaryCategory = (id: string) =>
    setSecondaryCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )

  const toggleSecondaryMaterial = (id: string) =>
    setSecondaryMaterialIds((prev) =>
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
    images,
    has_3d_model: !!data.has_3d_model,
    tech_specs: techSpecs,
    // Só os rótulos marcados, e só os que ainda não são preset — o filtro
    // repete a regra da UI para o payload não depender de o checkbox ter sido
    // escondido a tempo.
    new_spec_labels: [...saveLabel]
      .map((i) => techSpecs[i]?.label ?? '')
      .filter((l) => l.trim() && !labelByNormalized.has(normalizeLabel(l))),
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
    img: images,
    ts: techSpecs,
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
                {/* Rótulo passa a citar Características: a seção própria saiu do
                    formulário, e esse conteúdo agora entra aqui no texto rico. */}
                <Label>Descrição / Características</Label>
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

          {/* Informações técnicas (aba) — linhas rótulo/valor flexíveis */}
          <div className="editor-section">
            <div className="editor-section-head">
              <p className="editor-section-title">Informações técnicas</p>
              <span className="field-hint field-hint--xs">
                Tabela exibida na aba “Informações Técnicas”. Rótulo + valor (ex.: Tensão / 220 V).
              </span>
            </div>
            {techSpecs.length > 0 && (
              <div className="spec-rows">
                {techSpecs.map((row, i) => {
                  const isPreset = labelByNormalized.has(normalizeLabel(row.label))
                  return (
                    <div key={i} className="spec-row spec-row--labeled">
                      <SpecLabelInput
                        value={row.label}
                        onChange={(v) => updateSpec(i, 'label', v)}
                        onResolve={() => resolveSpecLabel(i)}
                        labels={specLabels}
                        placeholder="Rótulo (ex.: Tensão)"
                      />
                      {/* Cascata: só os valores do rótulo desta linha. Com o
                          rótulo em branco a lista fica vazia, porque sugerir
                          tudo que existe no catálogo é justamente o que se
                          quer evitar (8000K aparecendo em Tensão). */}
                      <SpecLabelInput
                        value={row.value}
                        onChange={(v) => updateSpec(i, 'value', v)}
                        onResolve={() => resolveSpecValue(i)}
                        labels={valuesForLabel(row.label)}
                        placeholder="Valor (ex.: 220 V)"
                      />
                      <button type="button" className="action-btn action-btn--delete" onClick={() => removeSpec(i)}>
                        Remover
                      </button>

                      {/* O checkbox some quando o rótulo já é um preset: não há
                          o que salvar, e deixá-lo visível sugeriria que algo
                          acontece ao marcar. No lugar entra a confirmação de
                          que o rótulo veio do cadastro. */}
                      <div className="spec-row-save">
                        {row.label.trim() === '' ? null : isPreset ? (
                          <span className="field-hint field-hint--xs">Rótulo já cadastrado</span>
                        ) : (
                          <label className="category-check">
                            <input
                              type="checkbox"
                              checked={saveLabel.has(i)}
                              onChange={() => toggleSaveLabel(i)}
                            />
                            <span>Salvar rótulo para reutilizar</span>
                          </label>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {/* Mesmo par de classes do "+ Adicionar variação" do modelo 3D:
                contorno em vez de preenchimento, para ler como ação auxiliar
                de uma lista e não como o botão principal do formulário. */}
            <button
              type="button"
              className="model3d-outline-btn btn-xs"
              onClick={addSpec}
              style={{ marginTop: 10 }}
            >
              + Adicionar nova
            </button>
          </div>

          {/* Aplicações (aba) — texto */}
          <div className="editor-section">
            <Label htmlFor="applications">Aplicações</Label>
            <Textarea
              id="applications"
              rows={4}
              placeholder="Onde o produto é indicado (ex.: ruas, avenidas, praças, pátios…)"
              {...register('applications')}
            />
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

          {/* Arquivos para download (aba) — 3 slots (PDF/ZIP) */}
          <div className="editor-section">
            <div className="editor-section-head">
              <p className="editor-section-title">Arquivos para download</p>
              <span className="field-hint field-hint--xs">
                PDF ou ZIP. Aparecem na aba “Arquivos para download” da página do produto, e o
                visitante preenche um popup (lead) antes de baixar.
              </span>
            </div>

            {/* Os três slots num grupo próprio: o gap de 20px da seção é pouco
                para separar blocos que têm abas, aviso e botão dentro. */}
            <div className="file-slots">
            <div className="field-group">
              <Label>Data Sheet</Label>
              <input type="hidden" {...register('datasheet_url')} />
              <input type="hidden" {...register('datasheet_filename')} />
              <R2FileUpload
                value={datasheetUrl}
                filename={datasheetFilename}
                onChange={(url, name) => {
                  setValue('datasheet_url', url)
                  setValue('datasheet_filename', name)
                }}
                group="product"
                folder={effectiveSlug}
              />
            </div>
            <div className="field-group">
              <Label>IES / 3D</Label>
              <input type="hidden" {...register('ies_url')} />
              <input type="hidden" {...register('ies_filename')} />
              <R2FileUpload
                value={iesUrl}
                filename={iesFilename}
                onChange={(url, name) => {
                  setValue('ies_url', url)
                  setValue('ies_filename', name)
                }}
                group="product"
                folder={effectiveSlug}
              />
            </div>
            <div className="field-group">
              <Label>Certificados</Label>
              <input type="hidden" {...register('certificates_url')} />
              <input type="hidden" {...register('certificates_filename')} />
              <R2FileUpload
                value={certificatesUrl}
                filename={certificatesFilename}
                onChange={(url, name) => {
                  setValue('certificates_url', url)
                  setValue('certificates_filename', name)
                }}
                group="product"
                folder={effectiveSlug}
              />
            </div>
            </div>
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

          {/* Filtros — os três eixos de classificação do produto num bloco só:
              área de uso, categorias e materiais. Todos alimentam a filtragem
              do catálogo, então ficam juntos em vez de espalhados. */}
          <div className="editor-section">
            <p className="editor-section-title">Filtros</p>

            <div className="field-group">
              <Label htmlFor="environment">Área de uso *</Label>
              <select id="environment" className="editor-select" {...register('environment')}>
                <option value="interno">Interno</option>
                <option value="externo">Externo</option>
              </select>
            </div>

            <p className="char-group-label">Categorias</p>
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

            <p className="char-group-label">Materiais</p>
            {characteristics.length === 0 ? (
              <p className="field-hint" style={{ margin: 0 }}>
                Nenhum material cadastrado. Crie em “Filtros”.
              </p>
            ) : (
              <div className="cat-fields">
                {/* Material principal (aparece no card) */}
                <div>
                  <p className="char-group-label">Material principal</p>
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
                <div>
                  <p className="char-group-label">Materiais secundários</p>
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

              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}
