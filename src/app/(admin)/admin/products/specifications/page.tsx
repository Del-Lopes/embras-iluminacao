import type { Metadata } from 'next'
import Link from 'next/link'
import { listProductSpecLabels } from '@/server/product-spec-label.actions'
import { listProductSpecValues } from '@/server/product-spec-value.actions'
import { ProductSpecLabelsManager } from '@/components/admin/product-spec-labels-manager'
import { ProductSpecValuesManager } from '@/components/admin/product-spec-values-manager'

export const metadata: Metadata = {
  title: 'Informações Técnicas de Produto',
  robots: { index: false, follow: false },
}

export default async function ProductSpecPresetsPage() {
  const [labels, values] = await Promise.all([
    listProductSpecLabels(),
    listProductSpecValues(),
  ])

  return (
    <div className="editor-page">
      <div className="editor-header">
        <Link href="/admin/products" className="editor-back">← Produtos</Link>
        <h1 className="dashboard-title">Informações Técnicas</h1>
        <p className="dashboard-subtitle">
          Rótulos e valores sugeridos ao preencher a ficha técnica dos produtos
        </p>
      </div>

      {/* Mesmo grid do cadastro de filtros, no modificador de duas colunas:
          são só dois blocos, e cada um ocupa metade da largura. Empilham nas
          telas estreitas. */}
      <div className="characteristics-grid characteristics-grid--pair">
        <ProductSpecLabelsManager labels={labels} />
        <ProductSpecValuesManager values={values} labels={labels} />
      </div>
    </div>
  )
}
