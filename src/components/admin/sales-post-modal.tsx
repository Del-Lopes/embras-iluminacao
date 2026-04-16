'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { generateSalesPostAction } from '@/server/ai-publish.actions'

type Step = 'closed' | 'form' | 'generating'
type LoaderStep = { label: string; status: 'done' | 'active' | 'pending' }

const INITIAL_STEPS: LoaderStep[] = [
  { label: 'Analisando produto e cidade...', status: 'done' },
  { label: 'Gerando conteúdo com IA...', status: 'active' },
  { label: 'Salvando rascunho...', status: 'pending' },
]

function SalesGenerationLoader({ done }: { done: boolean }) {
  const [steps, setSteps] = useState<LoaderStep[]>(INITIAL_STEPS)

  useEffect(() => {
    if (done) {
      setSteps([
        { label: 'Produto e cidade analisados', status: 'done' },
        { label: 'Conteúdo gerado', status: 'done' },
        { label: 'Rascunho salvo', status: 'done' },
      ])
      return
    }
    const t = setTimeout(() => {
      setSteps((s) =>
        s.map((step, i) =>
          i === 1
            ? { ...step, status: 'done' }
            : i === 2
              ? { ...step, status: 'active' }
              : step
        )
      )
    }, 3_000)
    return () => clearTimeout(t)
  }, [done])

  return (
    <div className="ai-loader">
      <div className="ai-loader-title">Gerando artigo para vendas</div>
      <p className="ai-loader-subtitle">Aguarde enquanto a IA cria o conteúdo...</p>
      <ul className="ai-loader-steps">
        {steps.map((step) => (
          <li key={step.label} className={`ai-loader-step ai-loader-step--${step.status}`}>
            <span className="ai-step-icon">
              {step.status === 'done' && '✓'}
              {step.status === 'active' && <span className="ai-step-spinner" aria-hidden="true" />}
              {step.status === 'pending' && '○'}
            </span>
            <span className="ai-step-label">{step.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SalesPostModal() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('closed')
  const [product, setProduct] = useState('')
  const [city, setCity] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [, startTransition] = useTransition()

  const open = () => {
    setStep('form')
    setError(null)
    setProduct('')
    setCity('')
  }

  const close = () => setStep('closed')

  const generate = () => {
    if (!product.trim() || !city.trim()) return
    setStep('generating')
    setError(null)
    setDone(false)

    startTransition(async () => {
      const result = await generateSalesPostAction({ product: product.trim(), city: city.trim() })
      if ('error' in result) {
        setError(result.error)
        setStep('form')
      } else {
        setDone(true)
        setTimeout(() => {
          router.push(`/admin/posts/${result.postId}/edit`)
        }, 800)
      }
    })
  }

  if (step === 'closed') {
    return (
      <button type="button" className="action-btn action-btn--sales" onClick={open}>
        ✦ Artigo para Vendas
      </button>
    )
  }

  if (step === 'form') {
    return (
      <>
        <div className="modal-backdrop" onClick={close} />
        <div className="ai-modal" role="dialog" aria-modal="true">
          <div className="ai-modal-header">
            <div>
              <h2 className="ai-modal-title">Artigo para Vendas</h2>
              <p className="ai-modal-subtitle">Informe o produto e a cidade para gerar o artigo.</p>
            </div>
            <button type="button" className="ai-modal-close" onClick={close} aria-label="Fechar">
              ✕
            </button>
          </div>
          {error && <div className="ai-modal-error">{error}</div>}
          <div className="ai-modal-body">
            <div className="sales-form">
              <label className="sales-form-label" htmlFor="sales-product">
                Produto
              </label>
              <input
                id="sales-product"
                type="text"
                className="sales-form-input"
                placeholder="Ex: Poste de iluminação"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                autoFocus
              />

              <label className="sales-form-label" htmlFor="sales-city">
                Cidade
              </label>
              <input
                id="sales-city"
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
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="modal-backdrop" />
      <div className="ai-modal" role="dialog" aria-modal="true">
        <div className="ai-modal-header">
          <div>
            <h2 className="ai-modal-title">Artigo para Vendas</h2>
            <p className="ai-modal-subtitle">Criando artigo com IA...</p>
          </div>
        </div>
        <div className="ai-modal-body">
          <SalesGenerationLoader done={done} />
        </div>
      </div>
    </>
  )
}
