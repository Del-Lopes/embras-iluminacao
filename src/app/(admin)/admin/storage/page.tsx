import type { Metadata } from 'next'
import Link from 'next/link'
import { StorageManager } from '@/components/admin/storage-manager'

export const metadata: Metadata = {
  title: 'Storage',
  robots: { index: false, follow: false },
}

export default async function StoragePage() {
  return (
    <div className="editor-page">
      <div className="editor-header">
        <Link href="/admin/dashboard" className="editor-back">← Dashboard</Link>
        <h1 className="dashboard-title">Storage</h1>
        <p className="dashboard-subtitle">Gerencie os arquivos do bucket cover-images</p>
      </div>

      <StorageManager />
    </div>
  )
}
