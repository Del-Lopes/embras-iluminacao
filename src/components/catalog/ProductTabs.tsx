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
  dimensionRows: SpecRow[]
  applications: string | null
  files: ProductTabFile[]
}

type TabKey = 'files' | 'tech' | 'applications'

const TAB_LABEL: Record<TabKey, string> = {
  files: 'Arquivos para download',
  tech: 'Informações Técnicas',
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

export function ProductTabs({ productId, productName, techRows, dimensionRows, applications, files }: Props) {
  const [selectedFile, setSelectedFile] = useState<LeadFile | null>(null)

  // Abas exibidas só quando têm conteúdo. Arquivos por último: é a ação de
  // saída da página (baixar), enquanto as outras duas descrevem o produto.
  // Sendo a primeira, ela também virava a aba aberta por padrão, empurrando o
  // visitante para o download antes de ele ler as especificações.
  const tabs: TabKey[] = []
  if (techRows.length || dimensionRows.length) tabs.push('tech')
  if (applications && applications.trim()) tabs.push('applications')
  if (files.length) tabs.push('files')

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
          <div className="product-specs">
            {techRows.length > 0 && (
              <SpecTable title="Especificações" rows={techRows} />
            )}
            {dimensionRows.length > 0 && (
              <SpecTable title="Dimensões" rows={dimensionRows} />
            )}
          </div>
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

// Tabela de especificações no formato lado a lado: uma linha de rótulos e,
// abaixo, a linha de valores, com divisória vertical entre as colunas.
//
// O componente informa apenas QUANTAS colunas existem (--spec-count). Quantas
// cabem antes de rolar é decisão do CSS, porque o limite muda por breakpoint
// (8 no desktop, 6 no tablet) e JS renderizado no servidor não enxerga a
// largura da tela.
//
// No celular o formato vira lista empilhada, porque lado a lado numa tela
// estreita seria rolagem horizontal já na segunda coluna. A troca também é
// feita no CSS, sem duplicar a marcação.
function SpecTable({ title, rows }: { title: string; rows: SpecRow[] }) {
  return (
    <section className="spec-table">
      <h3 className="spec-table-title">{title}</h3>
      <div className="spec-table-scroll">
        <div
          className="spec-table-grid"
          style={{ ['--spec-count' as string]: rows.length }}
        >
          {rows.map((row, i) => (
            <div key={`${row.label}-${i}`} className="spec-cell">
              <span className="spec-cell-label">{row.label}</span>
              <span className="spec-cell-value">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
