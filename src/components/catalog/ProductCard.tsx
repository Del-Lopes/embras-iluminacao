import Link from 'next/link'

export type ProductCardData = {
  id: string
  name: string
  slug: string
  sku: string
  cover_image: string | null
  environment: 'interno' | 'externo'
  primary_material: string | null
}

const ENV_LABEL: Record<string, string> = {
  interno: 'Área interna',
  externo: 'Área externa',
}

export function ProductCard({
  name,
  slug,
  sku,
  cover_image,
  environment,
  primary_material,
}: ProductCardData) {
  const href = `/catalogo/${slug}`

  return (
    <article className="catalog-card">
      <Link href={href} className="catalog-card-img-link" tabIndex={-1} aria-hidden="true">
        <div className="catalog-card-img-wrap">
          {cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover_image} alt={name} className="catalog-card-img" />
          ) : (
            <div className="catalog-card-img-placeholder" />
          )}
        </div>
      </Link>

      <div className="catalog-card-body">
        <span className="catalog-card-tag">{ENV_LABEL[environment] ?? environment}</span>

        <Link href={href}>
          <h2 className="catalog-card-title">{name}</h2>
        </Link>

        <div className="catalog-card-meta">
          <span className="catalog-card-sku">SKU: {sku}</span>
          {primary_material && <span className="catalog-card-material">{primary_material}</span>}
        </div>

        <Link href={href} className="catalog-card-cta">
          Ver produto
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </Link>
      </div>
    </article>
  )
}
