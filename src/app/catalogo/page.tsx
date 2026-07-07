import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { BlogHeader } from '@/components/blog/BlogHeader'
import Footer from '@/components/layout/Footer'
import { CatalogSidebar } from '@/components/catalog/CatalogSidebar'
import { CatalogControls } from '@/components/catalog/CatalogControls'
import { ProductCard } from '@/components/catalog/ProductCard'
import { flattenCategoryTree } from '@/lib/utils/category-tree'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import type { ProductCardData } from '@/components/catalog/ProductCard'
import type { ProductCategory } from '@/lib/db/schema'

export const metadata: Metadata = {
  title: 'Catálogo',
  description:
    'Catálogo de amostra Embras — luminárias e soluções de iluminação para áreas internas e externas.',
}

const PAGE_SIZE = 9

type SearchParams = Promise<{
  page?: string
  q?: string
  environment?: string
  tipo?: string
  material?: string
  sort?: string
  view?: string
}>

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const q = params.q?.trim() ?? ''
  const environment = params.environment?.trim() ?? ''
  const tipo = params.tipo?.trim() ?? ''
  const material = params.material?.trim() ?? ''
  const sort = params.sort?.trim() || 'recentes'
  const view: 'grid' | 'list' = params.view === 'list' ? 'list' : 'grid'

  const supabase = await createSupabaseServerClient()

  // Filter sources: category tree + valores de Material Principal (características)
  const [{ data: catData }, { data: matData }] = await Promise.all([
    supabase
      .from('product_categories')
      .select('id, name, slug, parent_id, description, sort_order, created_at')
      .order('sort_order')
      .order('name'),
    supabase
      .from('product_characteristics')
      .select('id, name, slug')
      .eq('type', 'material_principal')
      .order('sort_order')
      .order('name'),
  ])

  const categories = flattenCategoryTree((catData ?? []) as ProductCategory[])
  const materialChars = (matData ?? []) as { id: string; name: string; slug: string }[]
  const materials = materialChars.map((c) => ({ slug: c.slug, name: c.name }))

  // Resolve "tipo" (category slug) → product ids via the m2m map
  let tipoProductIds: string[] | null = null
  if (tipo) {
    const category = categories.find((c) => c.slug === tipo)
    if (!category) {
      tipoProductIds = []
    } else {
      const { data: maps } = await supabase
        .from('product_category_map')
        .select('product_id')
        .eq('category_id', category.id)
      tipoProductIds = (maps ?? []).map((m) => m.product_id)
    }
  }

  // Resolve "material" (slug da característica Material Principal) → product ids
  let materialProductIds: string[] | null = null
  if (material) {
    const mc = materialChars.find((c) => c.slug === material)
    if (!mc) {
      materialProductIds = []
    } else {
      const { data: maps } = await supabase
        .from('product_characteristic_map')
        .select('product_id')
        .eq('characteristic_id', mc.id)
      materialProductIds = (maps ?? []).map((m) => m.product_id)
    }
  }

  // Interseção das restrições por id (tipo ∩ material)
  const idConstraints = [tipoProductIds, materialProductIds].filter(
    (l): l is string[] => l !== null
  )
  const combinedIds: string[] | null =
    idConstraints.length === 0
      ? null
      : idConstraints.reduce((acc, list) => acc.filter((id) => list.includes(id)))
  const noResults = combinedIds !== null && combinedIds.length === 0

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let products: ProductCardData[] = []
  let total = 0

  // Short-circuit: filtro de id que não casa com nenhum produto → vazio
  if (!noResults) {
    let query = supabase
      .from('products')
      .select('id, name, slug, sku, cover_image, environment', {
        count: 'exact',
      })
      .eq('status', 'published')
      .range(from, to)

    if (sort === 'az') query = query.order('name', { ascending: true })
    else if (sort === 'za') query = query.order('name', { ascending: false })
    else query = query.order('published_at', { ascending: false })

    if (environment) query = query.eq('environment', environment as 'interno' | 'externo')
    if (combinedIds) query = query.in('id', combinedIds)
    // Sanitiza vírgulas/parênteses que quebram o parser do .or() do PostgREST
    const safeQ = q.replace(/[,()]/g, ' ').trim()
    if (safeQ) query = query.or(`name.ilike.%${safeQ}%,sku.ilike.%${safeQ}%`)

    const { data, count } = await query
    products = (data ?? []) as ProductCardData[]
    total = count ?? 0

    // Enriquece os cards com o tipo (categoria) e o Material Principal.
    if (products.length) {
      const ids = products.map((p) => p.id)
      const [{ data: catMap }, { data: charMap }] = await Promise.all([
        supabase
          .from('product_category_map')
          .select('product_id, product_categories(name, slug)')
          .in('product_id', ids),
        supabase
          .from('product_characteristic_map')
          .select('product_id, product_characteristics(name, type)')
          .in('product_id', ids),
      ])

      const catByProduct = new Map<string, { name: string; slug: string }>()
      for (const row of (catMap ?? []) as unknown as {
        product_id: string
        product_categories: { name: string; slug: string } | null
      }[]) {
        if (row.product_categories && !catByProduct.has(row.product_id)) {
          catByProduct.set(row.product_id, row.product_categories)
        }
      }

      const matByProduct = new Map<string, string>()
      for (const row of (charMap ?? []) as unknown as {
        product_id: string
        product_characteristics: { name: string; type: string } | null
      }[]) {
        const c = row.product_characteristics
        if (c && c.type === 'material_principal' && !matByProduct.has(row.product_id)) {
          matByProduct.set(row.product_id, c.name)
        }
      }

      products = products.map((p) => ({
        ...p,
        category: catByProduct.get(p.id) ?? null,
        material: matByProduct.get(p.id) ?? null,
      }))
    }
  }

  const pageCount = Math.ceil(total / PAGE_SIZE)

  const buildHref = (p: number) => {
    const urlParams = new URLSearchParams()
    if (q) urlParams.set('q', q)
    if (environment) urlParams.set('environment', environment)
    if (tipo) urlParams.set('tipo', tipo)
    if (material) urlParams.set('material', material)
    if (sort !== 'recentes') urlParams.set('sort', sort)
    if (view !== 'grid') urlParams.set('view', view)
    if (p > 1) urlParams.set('page', String(p))
    const qs = urlParams.toString()
    return qs ? `/catalogo?${qs}` : '/catalogo'
  }

  return (
    <main className="min-h-screen bg-(--color-bg)">
      <BlogHeader />

      {/* ── Hero ── */}
      <div className="blog-index-hero">
        <div className="blog-index-hero-inner">
          <h1 className="blog-index-title">Catálogo</h1>
          <p className="blog-index-desc">
            Soluções de iluminação Embras para áreas internas e externas — amostras do nosso portfólio.
          </p>
        </div>
      </div>

      {/* ── Body: sidebar + grid ── */}
      <div className="blog-index-body">
        <Suspense fallback={<aside className="blog-sidebar catalog-sidebar" />}>
          <CatalogSidebar
            categories={categories}
            materials={materials}
            currentQ={q}
            currentEnvironment={environment}
            currentTipo={tipo}
            currentMaterial={material}
          />
        </Suspense>

        <section className="blog-grid-section">
          <Suspense fallback={<div className="catalog-controls" />}>
            <CatalogControls total={total} currentSort={sort} currentView={view} />
          </Suspense>

          {products.length === 0 ? (
            <p className="blog-grid-empty">Nenhum produto encontrado.</p>
          ) : (
            <div className={view === 'list' ? 'catalog-list' : 'catalog-grid'}>
              {products.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
          )}

          {pageCount > 1 && (
            <nav className="blog-pagination" aria-label="Paginação">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={buildHref(p)}
                  className={`blog-pagination-page${p === page ? ' blog-pagination-page--active' : ''}`}
                  aria-current={p === page ? 'page' : undefined}
                >
                  {p}
                </Link>
              ))}
            </nav>
          )}
        </section>
      </div>

      <Footer />
    </main>
  )
}
