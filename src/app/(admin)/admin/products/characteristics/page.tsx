import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { ProductCharacteristicsManager } from '@/components/admin/product-characteristics-manager'
import type { ProductCharacteristic } from '@/lib/db/schema'

export const metadata: Metadata = {
  title: 'Filtros de Produto',
  robots: { index: false, follow: false },
}

export default async function ProductCharacteristicsPage() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('product_characteristics')
    .select('id, type, name, slug, sort_order, created_at')
    .order('type')
    .order('sort_order')
    .order('name')

  const characteristics = (data ?? []) as ProductCharacteristic[]

  return (
    <div className="editor-page">
      <div className="editor-header">
        <Link href="/admin/products" className="editor-back">← Produtos</Link>
        <h1 className="dashboard-title">Filtros</h1>
        <p className="dashboard-subtitle">
          Cadastre os valores usados como filtro no catálogo
        </p>
      </div>

      <ProductCharacteristicsManager characteristics={characteristics} />
    </div>
  )
}
