import type { Metadata } from 'next'
import { SalesAutoTrigger } from '@/components/admin/sales-auto-trigger'

export const metadata: Metadata = {
  title: 'Artigo para Vendas',
  robots: { index: false, follow: false },
}

export default function PublishSalesPage() {
  return <SalesAutoTrigger />
}
