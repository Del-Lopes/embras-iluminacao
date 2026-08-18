import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { ProductEditor } from '@/components/admin/product-editor'
import { listProductSpecLabels } from '@/server/product-spec-label.actions'
import { listProductSpecValues } from '@/server/product-spec-value.actions'
import { flattenCategoryTree } from '@/lib/utils/category-tree'
import type { ProductCategory, ProductCharacteristic } from '@/lib/db/schema'

export const metadata: Metadata = {
  title: 'Novo Produto',
  robots: { index: false, follow: false },
}

export default async function NewProductPage() {
  const supabase = await createSupabaseServerClient()
  const [{ data }, { data: charData }] = await Promise.all([
    supabase
      .from('product_categories')
      .select('id, name, slug, parent_id, description, sort_order, created_at')
      .order('sort_order')
      .order('name'),
    supabase
      .from('product_characteristics')
      .select('id, type, name, slug, sort_order, created_at')
      .order('type')
      .order('sort_order')
      .order('name'),
  ])

  const categories = flattenCategoryTree((data ?? []) as ProductCategory[])
  const characteristics = (charData ?? []) as ProductCharacteristic[]
  const [specLabels, specValues] = await Promise.all([
    listProductSpecLabels(),
    listProductSpecValues(),
  ])

  return (
    <div className="editor-page">
      <div className="editor-header">
        <Link href="/admin/products" className="editor-back">← Produtos</Link>
        <h1 className="dashboard-title">Novo Produto</h1>
        <p className="dashboard-subtitle">Cadastre um item do catálogo de amostra</p>
      </div>

      <ProductEditor
        categories={categories}
        characteristics={characteristics}
        specLabels={specLabels}
        specValues={specValues}
      />
    </div>
  )
}
