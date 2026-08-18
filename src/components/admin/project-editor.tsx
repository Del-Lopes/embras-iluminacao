'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronDown } from 'lucide-react'
import {
  createProjectAction,
  updateProjectAction,
  isProjectSlugTaken,
  getHomeSlotOccupants,
  type HomeSlotOccupant,
  type ProjectFormInput,
} from '@/server/project.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextField } from '@/components/admin/rich-text-field'
import { Switch } from '@/components/ui/switch'
import { R2Upload } from '@/components/admin/r2-upload'
import { ProductImageGallery, type GalleryImage } from '@/components/admin/product-image-gallery'
import type { Project } from '@/lib/db/schema'

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  slug: z
    .string()
    .optional()
    .refine(
      (s) => !s || SLUG_RE.test(s),
      'Slug deve conter apenas letras minúsculas, números e hífens'
    ),
  location: z.string().optional(),
  project_date: z.string().optional(),
  description: z.string().optional(),
  cover_image: z.string().optional(),
  status: z.enum(['draft', 'published']),
  is_featured: z.boolean().optional(),
  home_position: z.string().optional(),
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

const IMAGE_UPLOAD_HINT = 'Formatos aceitos: JPG, PNG, WebP, TIFF. Tamanho máximo 5mb por arquivo.'

// Ordem em que os blocos entram no DOM do grid real: ele preenche por linha,
// então depois do card grande vêm topo-centro, topo-direita, base-centro e
// base-direita. A numeração visível segue a leitura da tela (1 a 5).
const HOME_SLOT_DOM_ORDER = [1, 2, 4, 3, 5]
const POSITION_LABELS: Record<number, string> = {
  1: 'card grande, à esquerda',
  2: 'centro, em cima',
  3: 'centro, embaixo',
  4: 'direita, em cima',
  5: 'direita, embaixo',
}

type Props = {
  project?: Project
  projectImages?: GalleryImage[]
}

export const ProjectEditor = ({ project, projectImages = [] }: Props) => {
  const isEdit = !!project
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [images, setImages] = useState<GalleryImage[]>(projectImages)

  // Auto-save (rascunho) — só na criação, igual ao editor de produto.
  const draftIdRef = useRef<string | null>(project?.id ?? null)
  const savingRef = useRef(false)
  const manualSubmitRef = useRef(false)
  const autosaveInitRef = useRef(false)
  const [draftSaved, setDraftSaved] = useState(false)

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
      name: project?.name ?? '',
      slug: project?.slug ?? '',
      location: project?.location ?? '',
      project_date: project?.project_date ?? '',
      description: project?.description ?? '',
      cover_image: project?.cover_image ?? '',
      status: project?.status ?? 'draft',
      is_featured: project?.is_featured ?? false,
      home_position: String(project?.home_position ?? 1),
    },
  })

  // Gera o slug a partir do nome até o usuário editar o slug.
  const nameValue = watch('name')
  useEffect(() => {
    if (!slugTouched.current) {
      setValue('slug', toSlug(nameValue), { shouldValidate: false })
    }
  }, [nameValue, setValue])

  // Slug efetivo (informado ou derivado) + checagem de duplicidade ao vivo.
  const slugValue = watch('slug') ?? ''
  const effectiveSlug = slugValue.trim() || toSlug(nameValue)
  useEffect(() => {
    if (!effectiveSlug || !SLUG_RE.test(effectiveSlug)) {
      setSlugTaken(false)
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      const taken = await isProjectSlugTaken(effectiveSlug, project?.id)
      if (!cancelled) setSlugTaken(taken)
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [effectiveSlug, project?.id])

  const coverImage = watch('cover_image')
  const isFeatured = !!watch('is_featured')
  const homePosition = watch('home_position') ?? '1'

  // Quem ocupa cada posição da home hoje, para o mapa marcar as vagas tomadas
  // e avisar qual projeto será desmarcado. Só busca com o destaque ligado, que
  // é a única situação em que o mapa aparece.
  const [occupants, setOccupants] = useState<HomeSlotOccupant[]>([])
  useEffect(() => {
    if (!isFeatured) return
    let cancelled = false
    getHomeSlotOccupants().then((list) => {
      if (!cancelled) setOccupants(list)
    })
    return () => {
      cancelled = true
    }
  }, [isFeatured])

  const buildPayload = (data: FormValues): ProjectFormInput => ({
    ...(draftIdRef.current ? { id: draftIdRef.current } : {}),
    ...data,
    images,
    is_featured: !!data.is_featured,
    home_position: data.is_featured ? Number(data.home_position) || null : null,
  })

  const autosaveDraft = async () => {
    if (savingRef.current || manualSubmitRef.current) return
    const data = getValues()
    if (!(data.name ?? '').trim()) return
    savingRef.current = true
    try {
      const payload = buildPayload(data)
      const result = draftIdRef.current
        ? await updateProjectAction(payload, { autosave: true })
        : await createProjectAction(payload, { autosave: true })
      if (!('error' in result)) {
        if (!draftIdRef.current) draftIdRef.current = result.id
        setDraftSaved(true)
      }
    } finally {
      savingRef.current = false
    }
  }

  const autosaveSnapshot = JSON.stringify({ v: watch(), img: images })
  useEffect(() => {
    if (isEdit) return
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
      ? await updateProjectAction(payload)
      : await createProjectAction(payload)

    if ('error' in result) {
      setServerError(result.error)
      toast.error(result.error)
      manualSubmitRef.current = false
      return
    }

    toast.success(isEdit ? 'Projeto atualizado!' : 'Projeto criado!')
    setTimeout(() => router.push('/admin/projects'), 800)
  })

  return (
    <form onSubmit={onSubmit} className="post-editor" noValidate>
      {serverError && <p className="form-error" role="alert">{serverError}</p>}

      <div className="editor-columns">
        {/* ===================== Coluna esquerda (principal) ===================== */}
        <div className="editor-col editor-col--main">
          {/* Nome + Localização + Data + Slug */}
          <div className="editor-section">
            <div className="editor-row">
              <div className="field-group">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" placeholder="Obra do projeto" aria-invalid={!!errors.name} {...register('name')} />
                {errors.name && <span className="field-error">{errors.name.message}</span>}
                {slugTaken && (
                  <span className="field-warning">
                    ⚠ Já existe um projeto com este slug (<code>{effectiveSlug}</code>). Defina um slug personalizado para diferenciar.
                  </span>
                )}
              </div>
              <div className="field-group">
                <Label htmlFor="location">Localização</Label>
                <Input id="location" placeholder="Ex.: São Paulo" {...register('location')} />
              </div>
              {/* type="month": só mês e ano, sem o dia, que ninguém sabe de
                  cor. O valor é gravado como YYYY-MM, formato que ordena e
                  compara corretamente como texto no filtro. */}
              <div className="field-group">
                <Label htmlFor="project_date">Data do projeto</Label>
                <Input id="project_date" type="month" {...register('project_date')} />
              </div>
            </div>

            {/* Slug */}
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
              <span className="slug-toggle-text">/projetos/{effectiveSlug}</span>
              {showSlug && (
                <>
                  <Input
                    id="slug"
                    placeholder="meu-projeto"
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

          {/* Álbum de fotos */}
          <div className="editor-section">
            <div className="field-group">
              <Label>Fotos do projeto (Álbum)</Label>
              <ProductImageGallery value={images} onChange={setImages} folder={effectiveSlug} group="project" />
              <span className="field-hint field-hint--xs">{IMAGE_UPLOAD_HINT}</span>
            </div>
          </div>

          {/* Texto explicativo */}
          <div className="editor-section">
            <div className="field-group">
              <Label>Texto explicativo</Label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <RichTextField value={field.value ?? ''} onChange={field.onChange} />
                )}
              />
            </div>
          </div>
        </div>

        {/* ===================== Coluna direita (lateral) ===================== */}
        <div className="editor-col editor-col--side">
          {/* Status + botão + destaque */}
          <div className="editor-section">
            <div className="field-group">
              <Label htmlFor="status">Status *</Label>
              <select id="status" className="editor-select" {...register('status')}>
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
              </select>
            </div>

            <div className="switcher-row">
              <Controller
                control={control}
                name="is_featured"
                render={({ field }) => (
                  <Switch
                    id="is_featured"
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="is_featured" style={{ margin: 0 }}>
                Destaque na home
              </Label>
            </div>
            {isFeatured ? (
              <div className="field-group">
                <Label>Posição na home</Label>
                {/* Mapa do grid em miniatura, na mesma proporção da seção:
                    escolher o lugar olhando para ele dispensa traduzir um
                    número em posição. A ordem no DOM é a do grid real
                    (preenche por linha), e não a numeração visual. */}
                <input type="hidden" {...register('home_position')} />
                <div className="home-slot-picker" role="radiogroup" aria-label="Posição na home">
                  {HOME_SLOT_DOM_ORDER.map((pos) => {
                    const occupant = occupants.find(
                      (o) => o.position === pos && o.id !== project?.id
                    )
                    const selected = Number(homePosition) === pos
                    return (
                      <div
                        key={pos}
                        className={`home-slot${pos === 1 ? ' home-slot--tall' : ''}`}
                      >
                        <button
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          aria-label={`Posição ${pos}: ${POSITION_LABELS[pos]}${
                            occupant ? `, ocupada por ${occupant.name}` : ', livre'
                          }`}
                          title={occupant ? `Ocupada por ${occupant.name}` : 'Livre'}
                          className={`home-slot-box${selected ? ' is-active' : ''}${
                            occupant ? ' is-taken' : ''
                          }`}
                          onClick={() =>
                            setValue('home_position', String(pos), { shouldDirty: true })
                          }
                        />
                        <span className="home-slot-num">{pos}</span>
                      </div>
                    )
                  })}
                </div>
                <span className="field-hint field-hint--xs">
                  {(() => {
                    const pos = Number(homePosition)
                    const occupant = occupants.find(
                      (o) => o.position === pos && o.id !== project?.id
                    )
                    return `${pos} (${POSITION_LABELS[pos]}) — ${occupant ? occupant.name : 'livre'}`
                  })()}
                </span>
                <span className="field-hint field-hint--xs">
                  *Escolher uma posição preenchida substituirá o projeto existente. Posições não
                  definidas são preenchidas por projetos mais antigos.
                </span>
              </div>
            ) : (
              <span className="field-hint field-hint--xs" style={{ margin: 0 }}>
                O grid da seção “Projetos” tem 5 posições.
              </span>
            )}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar projeto'}
            </Button>
            {!isEdit && draftSaved && (
              <span className="field-hint field-hint--xs" style={{ margin: 0 }}>
                Rascunho salvo automaticamente
              </span>
            )}
          </div>

          {/* Imagem de capa */}
          <div className="editor-section">
            <div className="field-group">
              <Label>Imagem de capa</Label>
              <input type="hidden" {...register('cover_image')} />
              <R2Upload
                value={coverImage ?? ''}
                onChange={(url) => setValue('cover_image', url)}
                group="project"
                folder={effectiveSlug}
              />
              <span className="field-hint field-hint--xs">{IMAGE_UPLOAD_HINT}</span>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
