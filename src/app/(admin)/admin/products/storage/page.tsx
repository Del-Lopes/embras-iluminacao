import type { Metadata } from 'next'
import Link from 'next/link'
import { R2StorageManager } from '@/components/admin/r2-storage-manager'

export const metadata: Metadata = {
  title: 'Storage',
  robots: { index: false, follow: false },
}

export default async function ProductsStoragePage() {
  return (
    <div className="editor-page">
      <div className="editor-header">
        <Link href="/admin/products" className="editor-back">← Dashboard</Link>
        <h1 className="dashboard-title">Storage</h1>
        <p className="dashboard-subtitle">Gerencie os arquivos do bucket R2 (imagens e modelos 3D)</p>
      </div>

      <R2StorageManager />
    </div>
  )
}
