import type { Product } from '@/lib/db/schema'

type Props = {
  product: Pick<
    Product,
    | 'environment'
    | 'height_cm'
    | 'width_cm'
    | 'depth_cm'
    | 'weight_kg'
    | 'primary_material'
    | 'materials'
    | 'socket_type'
  >
}

const ENV_LABEL: Record<string, string> = {
  interno: 'Área interna',
  externo: 'Área externa',
}

export function ProductSpecs({ product }: Props) {
  const rows: { label: string; value: string }[] = []

  rows.push({ label: 'Área de uso', value: ENV_LABEL[product.environment] ?? product.environment })
  if (product.height_cm != null) rows.push({ label: 'Altura', value: `${product.height_cm} cm` })
  if (product.width_cm != null) rows.push({ label: 'Largura', value: `${product.width_cm} cm` })
  if (product.depth_cm != null) rows.push({ label: 'Profundidade', value: `${product.depth_cm} cm` })
  if (product.weight_kg != null) rows.push({ label: 'Peso', value: `${product.weight_kg} kg` })
  if (product.primary_material) rows.push({ label: 'Material principal', value: product.primary_material })
  if (product.materials?.length) rows.push({ label: 'Materiais', value: product.materials.join(', ') })
  if (product.socket_type) rows.push({ label: 'Tipo de soquete', value: product.socket_type })

  return (
    <section className="product-specs">
      <h2 className="product-section-title">Especificações técnicas</h2>
      <dl className="product-specs-table">
        {rows.map((row) => (
          <div key={row.label} className="product-spec-row">
            <dt className="product-spec-label">{row.label}</dt>
            <dd className="product-spec-value">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
