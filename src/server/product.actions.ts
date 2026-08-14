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
// Best-effort R2 cleanup on product delete — removes ALL files associated with
// the product by deleting its entire folders (produtos/<slug>/ and
// modelos_3d/<slug>/). Folders are derived from the product's real stored keys,
// so cover, gallery images, the 3D model, its poster and every texture variation
// (plus any orphan) go together. Dynamic import so the dashboard never depends on
// R2 env being present; storage cleanup failing never blocks the DB delete.
// ================================================================
const cleanupProductStorage = async (productIds: string[]): Promise<void> => {
  if (!productIds.length) return
  try {
    const supabase = await createSupabaseServerClient()
    const [{ data: products }, { data: images }] = await Promise.all([
      supabase
        .from('products')
        .select('cover_image, model_3d_url, model_3d_poster, model_3d_variations')
        .in('id', productIds),
      supabase.from('product_images').select('url').in('product_id', productIds),
    ])

    const urls = [
      ...(products ?? []).flatMap((p) => [
        p.cover_image,
        p.model_3d_url,
        p.model_3d_poster,
        ...(((p.model_3d_variations as Model3dVariation[] | null) ?? []).map((v) => v.texture_url)),
      ]),
      ...(images ?? []).map((i) => i.url),
    ].filter((u): u is string => !!u)

    if (!urls.length) return

    const { r2KeyFromPublicUrl, deleteR2Prefix } = await import('@/lib/storage/r2-client')

    // Distinct product folders (produtos/<slug>/, modelos_3d/<slug>/) from real keys.
    const prefixes = new Set<string>()
    for (const u of urls) {
      const m = r2KeyFromPublicUrl(u)?.match(/^((?:produtos|modelos_3d)\/[^/]+)\//)
      if (m) prefixes.add(`${m[1]}/`)
    }

    await Promise.allSettled([...prefixes].map((p) => deleteR2Prefix(p)))
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
  // SKU obrigatório no save manual; no auto-save de rascunho pode faltar (usa slug).
  sku: z.string().optional().default(''),
  description: z.string().optional().default(''),
  short_description: z.string().optional().default(''),
  cover_image: z.string().optional().default(''),
  status: z.enum(['draft', 'published']),
  environment: z.enum(['interno', 'externo']),
  height_cm: z.string().optional().default(''),
  width_cm: z.string().optional().default(''),
  depth_cm: z.string().optional().default(''),
  weight_kg: z.string().optional().default(''),
  // Categorias: 1 principal (exibida no card) + N secundárias. Ambas filtráveis.
  primary_category_id: z.string().uuid().nullable().optional().default(null),
  secondary_category_ids: z.array(z.string().uuid()).optional().default([]),
  // Materiais (lista única): 1 principal (card) + N secundários. Ambos filtráveis.
  primary_material_id: z.string().uuid().nullable().optional().default(null),
  secondary_material_ids: z.array(z.string().uuid()).optional().default([]),
  // Soquetes: N por produto, filtráveis.
  soquete_ids: z.array(z.string().uuid()).optional().default([]),
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
  // Abas novas do produto (Informações Técnicas, Características, Aplicações, Arquivos)
  tech_specs: z
    .array(z.object({ label: z.string().default(''), value: z.string().default('') }))
    .optional()
    .default([]),
  features: z.array(z.string()).optional().default([]),
  applications: z.string().optional().default(''),
  datasheet_url: z.string().optional().default(''),
  datasheet_filename: z.string().optional().default(''),
  ies_url: z.string().optional().default(''),
  ies_filename: z.string().optional().default(''),
  certificates_url: z.string().optional().default(''),
  certificates_filename: z.string().optional().default(''),
  // SEO não vem mais do formulário — é gerado por IA (fallback determinístico) no save.
})

export type ProductFormInput = z.input<typeof productSchema> & { id?: string }
export type ProductActionResult = { error: string } | { success: true; id: string }

const numOrNull = (v: string): number | null => {
  if (!v.trim()) return null
  const n = parseFloat(v.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// SEO mínimo determinístico (sem IA) — usado no auto-save de rascunho.
const draftSeo = (name: string, shortDesc: string) => ({
  seo_title: name.slice(0, 60),
  seo_description: (shortDesc || '').slice(0, 160),
  seo_keywords: [] as string[],
})

// Map validated form data → products row columns (shared create/update).
// SEO (seo_title/description/keywords) é resolvido à parte (IA) no create/update.
const toProductColumns = (
  d: z.infer<typeof productSchema>
): Omit<InsertProduct, 'author_id' | 'seo_title' | 'seo_description' | 'seo_keywords'> => {
  // Mantém só variações completas (cor precisa de HEX, textura precisa de URL).
  const variations = d.has_3d_model
    ? d.model_3d_variations.filter((v) => (v.type === 'color' ? !!v.color : !!v.texture_url))
    : []
  // Um material só é "registrado" se tiver ao menos uma variação. Labels de
  // materiais sem variação são descartados — assim, um produto sem nenhuma
  // variação recarrega a lista completa de materiais ao editar (mapa vazio),
  // e remover todas as variações volta a exibir a lista completa.
  const materialsWithVars = new Set(variations.map((v) => v.material))
  const materialLabels = d.has_3d_model
    ? Object.fromEntries(
        Object.entries(d.model_3d_material_labels).filter(([m]) => materialsWithVars.has(m))
      )
    : null

  return {
    name: d.name.trim(),
    // Fallback: slug derivado do nome quando não informado.
    slug: d.slug.trim() || toSlug(d.name),
    sku: d.sku.trim(),
    description: d.description.trim() || null,
    short_description: d.short_description.trim() || null,
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
    model_3d_material_labels: materialLabels,
    model_3d_variations: d.has_3d_model ? variations : null,
    // Abas novas — descarta linhas/itens vazios.
    tech_specs: d.tech_specs
      .map((s) => ({ label: s.label.trim(), value: s.value.trim() }))
      .filter((s) => s.label || s.value),
    features: d.features.map((f) => f.trim()).filter(Boolean),
    applications: d.applications.trim() || null,
    datasheet_url: d.datasheet_url.trim() || null,
    datasheet_filename: d.datasheet_filename.trim() || null,
    ies_url: d.ies_url.trim() || null,
    ies_filename: d.ies_filename.trim() || null,
    certificates_url: d.certificates_url.trim() || null,
    certificates_filename: d.certificates_filename.trim() || null,
    published_at: null, // resolved per create/update below
  }
}

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

// Replace the product's category mappings: 1 primary (is_primary=true) + N
// secondary. The primary never doubles as a secondary.
const syncCategories = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  productId: string,
  primaryId: string | null,
  secondaryIds: string[]
) => {
  await supabase.from('product_category_map').delete().eq('product_id', productId)
  const rows: { product_id: string; category_id: string; is_primary: boolean }[] = []
  if (primaryId) rows.push({ product_id: productId, category_id: primaryId, is_primary: true })
  for (const id of secondaryIds) {
    if (id !== primaryId) rows.push({ product_id: productId, category_id: id, is_primary: false })
  }
  if (rows.length) await supabase.from('product_category_map').insert(rows)
}

// Replace the product's characteristic mappings: 1 primary material
// (is_primary=true) + N secondary materials + N soquetes (is_primary=false).
const syncCharacteristics = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  productId: string,
  primaryMaterialId: string | null,
  secondaryMaterialIds: string[],
  soqueteIds: string[]
) => {
  await supabase.from('product_characteristic_map').delete().eq('product_id', productId)
  const rows: { product_id: string; characteristic_id: string; is_primary: boolean }[] = []
  const seen = new Set<string>()
  if (primaryMaterialId) {
    rows.push({ product_id: productId, characteristic_id: primaryMaterialId, is_primary: true })
    seen.add(primaryMaterialId)
  }
  for (const id of [...secondaryMaterialIds, ...soqueteIds]) {
    if (seen.has(id)) continue
    seen.add(id)
    rows.push({ product_id: productId, characteristic_id: id, is_primary: false })
  }
  if (rows.length) await supabase.from('product_characteristic_map').insert(rows)
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

// Reconcile a product's R2 folders (produtos/<slug>/ and modelos_3d/<slug>/):
// after each save, delete every stored object that the product no longer
// references — replaced cover/model/poster, textures of removed variations,
// gallery images that were dropped, and (crucially) any file uploaded then
// abandoned without being used. This is the single point where product storage
// is pruned, so uploads that go unused don't accumulate.
//   - `keepUrls`: every URL the saved product still references (cover, gallery
//     images, model, poster, texture variations).
//   - `hintUrls`: previously stored URLs — only used to locate the folder
//     prefixes (e.g. when 3D/cover is removed and no new URL remains to derive them).
// Best-effort: failures are logged, never block the save.
const reconcileProductFolders = async (
  keepUrls: (string | null | undefined)[],
  hintUrls: (string | null | undefined)[] = []
) => {
  try {
    const { listR2Keys, deleteR2Objects, r2KeyFromPublicUrl } = await import(
      '@/lib/storage/r2-client'
    )

    // Distinct folder prefixes (produtos/<slug>/ and/or modelos_3d/<slug>/) from
    // real keys — external/pasted URLs resolve to null and are ignored.
    const prefixes = new Set<string>()
    for (const u of [...keepUrls, ...hintUrls]) {
      if (!u) continue
      const m = r2KeyFromPublicUrl(u)?.match(/^((?:produtos|modelos_3d)\/[^/]+)\//)
      if (m) prefixes.add(`${m[1]}/`)
    }
    if (!prefixes.size) return // product has no assets in our R2 namespaces

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
    console.error('[reconcileProductFolders]', (err as Error).message)
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
  input: ProductFormInput,
  opts?: { autosave?: boolean }
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

  // SKU: obrigatório no save manual; no auto-save cai para o slug (permite
  // criar o rascunho só com o nome).
  if (!opts?.autosave && !d.sku.trim()) return { error: 'SKU é obrigatório' }
  if (!d.sku.trim()) d.sku = d.slug.trim() || toSlug(d.name)

  const columns = toProductColumns(d)

  // SEO por IA só quando o produto é salvo como PUBLICADO. Rascunhos (auto-save
  // ou save manual) usam SEO mínimo determinístico.
  const seo =
    d.status === 'published'
      ? await generateProductSeo({
          name: d.name,
          description: d.description,
          categories: await resolveCategoryNames(
            supabase,
            [d.primary_category_id, ...d.secondary_category_ids].filter((x): x is string => !!x)
          ),
          environment: d.environment,
        })
      : draftSeo(d.name, d.short_description)

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

  await syncCategories(supabase, created.id, d.primary_category_id, d.secondary_category_ids)
  await syncCharacteristics(
    supabase,
    created.id,
    d.primary_material_id,
    d.secondary_material_ids,
    d.soquete_ids
  )
  await syncImages(supabase, created.id, d.images)

  // Remove do R2 qualquer arquivo (imagem ou modelo/textura) que tenha sido
  // enviado mas não é usado pelo produto salvo.
  await reconcileProductFolders([
    columns.cover_image,
    ...d.images.map((i) => i.url),
    columns.model_3d_url,
    columns.model_3d_poster,
    ...(columns.model_3d_variations ?? []).map((v) => v.texture_url),
    columns.datasheet_url,
    columns.ies_url,
    columns.certificates_url,
  ])

  revalidatePath('/admin/products')
  return { success: true, id: created.id }
}

// ================================================================
// updateProductAction
// ================================================================
export const updateProductAction = async (
  input: ProductFormInput,
  opts?: { autosave?: boolean }
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

  // SKU: obrigatório no save manual; no auto-save cai para o slug.
  if (!opts?.autosave && !d.sku.trim()) return { error: 'SKU é obrigatório' }
  if (!d.sku.trim()) d.sku = d.slug.trim() || toSlug(d.name)

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = profile?.role === 'admin'

  // Existing row — for ownership, old asset cleanup, published_at carry-over and
  // (no auto-save) reuso do SEO já gerado.
  const { data: existing } = await supabase
    .from('products')
    .select(
      'cover_image, model_3d_url, model_3d_poster, model_3d_variations, published_at, seo_title, seo_description, seo_keywords'
    )
    .eq('id', productId)
    .single()

  const columns = toProductColumns(d)
  const publishedAt =
    d.status === 'published'
      ? existing?.published_at ?? new Date().toISOString()
      : existing?.published_at ?? null

  // SEO por IA só quando salvo como PUBLICADO. Rascunho mantém o SEO existente
  // (ou mínimo) — sem chamar a IA.
  const seo =
    d.status === 'published'
      ? await generateProductSeo({
          name: d.name,
          description: d.description,
          categories: await resolveCategoryNames(
            supabase,
            [d.primary_category_id, ...d.secondary_category_ids].filter((x): x is string => !!x)
          ),
          environment: d.environment,
        })
      : {
          seo_title: existing?.seo_title ?? draftSeo(d.name, d.short_description).seo_title,
          seo_description:
            existing?.seo_description ?? draftSeo(d.name, d.short_description).seo_description,
          seo_keywords: existing?.seo_keywords ?? [],
        }

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

  await syncCategories(supabase, productId, d.primary_category_id, d.secondary_category_ids)
  await syncCharacteristics(
    supabase,
    productId,
    d.primary_material_id,
    d.secondary_material_ids,
    d.soquete_ids
  )
  await syncImages(supabase, productId, d.images)

  // R2 reconcile (produtos/<slug>/ + modelos_3d/<slug>/): remove tudo que o
  // produto salvo não usa mais — capa/modelo/poster substituídos, texturas de
  // variações removidas, imagens da galeria descartadas e arquivos enviados mas
  // nunca usados. Uma passada por ambas as pastas.
  const existingVariations =
    (existing?.model_3d_variations as Model3dVariation[] | null) ?? []
  await reconcileProductFolders(
    [
      columns.cover_image,
      ...d.images.map((i) => i.url),
      columns.model_3d_url,
      columns.model_3d_poster,
      ...(columns.model_3d_variations ?? []).map((v) => v.texture_url),
      columns.datasheet_url,
      columns.ies_url,
      columns.certificates_url,
    ],
    [
      existing?.cover_image,
      existing?.model_3d_url,
      existing?.model_3d_poster,
      ...existingVariations.map((v) => v.texture_url),
    ]
  )

  revalidatePath('/admin/products')
  revalidatePath(`/admin/products/${productId}/edit`)
  return { success: true, id: productId }
}
