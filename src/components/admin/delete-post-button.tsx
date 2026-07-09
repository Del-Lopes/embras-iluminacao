'use client'

import { useTransition } from 'react'
import { deletePostAction } from '@/server/admin.actions'
import { useConfirm } from '@/components/ui/confirm-dialog'

type Props = {
  postId: string
  postTitle: string
}

export const DeletePostButton = ({ postId, postTitle }: Props) => {
  const confirm = useConfirm()
  const [pending, startTransition] = useTransition()

  const handleClick = async () => {
    const ok = await confirm({
      title: `Excluir "${postTitle}"?`,
      description: 'Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      destructive: true,
    })
    if (!ok) return
    const fd = new FormData()
    fd.set('postId', postId)
    startTransition(async () => {
      await deletePostAction(fd)
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
