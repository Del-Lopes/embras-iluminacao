import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { ProductEditor } from '@/components/admin/product-editor'
import { flattenCategoryTree } from '@/lib/utils/category-tree'
import type { GalleryImage } from '@/components/admin/product-image-gallery'
import type { Product, ProductCategory } from '@/lib/db/schema'

export const metadata: Metadata = {
  title: 'Editar Produto',
  robots: { index: false, follow: false },
}

type Props = { params: Promise<{ id: string }> }

export default async function EditProductPage({ params }: Props) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const [{ data: product }, { data: catData }, { data: mapData }, { data: imgData }] =
    await Promise.all([
      supabase.from('products').select('*').eq('id', id).single(),
      supabase
        .from('product_categories')
        .select('id, name, slug, parent_id, description, sort_order, created_at')
        .order('sort_order')
        .order('name'),
      supabase.from('product_category_map').select('category_id').eq('product_id', id),
      supabase
        .from('product_images')
        .select('url, alt, sort_order')
        .eq('product_id', id)
        .order('sort_order'),
    ])

  if (!product) notFound()

  const categories = flattenCategoryTree((catData ?? []) as ProductCategory[])
  const productCategoryIds = (mapData ?? []).map((m) => m.category_id)
  const productImages: GalleryImage[] = (imgData ?? []).map((i) => ({
    url: i.url,
    alt: i.alt ?? '',
  }))

  return (
    <div className="editor-page">
      <div className="editor-header">
        <Link href="/admin/products" className="editor-back">← Produtos</Link>
        <h1 className="dashboard-title">Editar Produto</h1>
        <p className="dashboard-subtitle">{product.name}</p>
      </div>

      <ProductEditor
        categories={categories}
        product={product as Product}
        productCategoryIds={productCategoryIds}
        productImages={productImages}
      />
    </div>
  )
}
