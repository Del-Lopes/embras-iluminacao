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
import { PROJECT_DATE_RE } from '@/lib/utils/project-date'
import { periodsToRanges } from '@/lib/utils/project-periods'
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

// Aceita só YYYY-MM-DD, que é o formato do <input type="date">. Qualquer outra
// coisa vinda da URL é ignorada, em vez de virar um filtro malformado.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Linha exibida na tabela do dashboard (subset de Project + autor).
export type ProjectRow = Pick<
  Project,
  | 'id'
  | 'name'
  | 'slug'
  | 'location'
  | 'status'
  | 'is_featured'
  | 'home_position'
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
  // Filtros do dashboard: local exato (vindo da lista de locais cadastrados) e
  // intervalo de publicação em ISO curto (YYYY-MM-DD).
  location?: string
  from?: string
  to?: string
  // 'featured' | 'normal' — vazio traz os dois.
  featured?: string
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
  location = '',
  from: fromDate = '',
  to: toDate = '',
  featured = '',
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
      `id, name, slug, location, status, is_featured, home_position, cover_image,
       created_at, updated_at, published_at, author_id,
       author:profiles(id, full_name, avatar_url)`,
      { count: 'exact' }
    )
    .order(SORTABLE[sortKey], { ascending })
    .range(from, to)

  if (status !== 'all') query = query.eq('status', status)

  if (location.trim()) query = query.eq('location', location.trim())

  if (featured === 'featured') query = query.eq('is_featured', true)
  else if (featured === 'normal') query = query.eq('is_featured', false)

  // O intervalo é inclusivo nas duas pontas. published_at é timestamp, então o
  // limite superior vai até o fim do dia escolhido; sem isso, filtrar "até 20/08"
  // deixaria de fora tudo que foi publicado depois da meia-noite daquele dia.
  if (DATE_RE.test(fromDate)) query = query.gte('published_at', `${fromDate}T00:00:00`)
  if (DATE_RE.test(toDate)) query = query.lte('published_at', `${toDate}T23:59:59.999`)

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
// getProjectLocations — locais distintos já cadastrados, para o filtro do
// dashboard. Uma lista fechada evita erro de digitação num filtro que compara
// o local por igualdade.
// ================================================================
export const getProjectLocations = async (
  // A listagem pública só pode oferecer locais que ela consegue mostrar; o
  // admin lista todos, inclusive os que só existem em rascunho.
  publishedOnly = false
): Promise<string[]> => {
  const supabase = await createSupabaseServerClient()
  let query = supabase
    .from('projects')
    .select('location')
    .not('location', 'is', null)
    .order('location', { ascending: true })

  if (publishedOnly) query = query.eq('status', 'published')

  const { data } = await query

  const seen = new Set<string>()
  for (const row of data ?? []) {
    const value = (row.location ?? '').trim()
    if (value) seen.add(value)
  }
  return Array.from(seen)
}

// ================================================================
// Helpers públicos (home + listagem)
// ================================================================
export type ProjectCardData = Pick<
  Project,
  | 'id'
  | 'name'
  | 'slug'
  | 'location'
  | 'cover_image'
  | 'is_featured'
  | 'home_position'
  | 'project_date'
>

const CARD_SELECT =
  'id, name, slug, location, cover_image, is_featured, home_position, project_date'

// Número de posições no grid da home. 1 é o card grande à esquerda; 2 a 5 são
// os menores à direita, lidos em coluna. Não exportado: um arquivo "use server"
// só pode exportar funções async.
const HOME_SLOTS = 5

// Grid principal da home, já na ordem de exibição.
//
// Duas fontes, nesta precedência:
//   1. Destaques com posição definida no admin vão para a posição escolhida.
//   2. As posições que sobraram são preenchidas por ordem de entrada, do
//      projeto mais antigo para o mais novo. É o que faz o grid continuar
//      cheio quando há menos de 5 destaques, e é também o caminho de volta de
//      um projeto que perdeu o destaque para outro na mesma posição.
//
// O retorno tem HOME_SLOTS itens sempre que houver projetos publicados
// suficientes, e null nas posições que não deu para preencher (a seção usa os
// cards de fallback nesses lugares).
export const getHomeProjects = async (): Promise<(ProjectCardData | null)[]> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('projects')
    .select(`${CARD_SELECT}, created_at`)
    .eq('status', 'published')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getHomeProjects]', error.message)
    return Array<ProjectCardData | null>(HOME_SLOTS).fill(null)
  }

  type Row = ProjectCardData
  const rows = (data ?? []) as unknown as Row[]

  const slots = Array<ProjectCardData | null>(HOME_SLOTS).fill(null)
  const placed = new Set<string>()

  for (const row of rows) {
    const pos = row.home_position
    if (!pos || pos < 1 || pos > HOME_SLOTS) continue
    if (slots[pos - 1]) continue // o índice único do banco já impede, mas não custa
    slots[pos - 1] = row
    placed.add(row.id)
  }

  // rows já vem do mais antigo para o mais novo, então basta varrer na ordem.
  const queue = rows.filter((r) => !placed.has(r.id))
  let next = 0
  for (let i = 0; i < slots.length; i++) {
    if (slots[i]) continue
    if (next >= queue.length) break
    slots[i] = queue[next++]
  }

  return slots
}

// Cards menores da home — os projetos publicados que não entraram no grid
// principal, do mais recente para o mais antigo.
export const getRecentProjects = async (
  excludeIds: string[] = [],
  limit = 8
): Promise<ProjectCardData[]> => {
  const supabase = await createSupabaseServerClient()
  let query = supabase
    .from('projects')
    .select(CARD_SELECT)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit)

  // Exclui quem já aparece no grid acima. Vem por id, e não por is_featured,
  // porque o grid também é preenchido por ordem de entrada: um projeto sem
  // destaque pode estar lá em cima.
  if (excludeIds.length) query = query.not('id', 'in', `(${excludeIds.join(',')})`)

  const { data } = await query
  return (data ?? []) as ProjectCardData[]
}

// Listagem pública paginada (/projetos).
export type GetPublishedProjectsResult = {
  projects: ProjectCardData[]
  total: number
  page: number
  pageCount: number
}

export type PublishedProjectFilters = {
  q?: string
  // Multi-seleção: vazio traz todos.
  locations?: string[]
  // Períodos marcados (ver project-periods.ts). Somados, e não cruzados.
  periods?: string[]
  sort?: string
}

// Ordenações oferecidas na listagem. 'recentes'/'antigos' usam a data DO
// PROJETO, que é a data que o visitante vê no card, e não a de publicação.
const PUBLIC_SORTS = new Set(['recentes', 'antigos', 'az', 'za'])

export const getPublishedProjects = async (
  page = 1,
  pageSize = 9,
  filters: PublishedProjectFilters = {}
): Promise<GetPublishedProjectsResult> => {
  const supabase = await createSupabaseServerClient()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('projects')
    .select(CARD_SELECT, { count: 'exact' })
    .eq('status', 'published')

  const sort = PUBLIC_SORTS.has(filters.sort ?? '') ? filters.sort! : 'recentes'
  if (sort === 'az' || sort === 'za') {
    query = query.order('name', { ascending: sort === 'az' })
  } else {
    // nullsFirst: false joga os projetos sem data para o fim nas duas direções:
    // um projeto sem data não é "o mais antigo", é apenas desconhecido.
    query = query
      .order('project_date', { ascending: sort === 'antigos', nullsFirst: false })
      .order('published_at', { ascending: sort === 'antigos' })
  }

  const term = (filters.q ?? '').trim().replace(/[,()]/g, ' ').trim()
  if (term) query = query.or(`name.ilike.%${term}%,location.ilike.%${term}%`)

  const locations = (filters.locations ?? []).map((l) => l.trim()).filter(Boolean)
  if (locations.length) query = query.in('location', locations)

  // project_date é YYYY-MM: a comparação de texto já é cronológica, então os
  // intervalos funcionam sem converter para date. Cada período vira um grupo
  // and(...) e os grupos entram num or(...), somando os conjuntos. Projetos
  // sem data ficam de fora assim que algum período é marcado, que é o
  // comportamento esperado de quem pediu um recorte de tempo.
  const ranges = periodsToRanges(filters.periods ?? [], new Date())
  if (ranges.length) {
    const groups = ranges.map((r) => {
      const parts: string[] = []
      if (r.from) parts.push(`project_date.gte.${r.from}`)
      if (r.to) parts.push(`project_date.lte.${r.to}`)
      return parts.length > 1 ? `and(${parts.join(',')})` : parts[0]
    })
    query = query.or(groups.join(','))
  }

  const { data, count } = await query.range(from, to)

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
  // Vazio ou YYYY-MM (o que o <input type="month"> envia). Validar aqui
  // devolve uma mensagem clara em vez do erro cru da constraint do banco.
  project_date: z
    .string()
    .optional()
    .default('')
    .refine((v) => !v || PROJECT_DATE_RE.test(v), 'Data do projeto inválida'),
  description: z.string().optional().default(''),
  cover_image: z.string().optional().default(''),
  status: z.enum(['draft', 'published']),
  is_featured: z.boolean().optional().default(false),
  // Posição no grid da home. Só faz sentido junto com is_featured; vem do
  // select do formulário, que envia string.
  home_position: z.coerce
    .number()
    .int()
    .min(1)
    .max(HOME_SLOTS)
    .nullable()
    .optional(),
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
  project_date: d.project_date.trim() || null,
  description: d.description.trim() || null,
  cover_image: d.cover_image.trim() || null,
  status: d.status,
  is_featured: d.is_featured,
  // Sem destaque não há posição: a constraint do banco recusaria, e uma
  // posição órfã bloquearia o lugar para os outros projetos.
  home_position: d.is_featured ? d.home_position ?? null : null,
})

const uniqueViolationMessage = () => 'Já existe um projeto com esse slug'

// Libera a posição da home para quem está sendo gravado.
//
// A posição é única (índice parcial na tabela), então gravar por cima sem
// liberar antes daria erro de chave duplicada. Quem ocupava o lugar perde o
// destaque e volta para a fila por ordem de entrada, reaparecendo no grid se
// sobrar alguma das 5 vagas.
//
// Quando o formulário marca destaque sem escolher posição, assume a menor
// vaga livre. Se não houver nenhuma, o projeto fica destacado sem posição e
// entra pela fila, em vez de derrubar alguém que o usuário não indicou.
const claimHomePosition = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  requested: number | null,
  selfId: string | null
): Promise<number | null> => {
  const { data } = await supabase
    .from('projects')
    .select('id, home_position')
    .not('home_position', 'is', null)

  const taken = (data ?? []).filter((r) => r.id !== selfId)

  let position = requested
  if (!position) {
    const used = new Set(taken.map((r) => r.home_position))
    position = Array.from({ length: HOME_SLOTS }, (_, i) => i + 1).find((p) => !used.has(p)) ?? null
    if (!position) return null
  }

  const occupant = taken.find((r) => r.home_position === position)
  if (occupant) {
    await supabase
      .from('projects')
      .update({ is_featured: false, home_position: null })
      .eq('id', occupant.id)
  }

  return position
}

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
// Cria a pasta do projeto no R2 assim que ele é salvo, mesmo sem nenhuma foto.
//
// Sem isto a pasta só passaria a existir no primeiro upload, porque no R2 um
// prefixo sem objeto nenhum simplesmente não aparece. O projeto ficaria
// cadastrado e sem lugar visível para os arquivos dele.
//
// Import dinâmico e falha silenciosa pelo mesmo motivo do reconcile: o
// cadastro do projeto não pode depender do R2 estar configurado.
const ensureProjectFolder = async (slug: string): Promise<void> => {
  if (!slug) return
  try {
    const { ensureR2Folder } = await import('@/lib/storage/r2-client')
    await ensureR2Folder(`projetos/${slug}/`)
  } catch (err) {
    console.error('[ensureProjectFolder]', (err as Error).message)
  }
}


const reconcileProjectFolder = async (
  keepUrls: (string | null | undefined)[],
  hintUrls: (string | null | undefined)[] = []
) => {
  try {
    const { listR2Keys, deleteR2Objects, r2KeyFromPublicUrl, isFolderMarker } = await import(
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
        // O marcador de pasta nunca é referenciado por nenhuma URL, então cairia
        // sempre no toDelete e a pasta sumiria no primeiro salvamento.
        const toDelete = stored.filter((k) => !keep.has(k) && !isFolderMarker(k))
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
// getHomeSlotOccupants — quem ocupa cada posição da home hoje.
// Usado pelo formulário para avisar que salvar naquela posição
// desmarca o projeto que já está lá.
// ================================================================
export type HomeSlotOccupant = { position: number; id: string; name: string }

export const getHomeSlotOccupants = async (): Promise<HomeSlotOccupant[]> => {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('projects')
    .select('id, name, home_position')
    .not('home_position', 'is', null)
    .order('home_position', { ascending: true })

  return (data ?? []).map((r) => ({
    position: r.home_position as number,
    id: r.id as string,
    name: r.name as string,
  }))
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
  if (columns.is_featured) {
    columns.home_position = await claimHomePosition(supabase, columns.home_position, null)
  }

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
  await ensureProjectFolder(columns.slug)
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
  if (columns.is_featured) {
    columns.home_position = await claimHomePosition(supabase, columns.home_position, projectId)
  }
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
  // Também na atualização: se o slug mudou, a pasta nova precisa existir.
  await ensureProjectFolder(columns.slug)
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
