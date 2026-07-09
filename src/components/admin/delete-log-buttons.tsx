'use client'

import { useTransition } from 'react'
import { deleteLogAction, deleteAllLogsAction } from '@/server/log.actions'
import { useConfirm } from '@/components/ui/confirm-dialog'

export const DeleteLogButton = ({ logId }: { logId: string }) => {
  const confirm = useConfirm()
  const [pending, startTransition] = useTransition()

  const handleClick = async () => {
    const ok = await confirm({
      title: 'Excluir este log?',
      description: 'Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      destructive: true,
    })
    if (!ok) return
    const fd = new FormData()
    fd.set('logId', logId)
    startTransition(async () => {
      await deleteLogAction(fd)
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

export const DeleteAllLogsButton = () => {
  const confirm = useConfirm()
  const [pending, startTransition] = useTransition()

  const handleClick = async () => {
    const ok = await confirm({
      title: 'Excluir TODOS os logs?',
      description: 'Esta ação não pode ser desfeita.',
      confirmText: 'Excluir todos',
      destructive: true,
    })
    if (!ok) return
    startTransition(async () => {
      await deleteAllLogsAction()
    })
  }

  return (
    <button
      type="button"
      className="action-btn action-btn--delete"
      onClick={handleClick}
      disabled={pending}
    >
      {pending ? 'Excluindo…' : 'Excluir todos'}
    </button>
  )
}
