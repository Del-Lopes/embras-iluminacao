'use client'

import { useTransition } from 'react'
import { deleteProductAction } from '@/server/product.actions'
import { useConfirm } from '@/components/ui/confirm-dialog'

type Props = {
  productId: string
  productName: string
}

export const DeleteProductButton = ({ productId, productName }: Props) => {
  const confirm = useConfirm()
  const [pending, startTransition] = useTransition()

  const handleClick = async () => {
    const ok = await confirm({
      title: `Excluir "${productName}"?`,
      description: 'Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      destructive: true,
    })
    if (!ok) return
    const fd = new FormData()
    fd.set('productId', productId)
    startTransition(async () => {
      await deleteProductAction(fd)
    })
  }

  return (
    <button
      type="button"
      className="action-btn action-btn--delete"
      onClick={handleClick}
      disabled={pending}
    >
      {pending ? 'Excluindo…' : 'Excluir'}
    </button>
  )
}
