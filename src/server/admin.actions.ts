'use server'

import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import type { PostStatus, PostWithRelations } from '@/lib/db/schema'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// ================================================================
// getPosts — paginated + filtered list
// ================================================================
const PAGE_SIZE = 15

export type GetPostsParams = {
  page?: number
  status?: PostStatus | 'all'
  q?: string
  category_id?: string
  date_from?: string
  date_to?: string
}

export type GetPostsResult = {
  posts: PostWithRelations[]
  total: number
  page: number
  pageCount: number
}

export const getPosts = async ({
  page = 1,
  status = 'all',
  q = '',
  category_id = '',
  date_from = '',
  date_to = '',
}: GetPostsParams = {}): Promise<GetPostsResult> => {
  const supabase = await createSupabaseServerClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('posts')
    .select(
      `id, title, slug, status, category_id, created_at, updated_at,
       published_at, author_id,
       author:profiles(id, full_name, avatar_url),
       category:categories(id, name, slug)`,
      { count: 'exact' }
    )
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  if (q.trim()) {
    query = query.ilike('title', `%${q.trim()}%`)
  }

  if (category_id.trim()) {
    query = query.eq('category_id', category_id.trim())
  }

  if (date_from.trim()) {
    query = query.gte('updated_at', date_from.trim())
  }

  if (date_to.trim()) {
    // Include the full day by going to end of day
    query = query.lte('updated_at', `${date_to.trim()}T23:59:59`)
  }

  const { data, count, error } = await query

  if (error) {
    console.error('[getPosts]', error.message)
    return { posts: [], total: 0, page, pageCount: 0 }
  }

  const total = count ?? 0
  return {
    posts: (data ?? []) as unknown as PostWithRelations[],
    total,
    page,
    pageCount: Math.ceil(total / PAGE_SIZE),
  }
}

// ================================================================
// cleanupCoverImages — remove orphaned cover images from the bucket
// ================================================================
type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

// Public URLs look like:
// {SUPABASE_URL}/storage/v1/object/public/cover-images/<path>
const BUCKET_PUBLIC_MARKER = '/storage/v1/object/public/cover-images/'

// Returns the in-bucket storage path for a cover image URL, or null when the
// URL is external (e.g. an Unsplash image) and therefore not ours to delete.
const extractBucketPath = (url: string | null): string | null => {
  if (!url) return null
  const idx = url.indexOf(BUCKET_PUBLIC_MARKER)
  if (idx === -1) return null
  const path = url.slice(idx + BUCKET_PUBLIC_MARKER.length).split('?')[0]
  return path ? decodeURIComponent(path) : null
}

// Deletes bucket-hosted cover images for already-deleted posts, but only when
// no remaining post still references the same image (avoids breaking shared
// images). External URLs are left untouched.
const cleanupCoverImages = async (
  supabase: ServerClient,
  coverImages: (string | null)[]
): Promise<void> => {
  const urls = Array.from(new Set(coverImages.filter((u): u is string => !!u)))
  const toRemove: string[] = []

  for (const url of urls) {
    const path = extractBucketPath(url)
    if (!path) continue

    const { count } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('cover_image', url)

    if (count && count > 0) continue
    toRemove.push(path)
  }

  if (toRemove.length) {
    await supabase.storage.from('cover-images').remove(toRemove)
  }
}

// ================================================================
// deletePostAction
// ================================================================
export const deletePostAction = async (formData: FormData): Promise<void> => {
  const postId = formData.get('postId') as string
  if (!postId) return

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return

  const isAdmin = profile.role === 'admin'

  const query = supabase.from('posts').delete().eq('id', postId)
  const { data: deleted } = await (isAdmin
    ? query
    : query.eq('author_id', user.id)
  ).select('cover_image')

  if (deleted?.length) {
    await cleanupCoverImages(supabase, deleted.map((r) => r.cover_image))
  }

  revalidatePath('/admin/dashboard')
}

// ================================================================
// bulkDeletePostsAction
// ================================================================
export const bulkDeletePostsAction = async (ids: string[]): Promise<void> => {
  if (!ids.length) return

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return

  const query = supabase.from('posts').delete().in('id', ids)
  const { data: deleted } = await (profile.role === 'admin'
    ? query
    : query.eq('author_id', user.id)
  ).select('cover_image')

  if (deleted?.length) {
    await cleanupCoverImages(supabase, deleted.map((r) => r.cover_image))
  }

  revalidatePath('/admin/dashboard')
}

// ================================================================
// Post schema (create + update share the same shape)
// ================================================================
const postSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  slug: z
    .string()
    .min(1, 'Slug é obrigatório')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  excerpt: z.string().optional(),
  cover_image: z.string().optional(),
  category_id: z.string().min(1, 'Selecione uma categoria'),
  status: z.enum(['draft', 'published', 'scheduled', 'review_required', 'ai_generating']),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  seo_keywords: z.string().optional(),
  published_at: z.string().min(1, 'Data de publicação é obrigatória'),
})

type ActionResult = { error: string } | { success: true; id: string; redirectTo?: string }

// ================================================================
// createPostAction
// ================================================================
export const createPostAction = async (formData: FormData): Promise<ActionResult> => {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const parsed = postSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { seo_keywords, published_at, excerpt, cover_image, seo_title, seo_description, ...rest } = parsed.data

  // datetime-local inputs submit "YYYY-MM-DDTHH:mm" with no timezone.
  // Append BRT offset so PostgreSQL stores the correct UTC equivalent.
  const scheduledAt = published_at && published_at.length === 16
    ? `${published_at}:00-03:00`
    : (published_at || null)

  if (rest.status === 'scheduled') {
    if (!scheduledAt) return { error: 'Selecione uma data para o agendamento' }
    if (new Date(scheduledAt) <= new Date()) return { error: 'A data de agendamento deve ser no futuro' }
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      ...rest,
      excerpt: excerpt ?? null,
      cover_image: cover_image ?? null,
      seo_title: seo_title ?? null,
      seo_description: seo_description ?? null,
      author_id: user.id,
      image_prompt: null,
      source_url: null,
      seo_keywords: seo_keywords
        ? seo_keywords.split(',').map((k) => k.trim()).filter(Boolean)
        : null,
      published_at: scheduledAt,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createPostAction]', error.message)
    if (error.code === '23505') return { error: 'Já existe um post com esse slug' }
    return { error: 'Erro ao criar post' }
  }

  revalidatePath('/admin/dashboard')
  const redirectTo = rest.status === 'draft'
    ? `/admin/posts/${data.id}/edit`
    : '/admin/dashboard'
  return { success: true, id: data.id, redirectTo }
}

// ================================================================
// updatePostAction
// ================================================================
export const updatePostAction = async (
  formData: FormData
): Promise<{ error: string } | { success: true; redirectTo?: string }> => {
  const postId = formData.get('id') as string
  if (!postId) return { error: 'ID inválido' }

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const parsed = postSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { seo_keywords, published_at, excerpt, cover_image, seo_title, seo_description, ...rest } = parsed.data

  const scheduledAt = published_at && published_at.length === 16
    ? `${published_at}:00-03:00`
    : (published_at || null)

  if (rest.status === 'scheduled') {
    if (!scheduledAt) return { error: 'Selecione uma data para o agendamento' }
    if (new Date(scheduledAt) <= new Date()) return { error: 'A data de agendamento deve ser no futuro' }
  }

  const updateData = {
    ...rest,
    excerpt: excerpt ?? null,
    cover_image: cover_image ?? null,
    seo_title: seo_title ?? null,
    seo_description: seo_description ?? null,
    seo_keywords: seo_keywords
      ? seo_keywords.split(',').map((k) => k.trim()).filter(Boolean)
      : null,
    published_at: scheduledAt,
  }

  const isAdmin = profile?.role === 'admin'

  const { error } = isAdmin
    ? await supabase.from('posts').update(updateData).eq('id', postId)
    : await supabase.from('posts').update(updateData).eq('id', postId).eq('author_id', user.id)

  if (error) {
    console.error('[updatePostAction]', error.message)
    if (error.code === '23505') return { error: 'Já existe um post com esse slug' }
    return { error: 'Erro ao atualizar post' }
  }

  revalidatePath('/admin/dashboard')
  revalidatePath(`/admin/posts/${postId}/edit`)

  if (rest.status === 'draft') {
    return { success: true }
  }
  return { success: true, redirectTo: '/admin/dashboard' }
}
