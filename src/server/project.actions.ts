'use server'

// ================================================================
// project.actions.ts — portfólio (Projetos) — data + mutations
// Versão enxuta de product.actions.ts:
//   - lista paginada/filtrada (getProjects)
//   - deletes RLS-gated com checagem de papel/ownership + bulk
//   - create/update com álbum de fotos (project_images) e reconcile do R2
//   - helpers públicos p/ home e listagem (getFeaturedProjects, getPublishedProjects)
// Sem SEO por IA, sem categorias/3D — o projeto é nome, local, texto e fotos.
// ================================================================

import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import type { InsertProject, Profile, Project, ProjectStatus } from '@/lib/db/schema'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const PAGE_SIZE = 20

// Whitelist de colunas ordenáveis — evita injeção de coluna arbitrária.
const SORTABLE = {
  name: 'name',
  updated_at: 'updated_at',
  published_at: 'published_at',
  created_at: 'created_at',
} as const
export type ProjectSortKey = keyof typeof SORTABLE

// Linha exibida na tabela do dashboard (subset de Project + autor).
export type ProjectRow = Pick<
  Project,
  | 'id'
  | 'name'
  | 'slug'
  | 'location'
  | 'status'
  | 'is_featured'
  | 'cover_image'
  | 'created_at'
  | 'updated_at'
  | 'published_at'
  | 'author_id'
> & {
  author: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

export type GetProjectsParams = {
  page?: number
  status?: ProjectStatus | 'all'
  q?: string
  sort?: string
  dir?: string
}

export type GetProjectsResult = {
  projects: ProjectRow[]
  total: number
  page: number
  pageCount: number
}

// ================================================================
// getProjects — lista do dashboard admin (paginada/filtrada)
// ================================================================
export const getProjects = async ({
  page = 1,
  status = 'all',
  q = '',
  sort = '',
  dir = '',
}: GetProjectsParams = {}): Promise<GetProjectsResult> => {
  const supabase = await createSupabaseServerClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const sortKey: ProjectSortKey =
    sort && sort in SORTABLE ? (sort as ProjectSortKey) : 'updated_at'
  const ascending = dir === 'asc'

  let query = supabase
    .from('projects')
    .select(
      `id, name, slug, location, status, is_featured, cover_image,
       created_at, updated_at, published_at, author_id,
       author:profiles(id, full_name, avatar_url)`,
      { count: 'exact' }
    )
    .order(SORTABLE[sortKey], { ascending })
    .range(from, to)

  if (status !== 'all') query = query.eq('status', status)

  if (q.trim()) {
    const term = q.trim().replace(/[,()]/g, ' ').trim()
    if (term) query = query.or(`name.ilike.%${term}%,location.ilike.%${term}%`)
  }

  const { data, count, error } = await query

  if (error) {
    console.error('[getProjects]', error.message)
    return { projects: [], total: 0, page, pageCount: 0 }
  }

  const projects = (data ?? []) as unknown as ProjectRow[]
  const total = count ?? 0
  return { projects, total, page, pageCount: Math.ceil(total / PAGE_SIZE) }
}

// ================================================================
// Helpers públicos (home + listagem)
// ================================================================
export type ProjectCardData = Pick<
  Project,
  'id' | 'name' | 'slug' | 'location' | 'cover_image'
>

const CARD_SELECT = 'id, name, slug, location, cover_image'

// Destaques da home (grid principal) — projetos publicados marcados como destaque.
export const getFeaturedProjects = async (limit = 4): Promise<ProjectCardData[]> => {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('projects')
    .select(CARD_SELECT)
    .eq('status', 'published')
    .eq('is_featured', true)
    .order('published_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as ProjectCardData[]
}

// Cards menores da home — projetos publicados mais recentes (exclui destaques
// para não repetir o grid principal logo acima).
export const getRecentProjects = async (limit = 8): Promise<ProjectCardData[]> => {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('projects')
    .select(CARD_SELECT)
    .eq('status', 'published')
    .eq('is_featured', false)
    .order('published_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as ProjectCardData[]
}

// Listagem pública paginada (/projetos).
export type GetPublishedProjectsResult = {
  projects: ProjectCardData[]
  total: number
  page: number
  pageCount: number
}

export const getPublishedProjects = async (
  page = 1,
  pageSize = 9
): Promise<GetPublishedProjectsResult> => {
  const supabase = await createSupabaseServerClient()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, count } = await supabase
    .from('projects')
    .select(CARD_SELECT, { count: 'exact' })
    .eq('status', 'published')
    // Destaques primeiro, depois por data de publicação.
    .order('is_featured', { ascending: false })
    .order('published_at', { ascending: false })
    .range(from, to)

  const total = count ?? 0
  return {
    projects: (data ?? []) as ProjectCardData[],
    total,
    page,
    pageCount: Math.ceil(total / pageSize),
  }
}

// ================================================================
// Limpeza best-effort no R2 ao excluir — remove a pasta projetos/<slug>/ inteira
// (capa + álbum). Import dinâmico para o dashboard nunca depender do R2.
// ================================================================
const cleanupProjectStorage = async (projectIds: string[]): Promise<void> => {
  if (!projectIds.length) return
  try {
    const supabase = await createSupabaseServerClient()
    const [{ data: projects }, { data: images }] = await Promise.all([
      supabase.from('projects').select('cover_image').in('id', projectIds),
      supabase.from('project_images').select('url').in('project_id', projectIds),
    ])

    const urls = [
      ...(projects ?? []).map((p) => p.cover_image),
      ...(images ?? []).map((i) => i.url),
    ].filter((u): u is string => !!u)

    if (!urls.length) return

    const { r2KeyFromPublicUrl, deleteR2Prefix } = await import('@/lib/storage/r2-client')

    const prefixes = new Set<string>()
    for (const u of urls) {
      const m = r2KeyFromPublicUrl(u)?.match(/^(projetos\/[^/]+)\//)
      if (m) prefixes.add(`${m[1]}/`)
    }

    await Promise.allSettled([...prefixes].map((p) => deleteR2Prefix(p)))
  } catch (err) {
    console.error('[cleanupProjectStorage]', (err as Error).message)
  }
}

// ================================================================
// deleteProjectAction — RLS + papel/ownership (espelha deleteProductAction)
// ================================================================
export const deleteProjectAction = async (formData: FormData): Promise<void> => {
  const projectId = formData.get('projectId') as string
  if (!projectId) return

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

  await cleanupProjectStorage([projectId])

  if (profile.role === 'admin') {
    await supabase.from('projects').delete().eq('id', projectId)
  } else {
    await supabase.from('projects').delete().eq('id', projectId).eq('author_id', user.id)
  }

  revalidatePath('/admin/projects')
  revalidatePath('/projetos')
  revalidatePath('/')
}

// ================================================================
// bulkDeleteProjectsAction
// ================================================================
export const bulkDeleteProjectsAction = async (ids: string[]): Promise<void> => {
  if (!ids.length) return

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

  await cleanupProjectStorage(ids)

  if (profile.role === 'admin') {
    await supabase.from('projects').delete().in('id', ids)
  } else {
    await supabase.from('projects').delete().in('id', ids).eq('author_id', user.id)
  }

  revalidatePath('/admin/projects')
  revalidatePath('/projetos')
  revalidatePath('/')
}

// ================================================================
// Create / Update — formulário do projeto
// ================================================================
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const toSlug = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100)

const imageInputSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional().default(''),
})

const projectSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  slug: z
    .string()
    .optional()
    .default('')
    .refine(
      (s) => !s || SLUG_RE.test(s),
      'Slug deve conter apenas letras minúsculas, números e hífens'
    ),
  location: z.string().optional().default(''),
  description: z.string().optional().default(''),
  cover_image: z.string().optional().default(''),
  status: z.enum(['draft', 'published']),
  is_featured: z.boolean().optional().default(false),
  images: z.array(imageInputSchema).optional().default([]),
})

export type ProjectFormInput = z.input<typeof projectSchema> & { id?: string }
export type ProjectActionResult = { error: string } | { success: true; id: string }

// Mapeia dados validados → colunas da tabela projects (sem author_id/published_at,
// resolvidos no create/update).
const toProjectColumns = (
  d: z.infer<typeof projectSchema>
): Omit<InsertProject, 'author_id' | 'published_at'> => ({
  name: d.name.trim(),
  slug: d.slug.trim() || toSlug(d.name),
  location: d.location.trim() || null,
  description: d.description.trim() || null,
  cover_image: d.cover_image.trim() || null,
  status: d.status,
  is_featured: d.is_featured,
})

const uniqueViolationMessage = () => 'Já existe um projeto com esse slug'

// Substitui as imagens do álbum, retornando URLs removidas (p/ limpeza no R2).
const syncImages = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectId: string,
  images: { url: string; alt: string }[]
): Promise<string[]> => {
  const { data: existing } = await supabase
    .from('project_images')
    .select('url')
    .eq('project_id', projectId)
  const existingUrls = (existing ?? []).map((r) => r.url)
  const nextUrls = new Set(images.map((i) => i.url))
  const removed = existingUrls.filter((u) => !nextUrls.has(u))

  await supabase.from('project_images').delete().eq('project_id', projectId)
  if (images.length) {
    await supabase.from('project_images').insert(
      images.map((img, i) => ({
        project_id: projectId,
        url: img.url,
        alt: img.alt.trim() || null,
        sort_order: i,
      }))
    )
  }
  return removed
}

// Reconcilia a pasta projetos/<slug>/: remove do R2 qualquer objeto que o
// projeto salvo não referencia mais (capa antiga, fotos removidas, uploads
// abandonados). Best-effort — nunca bloqueia o save.
const reconcileProjectFolder = async (
  keepUrls: (string | null | undefined)[],
  hintUrls: (string | null | undefined)[] = []
) => {
  try {
    const { listR2Keys, deleteR2Objects, r2KeyFromPublicUrl } = await import(
      '@/lib/storage/r2-client'
    )

    const prefixes = new Set<string>()
    for (const u of [...keepUrls, ...hintUrls]) {
      if (!u) continue
      const m = r2KeyFromPublicUrl(u)?.match(/^(projetos\/[^/]+)\//)
      if (m) prefixes.add(`${m[1]}/`)
    }
    if (!prefixes.size) return

    const keep = new Set(
      keepUrls
        .map((u) => (u ? r2KeyFromPublicUrl(u) : null))
        .filter((k): k is string => !!k)
    )

    await Promise.allSettled(
      [...prefixes].map(async (prefix) => {
        const stored = await listR2Keys(prefix)
        const toDelete = stored.filter((k) => !keep.has(k))
        if (toDelete.length) await deleteR2Objects(toDelete)
      })
    )
  } catch (err) {
    console.error('[reconcileProjectFolder]', (err as Error).message)
  }
}

// ================================================================
// isProjectSlugTaken — checagem ao vivo de slug duplicado no formulário.
// ================================================================
export const isProjectSlugTaken = async (
  rawSlug: string,
  excludeId?: string
): Promise<boolean> => {
  const slug = (rawSlug || '').trim()
  if (!slug || !SLUG_RE.test(slug)) return false

  const supabase = await createSupabaseServerClient()
  let query = supabase.from('projects').select('id').eq('slug', slug).limit(1)
  if (excludeId) query = query.neq('id', excludeId)

  const { data, error } = await query
  if (error) {
    console.error('[isProjectSlugTaken]', error.message)
    return false
  }
  return (data?.length ?? 0) > 0
}

// ================================================================
// createProjectAction
// ================================================================
export const createProjectAction = async (
  input: ProjectFormInput,
  opts?: { autosave?: boolean }
): Promise<ProjectActionResult> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const parsed = projectSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }
  const d = parsed.data

  const columns = toProjectColumns(d)

  const { data: created, error } = await supabase
    .from('projects')
    .insert({
      ...columns,
      author_id: user.id, // server-side only — nunca do input
      published_at: d.status === 'published' ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (error || !created) {
    console.error('[createProjectAction]', error?.message)
    if (error?.code === '23505') return { error: uniqueViolationMessage() }
    return { error: 'Erro ao criar projeto' }
  }

  await syncImages(supabase, created.id, d.images)
  await reconcileProjectFolder([columns.cover_image, ...d.images.map((i) => i.url)])

  revalidatePath('/admin/projects')
  if (!opts?.autosave) {
    revalidatePath('/projetos')
    revalidatePath('/')
  }
  return { success: true, id: created.id }
}

// ================================================================
// updateProjectAction
// ================================================================
export const updateProjectAction = async (
  input: ProjectFormInput,
  opts?: { autosave?: boolean }
): Promise<ProjectActionResult> => {
  const projectId = input.id
  if (!projectId) return { error: 'ID inválido' }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const parsed = projectSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }
  const d = parsed.data

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = profile?.role === 'admin'

  // Row existente — p/ ownership, carry-over do published_at e cleanup da capa antiga.
  const { data: existing } = await supabase
    .from('projects')
    .select('cover_image, published_at')
    .eq('id', projectId)
    .single()

  const columns = toProjectColumns(d)
  const publishedAt =
    d.status === 'published'
      ? existing?.published_at ?? new Date().toISOString()
      : existing?.published_at ?? null

  const updateData = { ...columns, published_at: publishedAt }

  const { error } = isAdmin
    ? await supabase.from('projects').update(updateData).eq('id', projectId)
    : await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)
        .eq('author_id', user.id)

  if (error) {
    console.error('[updateProjectAction]', error.message)
    if (error.code === '23505') return { error: uniqueViolationMessage() }
    return { error: 'Erro ao atualizar projeto' }
  }

  await syncImages(supabase, projectId, d.images)
  await reconcileProjectFolder(
    [columns.cover_image, ...d.images.map((i) => i.url)],
    [existing?.cover_image]
  )

  revalidatePath('/admin/projects')
  revalidatePath(`/admin/projects/${projectId}/edit`)
  if (!opts?.autosave) {
    revalidatePath('/projetos')
    revalidatePath(`/projetos/${columns.slug}`)
    revalidatePath('/')
  }
  return { success: true, id: projectId }
}
