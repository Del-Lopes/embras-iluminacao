'use server'

// ================================================================
// product.actions.ts — catalog dashboard data + mutations
// Mirrors admin.actions.ts (blog) patterns:
//   - paginated/filtered list (getProducts)
//   - RLS-gated deletes with role/ownership check
//   - bulk delete
// Additions vs blog: header-driven sorting, 20/page, many-to-many
// category filter, and best-effort R2 object cleanup on delete.
// ================================================================

import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import type {
  InsertProduct,
  Model3dVariation,
  Product,
  ProductCategory,
  ProductEnvironment,
  ProductStatus,
  Profile,
} from '@/lib/db/schema'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { generateProductSeo } from '@/lib/ai/product-seo-generator'

const PAGE_SIZE = 20

// Whitelist of sortable columns — prevents arbitrary column injection.
const SORTABLE = {
  name: 'name',
  updated_at: 'updated_at',
  published_at: 'published_at',
  created_at: 'created_at',
} as const
export type ProductSortKey = keyof typeof SORTABLE

// Row shape returned to the dashboard table (subset of Product + relations).
export type ProductRow = Pick<
  Product,
  | 'id'
  | 'name'
  | 'slug'
  | 'sku'
  | 'status'
  | 'environment'
  | 'cover_image'
  | 'created_at'
  | 'updated_at'
  | 'published_at'
  | 'author_id'
> & {
  author: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  categories: Pick<ProductCategory, 'id' | 'name' | 'slug'>[]
}

export type GetProductsParams = {
  page?: number
  status?: ProductStatus | 'all'
  q?: string
  category_id?: string
  date_from?: string
  date_to?: string
  sort?: string
  dir?: string
}

export type GetProductsResult = {
  products: ProductRow[]
  total: number
  page: number
  pageCount: number
}

// ================================================================
// getProducts
// ================================================================
export const getProducts = async ({
  page = 1,
  status = 'all',
  q = '',
  category_id = '',
  date_from = '',
  date_to = '',
  sort = '',
  dir = '',
}: GetProductsParams = {}): Promise<GetProductsResult> => {
  const supabase = await createSupabaseServerClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Category filter is many-to-many → resolve matching product ids first.
  let categoryProductIds: string[] | null = null
  if (category_id.trim()) {
    const { data: maps } = await supabase
      .from('product_category_map')
      .select('product_id')
      .eq('category_id', category_id.trim())
    categoryProductIds = (maps ?? []).map((m) => m.product_id)
    if (categoryProductIds.length === 0) {
      return { products: [], total: 0, page, pageCount: 0 }
    }
  }

  const sortKey: ProductSortKey =
    sort && sort in SORTABLE ? (sort as ProductSortKey) : 'updated_at'
  const ascending = dir === 'asc'

  let query = supabase
    .from('products')
    .select(
      `id, name, slug, sku, status, environment, cover_image,
       created_at, updated_at, published_at, author_id,
       author:profiles(id, full_name, avatar_url)`,
      { count: 'exact' }
    )
    .order(SORTABLE[sortKey], { ascending })
    .range(from, to)

  if (status !== 'all') query = query.eq('status', status)

  if (q.trim()) {
    const term = q.trim()
    query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%`)
  }

  if (categoryProductIds) query = query.in('id', categoryProductIds)

  if (date_from.trim()) query = query.gte('updated_at', date_from.trim())
  if (date_to.trim()) {
    query = query.lte('updated_at', `${date_to.trim()}T23:59:59`)
  }

  const { data, count, error } = await query

  if (error) {
    console.error('[getProducts]', error.message)
    return { products: [], total: 0, page, pageCount: 0 }
  }

  const base = (data ?? []) as unknown as Omit<ProductRow, 'categories'>[]
  const ids = base.map((p) => p.id)

  // Attach categories (many-to-many) for the visible products.
  const catsByProduct = new Map<string, ProductRow['categories']>()
  if (ids.length) {
    const { data: mapRows } = await supabase
      .from('product_category_map')
      .select('product_id, product_categories(id, name, slug)')
      .in('product_id', ids)

    for (const row of (mapRows ?? []) as unknown as {
      product_id: string
      product_categories: Pick<ProductCategory, 'id' | 'name' | 'slug'> | null
    }[]) {
      if (!row.product_categories) continue
      const list = catsByProduct.get(row.product_id) ?? []
      list.push(row.product_categories)
      catsByProduct.set(row.product_id, list)
    }
  }

  const products: ProductRow[] = base.map((p) => ({
    ...p,
    categories: catsByProduct.get(p.id) ?? [],
  }))

  const total = count ?? 0
  return { products, total, page, pageCount: Math.ceil(total / PAGE_SIZE) }
}

// ================================================================
// Best-effort R2 cleanup — fetches a product's image URLs, derives the
// R2 keys and deletes them. Dynamic import so the dashboard never depends
// on R2 env being present; storage cleanup failing never blocks the delete.
// ================================================================
const cleanupProductStorage = async (productIds: string[]): Promise<void> => {
  if (!productIds.length) return
  try {
    const supabase = await createSupabaseServerClient()
    const [{ data: products }, { data: images }] = await Promise.all([
      supabase
        .from('products')
        .select('cover_image, model_3d_url, model_3d_poster')
        .in('id', productIds),
      supabase.from('product_images').select('url').in('product_id', productIds),
    ])

    const urls = [
      ...(products ?? []).flatMap((p) => [p.cover_image, p.model_3d_url, p.model_3d_poster]),
      ...(images ?? []).map((i) => i.url),
    ].filter((u): u is string => !!u)

    if (!urls.length) return

    const { r2KeyFromPublicUrl, deleteR2Objects } = await import(
      '@/lib/storage/r2-client'
    )
    const keys = urls
      .map((u) => r2KeyFromPublicUrl(u))
      .filter((k): k is string => !!k)

    if (keys.length) await deleteR2Objects(keys)
  } catch (err) {
    console.error('[cleanupProductStorage]', (err as Error).message)
  }
}

// ================================================================
// deleteProductAction — RLS + role/ownership (mirrors deletePostAction)
// ================================================================
export const deleteProductAction = async (formData: FormData): Promise<void> => {
  const productId = formData.get('productId') as string
  if (!productId) return

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

  // Clean R2 objects before the row (and its CASCADE'd images) disappear.
  await cleanupProductStorage([productId])

  if (profile.role === 'admin') {
    await supabase.from('products').delete().eq('id', productId)
  } else {
    await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('author_id', user.id)
  }

  revalidatePath('/admin/products')
}

// ================================================================
// bulkDeleteProductsAction
// ================================================================
export const bulkDeleteProductsAction = async (ids: string[]): Promise<void> => {
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

  await cleanupProductStorage(ids)

  if (profile.role === 'admin') {
    await supabase.from('products').delete().in('id', ids)
  } else {
    await supabase
      .from('products')
      .delete()
      .in('id', ids)
      .eq('author_id', user.id)
  }

  revalidatePath('/admin/products')
}

// ================================================================
// Create / Update — full product form
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

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  // Slug opcional — quando vazio é gerado automaticamente a partir do nome.
  slug: z
    .string()
    .optional()
    .default('')
    .refine(
      (s) => !s || SLUG_RE.test(s),
      'Slug deve conter apenas letras minúsculas, números e hífens'
    ),
  sku: z.string().min(1, 'SKU é obrigatório'),
  description: z.string().optional().default(''),
  cover_image: z.string().optional().default(''),
  status: z.enum(['draft', 'published']),
  environment: z.enum(['interno', 'externo']),
  height_cm: z.string().optional().default(''),
  width_cm: z.string().optional().default(''),
  depth_cm: z.string().optional().default(''),
  weight_kg: z.string().optional().default(''),
  category_ids: z.array(z.string().uuid()).optional().default([]),
  // Material principal / secundário / soquete agora são características (N:N)
  characteristic_ids: z.array(z.string().uuid()).optional().default([]),
  images: z.array(imageInputSchema).optional().default([]),
  has_3d_model: z.boolean().optional().default(false),
  model_3d_url: z.string().optional().default(''),
  model_3d_poster: z.string().optional().default(''),
  model_3d_alt: z.string().optional().default(''),
  model_3d_filename: z.string().optional().default(''),
  // 3D AR config + variações de material (cor/textura)
  model_3d_object_type: z.enum(['floor', 'wall']).optional().default('floor'),
  model_3d_ar_scale: z.enum(['fixed', 'auto']).optional().default('fixed'),
  model_3d_material_labels: z.record(z.string(), z.string()).optional().default({}),
  model_3d_variations: z
    .array(
      z.object({
        material: z.string().min(1),
        name: z.string().min(1),
        type: z.enum(['color', 'texture']),
        color: z.string().optional().nullable(),
        texture_url: z.string().optional().nullable(),
      })
    )
    .optional()
    .default([]),
  // SEO não vem mais do formulário — é gerado por IA (fallback determinístico) no save.
})

export type ProductFormInput = z.input<typeof productSchema> & { id?: string }
export type ProductActionResult = { error: string } | { success: true; id: string }

const numOrNull = (v: string): number | null => {
  if (!v.trim()) return null
  const n = parseFloat(v.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// Map validated form data → products row columns (shared create/update).
// SEO (seo_title/description/keywords) é resolvido à parte (IA) no create/update.
const toProductColumns = (
  d: z.infer<typeof productSchema>
): Omit<InsertProduct, 'author_id' | 'seo_title' | 'seo_description' | 'seo_keywords'> => ({
  name: d.name.trim(),
  // Fallback: slug derivado do nome quando não informado.
  slug: d.slug.trim() || toSlug(d.name),
  sku: d.sku.trim(),
  description: d.description.trim() || null,
  cover_image: d.cover_image.trim() || null,
  status: d.status,
  environment: d.environment as ProductEnvironment,
  // Colunas legadas — substituídas pelas características (tabela à parte).
  primary_material: null,
  height_cm: numOrNull(d.height_cm),
  width_cm: numOrNull(d.width_cm),
  depth_cm: numOrNull(d.depth_cm),
  weight_kg: numOrNull(d.weight_kg),
  materials: null,
  socket_type: null,
  has_3d_model: d.has_3d_model,
  // 3D fields only persist while the switcher is on
  model_3d_url: d.has_3d_model ? d.model_3d_url.trim() || null : null,
  // O poster de carregamento é sempre a imagem de capa do produto.
  model_3d_poster: d.has_3d_model ? d.cover_image.trim() || null : null,
  // O texto alternativo é sempre o nome do produto.
  model_3d_alt: d.has_3d_model ? d.name.trim() : null,
  model_3d_filename: d.has_3d_model ? d.model_3d_filename.trim() || null : null,
  model_3d_object_type: d.has_3d_model ? d.model_3d_object_type : null,
  model_3d_ar_scale: d.has_3d_model ? d.model_3d_ar_scale : null,
  model_3d_material_labels: d.has_3d_model ? d.model_3d_material_labels : null,
  // Keep only complete variations (a color needs a HEX, a texture needs a URL).
  model_3d_variations: d.has_3d_model
    ? d.model_3d_variations.filter((v) =>
        v.type === 'color' ? !!v.color : !!v.texture_url
      )
    : null,
  published_at: null, // resolved per create/update below
})

// Resolve os nomes das categorias selecionadas (contexto para o SEO por IA).
const resolveCategoryNames = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  categoryIds: string[]
): Promise<string[]> => {
  if (!categoryIds.length) return []
  const { data } = await supabase
    .from('product_categories')
    .select('name')
    .in('id', categoryIds)
  return (data ?? []).map((c) => c.name)
}

const uniqueViolationMessage = (msg: string): string =>
  msg.includes('sku')
    ? 'Já existe um produto com esse SKU'
    : 'Já existe um produto com esse slug'

// Replace the product's category mappings with the given ids.
const syncCategories = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  productId: string,
  categoryIds: string[]
) => {
  await supabase.from('product_category_map').delete().eq('product_id', productId)
  if (categoryIds.length) {
    await supabase
      .from('product_category_map')
      .insert(categoryIds.map((category_id) => ({ product_id: productId, category_id })))
  }
}

// Replace the product's characteristic mappings (material/soquete) with the given ids.
const syncCharacteristics = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  productId: string,
  characteristicIds: string[]
) => {
  await supabase.from('product_characteristic_map').delete().eq('product_id', productId)
  if (characteristicIds.length) {
    await supabase
      .from('product_characteristic_map')
      .insert(characteristicIds.map((characteristic_id) => ({ product_id: productId, characteristic_id })))
  }
}

// Replace the product's images, returning URLs that were removed (for R2 cleanup).
const syncImages = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  productId: string,
  images: { url: string; alt: string }[]
): Promise<string[]> => {
  const { data: existing } = await supabase
    .from('product_images')
    .select('url')
    .eq('product_id', productId)
  const existingUrls = (existing ?? []).map((r) => r.url)
  const nextUrls = new Set(images.map((i) => i.url))
  const removed = existingUrls.filter((u) => !nextUrls.has(u))

  await supabase.from('product_images').delete().eq('product_id', productId)
  if (images.length) {
    await supabase.from('product_images').insert(
      images.map((img, i) => ({
        product_id: productId,
        url: img.url,
        alt: img.alt.trim() || null,
        sort_order: i,
      }))
    )
  }
  return removed
}

// Reconcile a product's 3D folder (modelos_3d/<slug>/): delete every stored
// object no longer referenced by the product — a replaced model/poster, textures
// of removed variations, and files uploaded then abandoned before saving. This is
// the single point where 3D storage is pruned: nothing is deleted while editing.
// `keepUrls` are the URLs the saved product still references; `folderHintUrls`
// (e.g. the previously stored URLs) only help locate the folder — useful when 3D
// is being turned off and no new URL remains to derive the prefix from.
// Best-effort: failures are logged, never block the save.
const reconcileModelFolder = async (
  keepUrls: (string | null | undefined)[],
  folderHintUrls: (string | null | undefined)[] = []
) => {
  try {
    const { listR2Keys, deleteR2Objects, r2KeyFromPublicUrl } = await import(
      '@/lib/storage/r2-client'
    )

    // Derive modelos_3d/<slug>/ from any known key (new or previously stored).
    let prefix: string | null = null
    for (const u of [...keepUrls, ...folderHintUrls]) {
      if (!u) continue
      const m = r2KeyFromPublicUrl(u)?.match(/^(modelos_3d\/[^/]+)\//)
      if (m) {
        prefix = `${m[1]}/`
        break
      }
    }
    if (!prefix) return // product has no assets in our R2 model namespace

    const keep = new Set(
      keepUrls
        .map((u) => (u ? r2KeyFromPublicUrl(u) : null))
        .filter((k): k is string => !!k)
    )
    const stored = await listR2Keys(prefix)
    const toDelete = stored.filter((k) => !keep.has(k))
    if (toDelete.length) await deleteR2Objects(toDelete)
  } catch (err) {
    console.error('[reconcileModelFolder]', (err as Error).message)
  }
}

// Best-effort R2 deletion for a set of public URLs (dynamic import → no coupling).
const cleanupUrls = async (urls: string[]) => {
  const real = urls.filter(Boolean)
  if (!real.length) return
  try {
    const { r2KeyFromPublicUrl, deleteR2Objects } = await import('@/lib/storage/r2-client')
    const keys = real.map((u) => r2KeyFromPublicUrl(u)).filter((k): k is string => !!k)
    if (keys.length) await deleteR2Objects(keys)
  } catch (err) {
    console.error('[cleanupUrls]', (err as Error).message)
  }
}

// ================================================================
// isProductSlugTaken — checagem ao vivo de slug duplicado no formulário.
// Aceita o slug informado OU o derivado do nome; ignora o próprio produto
// na edição (excludeId).
// ================================================================
export const isProductSlugTaken = async (
  rawSlug: string,
  excludeId?: string
): Promise<boolean> => {
  const slug = (rawSlug || '').trim()
  if (!slug || !SLUG_RE.test(slug)) return false

  const supabase = await createSupabaseServerClient()
  let query = supabase.from('products').select('id').eq('slug', slug).limit(1)
  if (excludeId) query = query.neq('id', excludeId)

  const { data, error } = await query
  if (error) {
    console.error('[isProductSlugTaken]', error.message)
    return false
  }
  return (data?.length ?? 0) > 0
}

// ================================================================
// createProductAction
// ================================================================
export const createProductAction = async (
  input: ProductFormInput
): Promise<ProductActionResult> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const parsed = productSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }
  const d = parsed.data

  const columns = toProductColumns(d)

  // SEO por IA (2 tentativas) com fallback determinístico automático.
  const categoryNames = await resolveCategoryNames(supabase, d.category_ids)
  const seo = await generateProductSeo({
    name: d.name,
    description: d.description,
    categories: categoryNames,
    environment: d.environment,
  })

  const { data: created, error } = await supabase
    .from('products')
    .insert({
      ...columns,
      seo_title: seo.seo_title,
      seo_description: seo.seo_description,
      seo_keywords: seo.seo_keywords,
      author_id: user.id, // server-side only — never from input
      published_at: d.status === 'published' ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (error || !created) {
    console.error('[createProductAction]', error?.message)
    if (error?.code === '23505') return { error: uniqueViolationMessage(error.message) }
    return { error: 'Erro ao criar produto' }
  }

  await syncCategories(supabase, created.id, d.category_ids)
  await syncCharacteristics(supabase, created.id, d.characteristic_ids)
  await syncImages(supabase, created.id, d.images)

  // Prune any 3D assets uploaded then abandoned before this first save.
  await reconcileModelFolder([
    columns.model_3d_url,
    columns.model_3d_poster,
    ...(columns.model_3d_variations ?? []).map((v) => v.texture_url),
  ])

  revalidatePath('/admin/products')
  return { success: true, id: created.id }
}

// ================================================================
// updateProductAction
// ================================================================
export const updateProductAction = async (
  input: ProductFormInput
): Promise<ProductActionResult> => {
  const productId = input.id
  if (!productId) return { error: 'ID inválido' }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const parsed = productSchema.safeParse(input)
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

  // Existing row — for ownership, old asset cleanup and published_at carry-over.
  const { data: existing } = await supabase
    .from('products')
    .select('cover_image, model_3d_url, model_3d_poster, model_3d_variations, published_at')
    .eq('id', productId)
    .single()

  const columns = toProductColumns(d)
  const publishedAt =
    d.status === 'published'
      ? existing?.published_at ?? new Date().toISOString()
      : existing?.published_at ?? null

  // SEO por IA (2 tentativas) com fallback determinístico automático.
  const categoryNames = await resolveCategoryNames(supabase, d.category_ids)
  const seo = await generateProductSeo({
    name: d.name,
    description: d.description,
    categories: categoryNames,
    environment: d.environment,
  })

  const updateData = {
    ...columns,
    seo_title: seo.seo_title,
    seo_description: seo.seo_description,
    seo_keywords: seo.seo_keywords,
    published_at: publishedAt,
  }

  const { error } = isAdmin
    ? await supabase.from('products').update(updateData).eq('id', productId)
    : await supabase.from('products').update(updateData).eq('id', productId).eq('author_id', user.id)

  if (error) {
    console.error('[updateProductAction]', error.message)
    if (error.code === '23505') return { error: uniqueViolationMessage(error.message) }
    return { error: 'Erro ao atualizar produto' }
  }

  await syncCategories(supabase, productId, d.category_ids)
  await syncCharacteristics(supabase, productId, d.characteristic_ids)
  const removedImageUrls = await syncImages(supabase, productId, d.images)

  // R2 cleanup (produtos/ namespace): removed gallery images + a replaced cover.
  const replaced = (old: string | null | undefined, next: string | null) =>
    old && old !== next ? [old] : []
  await cleanupUrls([
    ...removedImageUrls,
    ...replaced(existing?.cover_image, columns.cover_image),
  ])

  // R2 reconcile (modelos_3d/<slug>/): prune the old model, replaced poster,
  // textures of removed variations and any abandoned upload — in one pass.
  const existingVariations =
    (existing?.model_3d_variations as Model3dVariation[] | null) ?? []
  await reconcileModelFolder(
    [
      columns.model_3d_url,
      columns.model_3d_poster,
      ...(columns.model_3d_variations ?? []).map((v) => v.texture_url),
    ],
    [
      existing?.model_3d_url,
      existing?.model_3d_poster,
      ...existingVariations.map((v) => v.texture_url),
    ]
  )

  revalidatePath('/admin/products')
  revalidatePath(`/admin/products/${productId}/edit`)
  return { success: true, id: productId }
}
