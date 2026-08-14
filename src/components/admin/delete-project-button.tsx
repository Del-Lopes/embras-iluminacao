'use client'

import { useTransition } from 'react'
import { deleteProjectAction } from '@/server/project.actions'
import { useConfirm } from '@/components/ui/confirm-dialog'

type Props = {
  projectId: string
  projectName: string
}

export const DeleteProjectButton = ({ projectId, projectName }: Props) => {
  const confirm = useConfirm()
  const [pending, startTransition] = useTransition()

  const handleClick = async () => {
    const ok = await confirm({
      title: `Excluir "${projectName}"?`,
      description: 'Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      destructive: true,
    })
    if (!ok) return
    const fd = new FormData()
    fd.set('projectId', projectId)
    startTransition(async () => {
      await deleteProjectAction(fd)
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
