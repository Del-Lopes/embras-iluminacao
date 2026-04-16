'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { generateSalesPostAction } from '@/server/ai-publish.actions'

type Step = 'form' | 'generating'
type LoaderStep = { label: string; status: 'done' | 'active' | 'pending' }

const INITIAL_STEPS: LoaderStep[] = [
  { label: 'Analisando produto e cidade...', status: 'done' },
  { label: 'Gerando conteúdo com IA...', status: 'active' },
  { label: 'Salvando rascunho...', status: 'pending' },
]

export function SalesAutoTrigger() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [product, setProduct] = useState('')
  const [city, setCity] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loaderSteps, setLoaderSteps] = useState<LoaderStep[]>(INITIAL_STEPS)
  const [, startTransition] = useTransition()

  const generate = () => {
    if (!product.trim() || !city.trim()) return
    setStep('generating')
    setError(null)
    setDone(false)
    setLoaderSteps(INITIAL_STEPS)

    const t = setTimeout(() => {
      setLoaderSteps((s) =>
        s.map((ls, i) =>
          i === 1
            ? { ...ls, status: 'done' }
            : i === 2
              ? { ...ls, status: 'active' }
              : ls
        )
      )
    }, 3_000)

    startTransition(async () => {
      const result = await generateSalesPostAction({ product: product.trim(), city: city.trim() })
      clearTimeout(t)

      if ('error' in result) {
        setError(result.error)
        setStep('form')
        return
      }

      setDone(true)
      setLoaderSteps([
        { label: 'Produto e cidade analisados', status: 'done' },
        { label: 'Conteúdo gerado', status: 'done' },
        { label: 'Rascunho salvo', status: 'done' },
      ])
      setTimeout(() => {
        router.push(`/admin/posts/${result.postId}/edit`)
      }, 800)
    })
  }

  return (
    <div className="editor-page">
      <div className="editor-header">
        <h1 className="dashboard-title">Artigo para Vendas</h1>
        <p className="dashboard-subtitle">
          {step === 'form' ? 'Informe o produto e a cidade.' : 'Criando artigo com IA...'}
        </p>
      </div>

      {step === 'form' ? (
        <div className="sales-form" style={{ marginTop: 32 }}>
          {error && (
            <div className="ai-modal-error" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}

          <label className="sales-form-label" htmlFor="sales-product-page">
            Produto
          </label>
          <input
            id="sales-product-page"
            type="text"
            className="sales-form-input"
            placeholder="Ex: Poste de iluminação"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            autoFocus
          />

          <label className="sales-form-label" htmlFor="sales-city-page">
            Cidade
          </label>
          <input
            id="sales-city-page"
            type="text"
            className="sales-form-input"
            placeholder="Ex: Tatuí"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generate()}
          />

          <button
            type="button"
            className="sales-form-submit"
            onClick={generate}
            disabled={!product.trim() || !city.trim()}
          >
            Gerar Artigo
          </button>
        </div>
      ) : (
        <div className="ai-loader" style={{ marginTop: 32 }}>
          <div className="ai-loader-title">Gerando artigo para vendas</div>
          <p className="ai-loader-subtitle">Aguarde enquanto a IA cria o conteúdo...</p>
          <ul className="ai-loader-steps">
            {loaderSteps.map((ls) => (
              <li key={ls.label} className={`ai-loader-step ai-loader-step--${ls.status}`}>
                <span className="ai-step-icon">
                  {ls.status === 'done' && '✓'}
                  {ls.status === 'active' && <span className="ai-step-spinner" aria-hidden="true" />}
                  {ls.status === 'pending' && '○'}
                </span>
                <span className="ai-step-label">{ls.label}</span>
              </li>
            ))}
          </ul>
          {done && (
            <p className="ai-loader-subtitle" style={{ marginTop: 12 }}>
              Redirecionando para o editor...
            </p>
          )}
        </div>
      )}
    </div>
  )
}
