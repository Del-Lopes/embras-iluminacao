import type { Product, ProductCharacteristic } from '@/lib/db/schema'

type Props = {
  product: Pick<
    Product,
    'environment' | 'height_cm' | 'width_cm' | 'depth_cm' | 'weight_kg'
  >
  characteristics?: Pick<ProductCharacteristic, 'type' | 'name'>[]
}

const ENV_LABEL: Record<string, string> = {
  interno: 'Área interna',
  externo: 'Área externa',
}

export function ProductSpecs({ product, characteristics = [] }: Props) {
  const rows: { label: string; value: string }[] = []

  const namesOf = (type: ProductCharacteristic['type']) =>
    characteristics
      .filter((c) => c.type === type)
      .map((c) => c.name)
      .join(', ')

  rows.push({ label: 'Área de uso', value: ENV_LABEL[product.environment] ?? product.environment })
  if (product.height_cm != null) rows.push({ label: 'Altura', value: `${product.height_cm} cm` })
  if (product.width_cm != null) rows.push({ label: 'Largura', value: `${product.width_cm} cm` })
  if (product.depth_cm != null) rows.push({ label: 'Profundidade', value: `${product.depth_cm} cm` })
  if (product.weight_kg != null) rows.push({ label: 'Peso', value: `${product.weight_kg} kg` })

  const principal = namesOf('material_principal')
  const secundario = namesOf('material_secundario')
  const soquete = namesOf('soquete')
  if (principal) rows.push({ label: 'Material principal', value: principal })
  if (secundario) rows.push({ label: 'Materiais secundários', value: secundario })
  if (soquete) rows.push({ label: 'Tipo de soquete', value: soquete })

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
