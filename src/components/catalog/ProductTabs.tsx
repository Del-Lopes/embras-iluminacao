'use client'

import { useState } from 'react'
import { LeadCaptureModal, type LeadFile } from '@/components/catalog/LeadCaptureModal'
import type { LeadFileType } from '@/lib/db/schema'

export type ProductTabFile = { type: LeadFileType; label: string; url: string; filename: string | null }
export type SpecRow = { label: string; value: string }

type Props = {
  productId: string
  productName: string
  techRows: SpecRow[]
  features: string[]
  applications: string | null
  files: ProductTabFile[]
}

type TabKey = 'files' | 'tech' | 'features' | 'applications'

const TAB_LABEL: Record<TabKey, string> = {
  files: 'Arquivos para download',
  tech: 'Informações Técnicas',
  features: 'Características',
  applications: 'Aplicações',
}

// Ícone genérico de documento para os arquivos de download.
function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

export function ProductTabs({ productId, productName, techRows, features, applications, files }: Props) {
  const [selectedFile, setSelectedFile] = useState<LeadFile | null>(null)

  // Abas exibidas só quando têm conteúdo (ordem igual à referência).
  const tabs: TabKey[] = []
  if (files.length) tabs.push('files')
  if (techRows.length) tabs.push('tech')
  if (features.length) tabs.push('features')
  if (applications && applications.trim()) tabs.push('applications')

  const [active, setActive] = useState<TabKey>(tabs[0] ?? 'tech')

  if (tabs.length === 0) return null

  const current = tabs.includes(active) ? active : tabs[0]

  return (
    <section className="product-tabs">
      <div className="product-tabs-nav" role="tablist" aria-label="Detalhes do produto">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={current === tab}
            className={`product-tab-btn${current === tab ? ' product-tab-btn--active' : ''}`}
            onClick={() => setActive(tab)}
          >
            {TAB_LABEL[tab]}
          </button>
        ))}
      </div>

      <div className="product-tabs-panel">
        {current === 'files' && (
          <ul className="product-files-list">
            {files.map((f) => (
              <li key={f.type}>
                <button
                  type="button"
                  className="product-file-item"
                  onClick={() => setSelectedFile({ type: f.type, label: f.label, url: f.url })}
                >
                  <FileIcon />
                  <span>{f.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {current === 'tech' && (
          <dl className="product-specs-table">
            {techRows.map((row, i) => (
              <div key={`${row.label}-${i}`} className="product-spec-row">
                <dt className="product-spec-label">{row.label}</dt>
                <dd className="product-spec-value">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {current === 'features' && (
          <ul className="product-features-list">
            {features.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        )}

        {current === 'applications' && (
          <div className="product-applications">
            {(applications ?? '').split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}
      </div>

      <LeadCaptureModal
        productId={productId}
        productName={productName}
        file={selectedFile}
        onClose={() => setSelectedFile(null)}
      />
    </section>
  )
}
