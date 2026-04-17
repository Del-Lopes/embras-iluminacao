'use client'

import { deleteLogAction, deleteAllLogsAction } from '@/server/log.actions'

export const DeleteLogButton = ({ logId }: { logId: string }) => (
  <form action={deleteLogAction}>
    <input type="hidden" name="logId" value={logId} />
    <button
      type="submit"
      className="action-btn action-btn--delete"
      onClick={(e) => {
        if (!confirm('Excluir este log?\nEsta ação não pode ser desfeita.')) {
          e.preventDefault()
        }
      }}
    >
      Excluir
    </button>
  </form>
)

export const DeleteAllLogsButton = () => (
  <form action={deleteAllLogsAction}>
    <button
      type="submit"
      className="action-btn action-btn--delete"
      onClick={(e) => {
        if (!confirm('Excluir TODOS os logs?\nEsta ação não pode ser desfeita.')) {
          e.preventDefault()
        }
      }}
    >
      Excluir todos
    </button>
  </form>
)
