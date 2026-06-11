'use client'

import { deleteProductAction } from '@/server/product.actions'

type Props = {
  productId: string
  productName: string
}

export const DeleteProductButton = ({ productId, productName }: Props) => (
  <form action={deleteProductAction}>
    <input type="hidden" name="productId" value={productId} />
    <button
      type="submit"
      className="action-btn action-btn--delete"
      onClick={(e) => {
        if (!confirm(`Excluir "${productName}"?\nEsta ação não pode ser desfeita.`)) {
          e.preventDefault()
        }
      }}
    >
      Excluir
    </button>
  </form>
)
