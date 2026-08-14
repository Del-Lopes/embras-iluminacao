'use client'

import { useState, useTransition } from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AdminPagination } from '@/components/admin/admin-pagination'
import { deleteLeadAction, bulkDeleteLeadsAction } from '@/server/lead.actions'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { LEAD_FILE_LABEL } from '@/lib/leads'
import type { Lead } from '@/lib/db/schema'

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))

type Props = {
  leads: Lead[]
  total: number
  page: number
  pageCount: number
  searchParams: Record<string, string>
}

export const LeadDataTable = ({ leads, total, page, pageCount, searchParams }: Props) => {
  const confirm = useConfirm()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  if (leads.length === 0) {
    return (
      <div className="data-table-empty">
        <p>Nenhum lead capturado ainda.</p>
      </div>
    )
  }

  const allIds = leads.map((l) => l.id)
  const allSelected = allIds.every((id) => selected.has(id))
  const someSelected = selected.size > 0

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allIds))
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const handleDeleteOne = async (lead: Lead) => {
    const ok = await confirm({
      title: `Excluir o lead de "${lead.name}"?`,
      description: 'Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      destructive: true,
    })
    if (!ok) return
    const fd = new FormData()
    fd.set('leadId', lead.id)
    startTransition(async () => {
      await deleteLeadAction(fd)
    })
  }

  const handleBulkDelete = async () => {
    const ok = await confirm({
      title: `Excluir ${selected.size} lead${selected.size !== 1 ? 's' : ''}?`,
      description: 'Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      destructive: true,
    })
    if (!ok) return
    startTransition(async () => {
      await bulkDeleteLeadsAction(Array.from(selected))
      setSelected(new Set())
    })
  }

  return (
    <div className="data-table-container">
      <div className="bulk-action-bar">
        <p className="data-table-count" style={{ marginBottom: 0 }}>
          {total} lead{total !== 1 ? 's' : ''} capturado{total !== 1 ? 's' : ''}
        </p>
        {someSelected && (
          <button className="action-btn action-btn--delete" onClick={handleBulkDelete} disabled={isPending}>
            {isPending ? 'Excluindo…' : `Excluir selecionados (${selected.size})`}
          </button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style={{ width: 40 }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="bulk-checkbox"
                aria-label="Selecionar todos"
              />
            </TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Arquivo</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id} data-selected={selected.has(lead.id) ? 'true' : undefined}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selected.has(lead.id)}
                  onChange={() => toggleOne(lead.id)}
                  className="bulk-checkbox"
                  aria-label={`Selecionar lead de ${lead.name}`}
                />
              </TableCell>
              <TableCell>{formatDateTime(lead.created_at)}</TableCell>
              <TableCell>{lead.name}</TableCell>
              <TableCell>
                <a href={`mailto:${lead.email}`} className="post-title-link">{lead.email}</a>
              </TableCell>
              <TableCell>{lead.phone || '—'}</TableCell>
              <TableCell>{lead.product_name || '—'}</TableCell>
              <TableCell>
                <Badge variant="draft">{LEAD_FILE_LABEL[lead.file_type] ?? lead.file_type}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <button
                  type="button"
                  className="action-btn action-btn--delete"
                  onClick={() => handleDeleteOne(lead)}
                  disabled={isPending}
                >
                  Excluir
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AdminPagination page={page} pageCount={pageCount} searchParams={searchParams} />
    </div>
  )
}
