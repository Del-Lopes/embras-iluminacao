'use client'

import { useEffect, useState } from 'react'

type Step = {
  label: string
  status: 'done' | 'active' | 'pending'
}

const INITIAL_STEPS: Step[] = [
  { label: 'Artigo selecionado', status: 'done' },
  { label: 'Gerando conteúdo com IA...', status: 'active' },
  { label: 'Buscando imagem de capa...', status: 'pending' },
  { label: 'Salvando rascunho...', status: 'pending' },
]

type Props = {
  done: boolean
}

export function AiGenerationLoader({ done }: Props) {
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS)

  useEffect(() => {
    if (done) {
      setSteps([
        { label: 'Artigo selecionado', status: 'done' },
        { label: 'Conteúdo gerado com IA', status: 'done' },
        { label: 'Imagem de capa processada', status: 'done' },
        { label: 'Rascunho salvo', status: 'done' },
      ])
      return
    }

    // Simulate step progression while waiting for the server action
    const t1 = setTimeout(() => {
      setSteps((s) =>
        s.map((step, i) =>
          i === 1
            ? { ...step, label: 'Gerando conteúdo com IA...', status: 'done' }
            : i === 2
              ? { ...step, status: 'active' }
              : step
        )
      )
    }, 4000)

    const t2 = setTimeout(() => {
      setSteps((s) =>
        s.map((step, i) =>
          i === 2
            ? { ...step, label: 'Buscando imagem de capa...', status: 'done' }
            : i === 3
              ? { ...step, status: 'active' }
              : step
        )
      )
    }, 8000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [done])

  return (
    <div className="ai-loader">
      <div className="ai-loader-title">Gerando post com IA</div>
      <p className="ai-loader-subtitle">Aguarde enquanto processamos o artigo...</p>
      <ul className="ai-loader-steps">
        {steps.map((step) => (
          <li key={step.label} className={`ai-loader-step ai-loader-step--${step.status}`}>
            <span className="ai-step-icon">
              {step.status === 'done' && '✓'}
              {step.status === 'active' && (
                <span className="ai-step-spinner" aria-hidden="true" />
              )}
              {step.status === 'pending' && '○'}
            </span>
            <span className="ai-step-label">{step.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
