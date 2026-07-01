import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { getProducts } from '@/server/product.actions'
import { ProductTableToolbar } from '@/components/admin/product-table-toolbar'
import { ProductDataTable } from '@/components/admin/product-data-table'
import type { ProductCategory, ProductStatus } from '@/lib/db/schema'

export const metadata: Metadata = {
  title: 'Produtos',
  robots: { index: false, follow: false },
}

type SearchParams = Promise<{
  page?: string
  status?: string
  q?: string
  category_id?: string
  date_from?: string
  date_to?: string
  sort?: string
  dir?: string
}>

// Flatten the category tree into a depth-ordered list for the filter dropdown.
const orderByDepth = (categories: ProductCategory[]) => {
  const byParent = new Map<string | null, ProductCategory[]>()
  for (const cat of categories) {
    const list = byParent.get(cat.parent_id) ?? []
    list.push(cat)
    byParent.set(cat.parent_id, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'pt-BR'))
  }
  const out: { id: string; name: string; depth: number }[] = []
  const walk = (parentId: string | null, depth: number) => {
    for (const cat of byParent.get(parentId) ?? []) {
      out.push({ id: cat.id, name: cat.name, depth })
      walk(cat.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}

export default async function ProductsDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const status = (params.status ?? 'all') as ProductStatus | 'all'
  const q = params.q ?? ''
  const category_id = params.category_id ?? ''
  const date_from = params.date_from ?? ''
  const date_to = params.date_to ?? ''
  const sort = params.sort ?? ''
  const dir = params.dir ?? ''

  const supabase = await createSupabaseServerClient()

  const [
    { count: totalProducts },
    { count: publishedProducts },
    { count: draftProducts },
    productsResult,
    { data: categoriesData },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    getProducts({ page, status, q, category_id, date_from, date_to, sort, dir }),
    supabase
      .from('product_categories')
      .select('id, name, slug, parent_id, description, sort_order, created_at')
      .order('sort_order')
      .order('name'),
  ])

  const categories = orderByDepth((categoriesData ?? []) as ProductCategory[])

  // Preserve filters + sort for pagination / sort links
  const rawParams: Record<string, string> = {}
  if (params.status) rawParams.status = params.status
  if (params.q) rawParams.q = params.q
  if (params.category_id) rawParams.category_id = params.category_id
  if (params.date_from) rawParams.date_from = params.date_from
  if (params.date_to) rawParams.date_to = params.date_to
  if (params.sort) rawParams.sort = params.sort
  if (params.dir) rawParams.dir = params.dir

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Produtos</h1>
          <p className="dashboard-subtitle">Gerenciar produtos do catálogo</p>
        </div>
        <div className="dashboard-header-actions">
          <Link href="/admin/products/new" className="action-btn action-btn--edit">
            + Novo Produto
          </Link>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total de Produtos</span>
          <span className="stat-value">{totalProducts ?? 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Publicados</span>
          <span className="stat-value">{publishedProducts ?? 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Rascunhos</span>
          <span className="stat-value">{draftProducts ?? 0}</span>
        </div>
      </div>

      <ProductTableToolbar
        currentStatus={status}
        currentQ={q}
        currentCategoryId={category_id}
        currentDateFrom={date_from}
        currentDateTo={date_to}
        categories={categories}
      />

      <ProductDataTable
        products={productsResult.products}
        total={productsResult.total}
        page={productsResult.page}
        pageCount={productsResult.pageCount}
        searchParams={rawParams}
      />
    </div>
  )
}
