import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { ProductCategoriesManager } from '@/components/admin/product-categories-manager'
import type { ProductCategory } from '@/lib/db/schema'

export const metadata: Metadata = {
  title: 'Categorias de Produto',
  robots: { index: false, follow: false },
}

export default async function ProductCategoriesPage() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('product_categories')
    .select('id, name, slug, parent_id, description, sort_order, created_at')
    .order('sort_order')
    .order('name')

  const categories = (data ?? []) as ProductCategory[]

  return (
    <div className="editor-page">
      <div className="editor-header">
        <Link href="/admin/products" className="editor-back">← Produtos</Link>
        <h1 className="dashboard-title">Categorias de Produto</h1>
        <p className="dashboard-subtitle">
          Gerencie as categorias do catálogo — suporta hierarquia (categoria pai → subcategorias)
        </p>
      </div>

      <ProductCategoriesManager categories={categories} />
    </div>
  )
}
