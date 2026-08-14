import type { Metadata } from 'next'
import { getSiteSettings } from '@/server/site-settings.actions'
import { CatalogUploader } from '@/components/admin/catalog-uploader'

export const metadata: Metadata = {
  title: 'Catálogo (PDF)',
  robots: { index: false, follow: false },
}

export default async function CatalogSettingsPage() {
  const settings = await getSiteSettings()

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Catálogo (PDF)</h1>
          <p className="dashboard-subtitle">
            Envie o PDF do catálogo. Ele fica disponível para download na página de Produtos do site.
          </p>
        </div>
      </header>

      <div className="editor-section" style={{ maxWidth: 640 }}>
        <CatalogUploader
          initialUrl={settings?.catalog_url ?? null}
          initialFilename={settings?.catalog_filename ?? null}
        />
      </div>
    </div>
  )
}
