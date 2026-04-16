'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createPostAction, updatePostAction } from '@/server/admin.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ImageUpload } from '@/components/admin/image-upload'
import { RichTextField } from '@/components/admin/rich-text-field'
import type { Category, Post } from '@/lib/db/schema'

// ----------------------------------------------------------------
// Client-side schema (mirrors server schema)
// ----------------------------------------------------------------
const schema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  slug: z
    .string()
    .min(1, 'Slug é obrigatório')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  content: z.string().refine((v) => {
    if (!v) return false
    // Strip HTML tags and check for actual text content
    const text = v.replace(/<[^>]*>/g, '').trim()
    return text.length > 0
  }, 'Conteúdo é obrigatório'),
  excerpt: z.string().optional(),
  cover_image: z.string().optional(),
  category_id: z.string().min(1, 'Selecione uma categoria'),
  status: z.enum(['draft', 'published', 'scheduled', 'review_required', 'ai_generating']),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  seo_keywords: z.string().optional(),
  published_at: z.string().min(1, 'Data de publicação é obrigatória'),
})

type FormValues = z.infer<typeof schema>

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
const toSlug = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100)

const isoToLocal = (iso: string | null | undefined) => {
  if (!iso) return ''
  // datetime-local input expects "YYYY-MM-DDTHH:mm"
  return iso.slice(0, 16)
}

// Returns current local datetime as "YYYY-MM-DDTHH:mm" (browser timezone)
const nowLocal = () => {
  const d = new Date()
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offset).toISOString().slice(0, 16)
}


// ----------------------------------------------------------------
// Props
// ----------------------------------------------------------------
type Props = {
  categories: Pick<Category, 'id' | 'name'>[]
  post?: Post
}

// ----------------------------------------------------------------
// PostEditor
// ----------------------------------------------------------------
const STATUS_TOAST: Record<string, string> = {
  draft: 'Rascunho salvo com sucesso.',
  published: 'Post publicado com sucesso!',
  scheduled: 'Post agendado com sucesso!',
}

export const PostEditor = ({ categories, post }: Props) => {
  const isEdit = !!post
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [imageOrigin, setImageOrigin] = useState<string | null>(() => {
    const img = post?.cover_image
    if (!img) return null
    if (img.startsWith('/images/')) return 'default'
    if (img.includes('unsplash.com')) return 'unsplash'
    if (post?.source_url) return 'flux' // AI-generated post
    return null
  })
  // Track if slug was manually edited
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
      title: post?.title ?? '',
      slug: post?.slug ?? '',
      content: post?.content ?? '',
      excerpt: post?.excerpt ?? '',
      cover_image: post?.cover_image ?? '',
      category_id: post?.category_id ?? '',
      status: post?.status ?? 'draft',
      seo_title: post?.seo_title ?? '',
      seo_description: post?.seo_description ?? '',
      seo_keywords: post?.seo_keywords?.join(', ') ?? '',
      published_at: isoToLocal(post?.published_at) || nowLocal(),
    },
  })

  // Auto-generate slug from title (only when slug hasn't been manually touched)
  const titleValue = watch('title')
  useEffect(() => {
    if (!slugTouched.current) {
      setValue('slug', toSlug(titleValue), { shouldValidate: false })
    }
  }, [titleValue, setValue])

  const coverImage = watch('cover_image')
  const statusValue = watch('status')
  const isScheduled = statusValue === 'scheduled'

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null)
    setSaved(false)

    const fd = new FormData()
    if (isEdit) fd.set('id', post.id)
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        fd.set(key, String(value))
      }
    }

    if (isEdit) {
      const result = await updatePostAction(fd)
      if (result && 'error' in result) {
        setServerError(result.error)
        toast.error(result.error)
      } else {
        setServerError(null)
        const msg = STATUS_TOAST[data.status] ?? 'Salvo com sucesso.'
        toast.success(msg)
        if ('redirectTo' in result && result.redirectTo) {
          setTimeout(() => router.push(result.redirectTo!), 1000)
        } else {
          setSaved(true)
          setTimeout(() => setSaved(false), 3000)
        }
      }
    } else {
      const result = await createPostAction(fd)
      if (result && 'error' in result) {
        setServerError(result.error)
        toast.error(result.error)
      } else if (result && 'redirectTo' in result && result.redirectTo) {
        const msg = STATUS_TOAST[data.status] ?? 'Salvo com sucesso.'
        toast.success(msg)
        setTimeout(() => router.push(result.redirectTo!), 1000)
      }
    }
  })

  return (
    <form onSubmit={onSubmit} className="post-editor" noValidate>
      {/* ---- Feedback (top, below page title) ---- */}
      {serverError && (
        <p className="form-error" role="alert">{serverError}</p>
      )}
      {saved && (
        <p className="form-success" role="status">Post salvo com sucesso!</p>
      )}

      {/* ---- Primary fields ---- */}
      <div className="editor-section">
        <div className="field-group">
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            placeholder="Título do post"
            aria-invalid={!!errors.title}
            {...register('title')}
          />
          {errors.title && <span className="field-error">{errors.title.message}</span>}
        </div>

        <div className="field-group">
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            placeholder="meu-post-url"
            aria-invalid={!!errors.slug}
            {...register('slug', {
              onChange: () => { slugTouched.current = true },
            })}
          />
          {errors.slug && <span className="field-error">{errors.slug.message}</span>}
        </div>

        <div className="editor-row">
          <div className="field-group">
            <Label htmlFor="category_id">Categoria *</Label>
            <select
              id="category_id"
              className={`editor-select${errors.category_id ? ' editor-select--error' : ''}`}
              aria-invalid={!!errors.category_id}
              {...register('category_id')}
            >
              <option value="">Selecione...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.category_id && (
              <span className="field-error">{errors.category_id.message}</span>
            )}
          </div>

          <div className="field-group">
            <Label htmlFor="status">Status *</Label>
            <select
              id="status"
              className="editor-select"
              {...register('status', {
                onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
                  if (e.target.value === 'scheduled') {
                    setValue('published_at', '', { shouldValidate: false })
                  }
                },
              })}
            >
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
              <option value="scheduled">Agendado</option>
            </select>
          </div>

          <div className="field-group">
            <Label htmlFor="published_at">
              {isScheduled ? 'Agendar para *' : 'Data de publicação *'}
            </Label>
            <Input
              id="published_at"
              type="datetime-local"
              min={nowLocal()}
              {...register('published_at')}
            />
            {errors.published_at && (
              <span className="field-error">{errors.published_at.message}</span>
            )}
          </div>
        </div>
      </div>

      {/* ---- Cover image ---- */}
      <div className="editor-section">
        <div className="field-group">
          <Label>Imagem de capa</Label>
          <input type="hidden" {...register('cover_image')} />
          <ImageUpload
            value={coverImage ?? ''}
            onChange={(url) => setValue('cover_image', url)}
            imageOrigin={imageOrigin}
            onOriginChange={setImageOrigin}
          />
        </div>
      </div>

      {/* ---- Content ---- */}
      <div className="editor-section">
        <div className="field-group">
          <Label htmlFor="excerpt">Resumo</Label>
          <Textarea
            id="excerpt"
            placeholder="Breve resumo exibido na listagem (opcional)"
            rows={3}
            {...register('excerpt')}
          />
        </div>

        <div className="field-group">
          <Label>Conteúdo *</Label>
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <RichTextField
                value={field.value}
                onChange={field.onChange}
                hasError={!!errors.content}
              />
            )}
          />
          {errors.content && <span className="field-error">{errors.content.message}</span>}
        </div>
      </div>

      {/* ---- SEO ---- */}
      <div className="editor-section editor-section--collapsible">
        <p className="editor-section-title">SEO (opcional)</p>

        <div className="field-group">
          <Label htmlFor="seo_title">SEO Title</Label>
          <Input id="seo_title" placeholder="Título para mecanismos de busca" {...register('seo_title')} />
        </div>

        <div className="field-group">
          <Label htmlFor="seo_description">SEO Description</Label>
          <Textarea id="seo_description" rows={2} placeholder="Descrição para mecanismos de busca" {...register('seo_description')} />
        </div>

        <div className="field-group">
          <Label htmlFor="seo_keywords">Keywords</Label>
          <Input id="seo_keywords" placeholder="iluminação, led, eficiência (separadas por vírgula)" {...register('seo_keywords')} />
        </div>
      </div>

      <div className="editor-actions">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar post'}
        </Button>
      </div>
    </form>
  )
}
