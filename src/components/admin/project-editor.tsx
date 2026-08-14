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
  type ProjectFormInput,
} from '@/server/project.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
  description: z.string().optional(),
  cover_image: z.string().optional(),
  status: z.enum(['draft', 'published']),
  is_featured: z.boolean().optional(),
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
      description: project?.description ?? '',
      cover_image: project?.cover_image ?? '',
      status: project?.status ?? 'draft',
      is_featured: project?.is_featured ?? false,
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

  const buildPayload = (data: FormValues): ProjectFormInput => ({
    ...(draftIdRef.current ? { id: draftIdRef.current } : {}),
    ...data,
    images,
    is_featured: !!data.is_featured,
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
          {/* Nome + Localização + Slug */}
          <div className="editor-section">
            <div className="editor-row editor-row--2">
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
              <Label>Fotos do projeto (álbum)</Label>
              <ProductImageGallery value={images} onChange={setImages} folder={effectiveSlug} group="project" />
              <span className="field-hint field-hint--xs">{IMAGE_UPLOAD_HINT}</span>
            </div>
          </div>

          {/* Texto explicativo */}
          <div className="editor-section">
            <div className="field-group">
              <Label htmlFor="description">Texto explicativo</Label>
              <Textarea
                id="description"
                rows={6}
                placeholder="Um breve texto sobre o projeto: conceito, desafios, resultado…"
                {...register('description')}
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
            <span className="field-hint field-hint--xs" style={{ margin: 0 }}>
              Projetos em destaque aparecem no grid principal da seção “Projetos” (máx. 4).
            </span>

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
