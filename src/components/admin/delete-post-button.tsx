'use client'

import { deletePostAction } from '@/server/admin.actions'

type Props = {
  postId: string
  postTitle: string
}

export const DeletePostButton = ({ postId, postTitle }: Props) => (
  <form action={deletePostAction}>
    <input type="hidden" name="postId" value={postId} />
    <button
      type="submit"
      className="action-btn action-btn--delete"
      onClick={(e) => {
        if (!confirm(`Excluir "${postTitle}"?\nEsta ação não pode ser desfeita.`)) {
          e.preventDefault()
        }
      }}
    >
      Excluir
    </button>
  </form>
)
