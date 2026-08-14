import type { Metadata } from 'next'
import { getLeads } from '@/server/lead.actions'
import { LeadTableToolbar } from '@/components/admin/lead-table-toolbar'
import { LeadDataTable } from '@/components/admin/lead-data-table'
import type { LeadFileType } from '@/lib/db/schema'

export const metadata: Metadata = {
  title: 'Leads',
  robots: { index: false, follow: false },
}

type SearchParams = Promise<{ page?: string; file_type?: string; q?: string }>

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const file_type = (params.file_type ?? 'all') as LeadFileType | 'all'
  const q = params.q ?? ''

  const result = await getLeads({ page, file_type, q })

  const rawParams: Record<string, string> = {}
  if (params.file_type) rawParams.file_type = params.file_type
  if (params.q) rawParams.q = params.q

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Leads</h1>
          <p className="dashboard-subtitle">Contatos capturados nos downloads de arquivos dos produtos</p>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total de Leads</span>
          <span className="stat-value">{result.total}</span>
        </div>
      </div>

      <LeadTableToolbar currentFileType={file_type} currentQ={q} />

      <LeadDataTable
        leads={result.leads}
        total={result.total}
        page={result.page}
        pageCount={result.pageCount}
        searchParams={rawParams}
      />
    </div>
  )
}
