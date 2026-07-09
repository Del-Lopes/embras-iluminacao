import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { ProductEditor } from '@/components/admin/product-editor'
import { flattenCategoryTree } from '@/lib/utils/category-tree'
import type { GalleryImage } from '@/components/admin/product-image-gallery'
import type { Product, ProductCategory, ProductCharacteristic } from '@/lib/db/schema'

export const metadata: Metadata = {
  title: 'Editar Produto',
  robots: { index: false, follow: false },
}

type Props = { params: Promise<{ id: string }> }

export default async function EditProductPage({ params }: Props) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const [
    { data: product },
    { data: catData },
    { data: mapData },
    { data: imgData },
    { data: charData },
    { data: charMapData },
  ] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).single(),
    supabase
      .from('product_categories')
      .select('id, name, slug, parent_id, description, sort_order, created_at')
      .order('sort_order')
      .order('name'),
    supabase.from('product_category_map').select('category_id, is_primary').eq('product_id', id),
    supabase
      .from('product_images')
      .select('url, alt, sort_order')
      .eq('product_id', id)
      .order('sort_order'),
    supabase
      .from('product_characteristics')
      .select('id, type, name, slug, sort_order, created_at')
      .order('type')
      .order('sort_order')
      .order('name'),
    supabase.from('product_characteristic_map').select('characteristic_id, is_primary').eq('product_id', id),
  ])

  if (!product) notFound()

  const categories = flattenCategoryTree((catData ?? []) as ProductCategory[])
  const characteristics = (charData ?? []) as ProductCharacteristic[]

  // Categorias: separa principal x secundárias.
  const catMap = (mapData ?? []) as { category_id: string; is_primary: boolean }[]
  const productPrimaryCategoryId = catMap.find((m) => m.is_primary)?.category_id ?? null
  const productSecondaryCategoryIds = catMap.filter((m) => !m.is_primary).map((m) => m.category_id)

  // Características: separa material principal x secundários x soquetes (pelo tipo).
  const typeById = new Map(characteristics.map((c) => [c.id, c.type]))
  const charMap = (charMapData ?? []) as { characteristic_id: string; is_primary: boolean }[]
  const materialMap = charMap.filter((m) => typeById.get(m.characteristic_id) === 'material')
  const productPrimaryMaterialId = materialMap.find((m) => m.is_primary)?.characteristic_id ?? null
  const productSecondaryMaterialIds = materialMap
    .filter((m) => !m.is_primary)
    .map((m) => m.characteristic_id)
  const productSoqueteIds = charMap
    .filter((m) => typeById.get(m.characteristic_id) === 'soquete')
    .map((m) => m.characteristic_id)

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
        characteristics={characteristics}
        product={product as Product}
        productPrimaryCategoryId={productPrimaryCategoryId}
        productSecondaryCategoryIds={productSecondaryCategoryIds}
        productPrimaryMaterialId={productPrimaryMaterialId}
        productSecondaryMaterialIds={productSecondaryMaterialIds}
        productSoqueteIds={productSoqueteIds}
        productImages={productImages}
      />
    </div>
  )
}
