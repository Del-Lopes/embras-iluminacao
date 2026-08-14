import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { CatalogSidebar } from '@/components/catalog/CatalogSidebar'
import { CatalogControls } from '@/components/catalog/CatalogControls'
import { CatalogActiveFilters } from '@/components/catalog/CatalogActiveFilters'
import { ProductCard } from '@/components/catalog/ProductCard'
import { flattenCategoryTree } from '@/lib/utils/category-tree'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { getSiteSettings } from '@/server/site-settings.actions'
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
  soquete?: string
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
  const soquete = params.soquete?.trim() ?? ''
  const sort = params.sort?.trim() || 'recentes'

  // tipo / material / soquete são multi-seleção (lista separada por vírgula)
  const parseList = (s: string) =>
    s ? s.split(',').map((v) => v.trim()).filter(Boolean) : []
  const tipoSlugs = parseList(tipo)
  const materialSlugs = parseList(material)
  const soqueteSlugs = parseList(soquete)
  const view: 'grid' | 'list' = params.view === 'list' ? 'list' : 'grid'

  const supabase = await createSupabaseServerClient()

  // Configurações do site (PDF do catálogo para download).
  const siteSettings = await getSiteSettings()

  // Filter sources: árvore de categorias + materiais + soquetes (características)
  const [{ data: catData }, { data: matData }, { data: soqData }] = await Promise.all([
    supabase
      .from('product_categories')
      .select('id, name, slug, parent_id, description, sort_order, created_at')
      .order('sort_order')
      .order('name'),
    supabase
      .from('product_characteristics')
      .select('id, name, slug')
      .eq('type', 'material')
      .order('sort_order')
      .order('name'),
    supabase
      .from('product_characteristics')
      .select('id, name, slug')
      .eq('type', 'soquete')
      .order('sort_order')
      .order('name'),
  ])

  const categories = flattenCategoryTree((catData ?? []) as ProductCategory[])
  const materialChars = (matData ?? []) as { id: string; name: string; slug: string }[]
  const materials = materialChars.map((c) => ({ slug: c.slug, name: c.name }))
  const soqueteChars = (soqData ?? []) as { id: string; name: string; slug: string }[]
  const soquetes = soqueteChars.map((c) => ({ slug: c.slug, name: c.name }))

  // Resolve "tipo" (slugs de categoria) → product ids (união das categorias selecionadas)
  let tipoProductIds: string[] | null = null
  if (tipoSlugs.length) {
    const ids = categories.filter((c) => tipoSlugs.includes(c.slug)).map((c) => c.id)
    if (!ids.length) {
      tipoProductIds = []
    } else {
      const { data: maps } = await supabase
        .from('product_category_map')
        .select('product_id')
        .in('category_id', ids)
      tipoProductIds = [...new Set((maps ?? []).map((m) => m.product_id))]
    }
  }

  // Resolve "material" (slugs) → product ids (principal OU secundário, união dos materiais)
  let materialProductIds: string[] | null = null
  if (materialSlugs.length) {
    const ids = materialChars.filter((c) => materialSlugs.includes(c.slug)).map((c) => c.id)
    if (!ids.length) {
      materialProductIds = []
    } else {
      const { data: maps } = await supabase
        .from('product_characteristic_map')
        .select('product_id')
        .in('characteristic_id', ids)
      materialProductIds = [...new Set((maps ?? []).map((m) => m.product_id))]
    }
  }

  // Resolve "soquete" (slugs) → product ids (união dos soquetes selecionados)
  let soqueteProductIds: string[] | null = null
  if (soqueteSlugs.length) {
    const ids = soqueteChars.filter((c) => soqueteSlugs.includes(c.slug)).map((c) => c.id)
    if (!ids.length) {
      soqueteProductIds = []
    } else {
      const { data: maps } = await supabase
        .from('product_characteristic_map')
        .select('product_id')
        .in('characteristic_id', ids)
      soqueteProductIds = [...new Set((maps ?? []).map((m) => m.product_id))]
    }
  }

  // Interseção das restrições por id (tipo ∩ material ∩ soquete)
  const idConstraints = [tipoProductIds, materialProductIds, soqueteProductIds].filter(
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
    else if (sort === 'antigos') query = query.order('published_at', { ascending: true })
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
          .select('product_id, is_primary, product_categories(name, slug)')
          .in('product_id', ids),
        supabase
          .from('product_characteristic_map')
          .select('product_id, is_primary, product_characteristics(name, type)')
          .in('product_id', ids),
      ])

      // Card exibe apenas a categoria PRINCIPAL (is_primary).
      const catByProduct = new Map<string, { name: string; slug: string }>()
      for (const row of (catMap ?? []) as unknown as {
        product_id: string
        is_primary: boolean
        product_categories: { name: string; slug: string } | null
      }[]) {
        if (row.product_categories && row.is_primary) {
          catByProduct.set(row.product_id, row.product_categories)
        }
      }

      // Card exibe apenas o material PRINCIPAL (is_primary + type 'material').
      const matByProduct = new Map<string, string>()
      for (const row of (charMap ?? []) as unknown as {
        product_id: string
        is_primary: boolean
        product_characteristics: { name: string; type: string } | null
      }[]) {
        const c = row.product_characteristics
        if (c && c.type === 'material' && row.is_primary) {
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
    if (soquete) urlParams.set('soquete', soquete)
    if (sort !== 'recentes') urlParams.set('sort', sort)
    if (view !== 'grid') urlParams.set('view', view)
    if (p > 1) urlParams.set('page', String(p))
    const qs = urlParams.toString()
    return qs ? `/catalogo?${qs}` : '/catalogo'
  }

  return (
    <main className="min-h-screen bg-(--color-bg)">
      <Header variant="solid" />

      {/* ── Hero ── */}
      <div
        className="blog-index-hero blog-index-hero--banner"
        style={{ backgroundImage: 'url(/images/catalogo-bg.webp)' }}
      >
        <div className="blog-index-hero-inner">
          <h1 className="blog-index-title">Catálogo</h1>
          <p className="blog-index-desc">
            Soluções de iluminação Embras para áreas internas e externas.
          </p>
          {siteSettings?.catalog_url && (
            <a
              href={siteSettings.catalog_url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="catalog-download-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Baixar catálogo
            </a>
          )}
        </div>
      </div>

      {/* ── Body: sidebar + grid ── */}
      <div className="blog-index-body">
        <Suspense fallback={<aside className="blog-sidebar catalog-sidebar" />}>
          <CatalogSidebar
            categories={categories}
            materials={materials}
            soquetes={soquetes}
            currentQ={q}
            currentEnvironment={environment}
            currentTipo={tipo}
            currentMaterial={material}
            currentSoquete={soquete}
          />
        </Suspense>

        <section className="blog-grid-section">
          <div className="catalog-toolbar">
            <Suspense fallback={<div className="catalog-controls" />}>
              <CatalogControls total={total} currentSort={sort} currentView={view} />
            </Suspense>

            {/* Chips dos filtros ativos — abaixo da linha de controles */}
            <Suspense fallback={null}>
              <CatalogActiveFilters
                q={q}
                environment={environment}
                tipo={tipo}
                material={material}
                soquete={soquete}
                categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
                materials={materials}
                soquetes={soquetes}
              />
            </Suspense>
          </div>

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
