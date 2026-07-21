import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { EditorJsContent } from '@/components/blog/EditorJsContent'
import { ProductGallery } from '@/components/catalog/ProductGallery'
import { ProductSpecs } from '@/components/catalog/ProductSpecs'
import { RelatedProducts } from '@/components/catalog/RelatedProducts'
import { ProductModelViewer } from '@/components/catalog/ProductModelViewer'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import type { Product, ProductCharacteristic } from '@/lib/db/schema'
import type { ProductCardData } from '@/components/catalog/ProductCard'

type Props = { params: Promise<{ slug: string }> }

const SELECT_CARD = 'id, name, slug, sku, cover_image, environment'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('products')
    .select('name, seo_title, seo_description, cover_image')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!data) return { title: 'Produto não encontrado' }

  return {
    title: data.seo_title ?? data.name,
    description: data.seo_description ?? undefined,
    openGraph: { images: data.cover_image ? [data.cover_image] : [] },
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  const product = data as Product | null
  if (!product) notFound()

  // Images + categories + características (parallel)
  const [{ data: imgData }, { data: mapData }, { data: charMapData }] = await Promise.all([
    supabase
      .from('product_images')
      .select('url, alt, sort_order')
      .eq('product_id', product.id)
      .order('sort_order'),
    supabase
      .from('product_category_map')
      .select('is_primary, product_categories(id, name, slug)')
      .eq('product_id', product.id),
    supabase
      .from('product_characteristic_map')
      .select('product_characteristics(type, name, sort_order)')
      .eq('product_id', product.id),
  ])

  const characteristics = (
    (charMapData ?? []) as unknown as {
      product_characteristics: { type: ProductCharacteristic['type']; name: string; sort_order: number } | null
    }[]
  )
    .map((m) => m.product_characteristics)
    .filter((c): c is { type: ProductCharacteristic['type']; name: string; sort_order: number } => !!c)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'pt-BR'))

  const images = (imgData ?? []).map((i) => ({ url: i.url, alt: i.alt ?? '' }))
  const categoryRows = (
    (mapData ?? []) as unknown as {
      is_primary: boolean
      product_categories: { id: string; name: string; slug: string } | null
    }[]
  ).filter((m): m is { is_primary: boolean; product_categories: { id: string; name: string; slug: string } } => !!m.product_categories)
  const categories = categoryRows.map((m) => m.product_categories)

  // Breadcrumb usa a categoria PRINCIPAL (is_primary); fallback para a primeira.
  const primaryCategory =
    categoryRows.find((m) => m.is_primary)?.product_categories ?? categories[0] ?? null

  // Related: share a category; fallback to same area of use
  let related: ProductCardData[] = []
  const categoryIds = categories.map((c) => c.id)
  if (categoryIds.length) {
    const { data: relMaps } = await supabase
      .from('product_category_map')
      .select('product_id')
      .in('category_id', categoryIds)
      .neq('product_id', product.id)
    const relIds = Array.from(new Set((relMaps ?? []).map((m) => m.product_id)))
    if (relIds.length) {
      const { data: relData } = await supabase
        .from('products')
        .select(SELECT_CARD)
        .eq('status', 'published')
        .in('id', relIds)
        .limit(8)
      related = (relData ?? []) as ProductCardData[]
    }
  }
  if (related.length === 0) {
    const { data: relData } = await supabase
      .from('products')
      .select(SELECT_CARD)
      .eq('status', 'published')
      .eq('environment', product.environment)
      .neq('id', product.id)
      .order('published_at', { ascending: false })
      .limit(8)
    related = (relData ?? []) as ProductCardData[]
  }

  // Share links (server-computed)
  const pageUrl = `https://embras.com.br/catalogo/${product.slug}`
  const encodedUrl = encodeURIComponent(pageUrl)
  const encodedTitle = encodeURIComponent(product.name)
  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
  }

  const hasDescription = !!product.description && product.description.replace(/<[^>]*>/g, '').trim().length > 0

  return (
    <main className="product-detail-page min-h-screen bg-(--color-bg)">
      <Header variant="solid" />

      <article className="product-detail">
        <div className="product-detail-top">
          {/* Gallery */}
          <ProductGallery
            coverImage={product.cover_image}
            images={images}
            name={product.name}
            has3d={product.has_3d_model && !!product.model_3d_url}
          />

          {/* Info — NO price / cart / buy button (sample catalog) */}
          <div className="product-info">
            <div className="product-info-cat">
              {primaryCategory ? (
                <Link href={`/catalogo?tipo=${primaryCategory.slug}`} className="product-info-category">
                  {primaryCategory.name}
                </Link>
              ) : (
                <span className="product-info-category">
                  {product.environment === 'externo' ? 'Área externa' : 'Área interna'}
                </span>
              )}
            </div>

            <h1 className="product-info-name">{product.name}</h1>
            <p className="product-info-sku">SKU: {product.sku}</p>
            {product.short_description && (
              <p className="product-info-short-desc">{product.short_description}</p>
            )}

            {/* Share — separador acima, "Compartilhar" com os ícones ao lado */}
            <div className="blog-share-wrap product-share-wrap">
              <p className="blog-share-label">Compartilhar:</p>
              <div className="blog-share">
                <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer" className="blog-share-icon" aria-label="Compartilhar no X">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.013 5.408z"/></svg>
                </a>
                <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer" className="blog-share-icon" aria-label="Compartilhar no Facebook">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href={shareLinks.linkedin} target="_blank" rel="noopener noreferrer" className="blog-share-icon" aria-label="Compartilhar no LinkedIn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a href={shareLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="blog-share-icon" aria-label="Compartilhar no WhatsApp">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Separador de largura TOTAL da página entre o bloco superior e as seções.
            Full-bleed: neutraliza o padding lateral do .product-detail com margens
            negativas via 50vw, saindo do container de 1100px. */}
        <hr className="product-detail-divider" />

        {/* Technical specs (vêm ANTES da descrição) */}
        <div className="product-section">
          <ProductSpecs product={product} characteristics={characteristics} />
        </div>

        {/* Description */}
        {hasDescription && (
          <div className="product-section">
            <h2 className="product-section-title">Descrição</h2>
            <EditorJsContent content={product.description!} />
          </div>
        )}

        {/* 3D model (model-viewer) */}
        {product.has_3d_model && (
          <div className="product-section" id="produto-3d-viewer" style={{ scrollMarginTop: 90 }}>
            <h2 className="product-section-title">Visualização 3D</h2>
            {product.model_3d_url ? (
              <>
                <ProductModelViewer
                  src={product.model_3d_url}
                  poster={product.model_3d_poster}
                  alt={product.model_3d_alt}
                  variations={product.model_3d_variations}
                  materialLabels={product.model_3d_material_labels}
                  objectType={product.model_3d_object_type}
                  arScale={product.model_3d_ar_scale}
                />
                {/* Instrução de AR — logo abaixo do bloco do model-viewer */}
                <p className="product-3d-ar-note">
                  <svg
                    className="product-3d-ar-note-icon"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>
                    No celular/tablet clique no ícone do canto direito para abrir o
                    AR, com a câmera posicione o objeto para vê-lo em realidade
                    aumentada.
                  </span>
                </p>
              </>
            ) : (
              <div className="product-3d-placeholder">
                <p>Visualização 3D deste produto em breve.</p>
              </div>
            )}
          </div>
        )}
      </article>

      {/* Related */}
      <RelatedProducts products={related} />

      <Footer />
    </main>
  )
}
