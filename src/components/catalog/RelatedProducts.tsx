import { ProductCard } from '@/components/catalog/ProductCard'
import type { ProductCardData } from '@/components/catalog/ProductCard'

type Props = {
  products: ProductCardData[]
}

// Horizontal carousel of related products (same category / area of use).
export function RelatedProducts({ products }: Props) {
  if (products.length === 0) return null

  return (
    <section className="product-related">
      <div className="product-related-inner">
        <h2 className="product-section-title">Produtos relacionados</h2>
        <div className="product-related-carousel">
          {products.map((p) => (
            <div key={p.id} className="product-related-item">
              <ProductCard {...p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
