'use client'

import { useEffect, useState } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
}

interface FormData {
  tipo: string
  volume: string
  nome: string
  empresa: string
  email: string
  telefone: string
}

const TIPOS = [
  { v: 'aco', k: 'Aço Galvanizado', s: 'Uso industrial · público' },
  { v: 'aluminio', k: 'Alumínio', s: 'Decorativo · urbano' },
  { v: 'ambos', k: 'Ambos', s: 'Projeto misto' },
  { v: 'nao-sei', k: 'Ainda não sei', s: 'Preciso de orientação técnica' },
]

const VOLUMES = [
  { v: '1-20', k: 'Até 20', s: 'Projeto pontual' },
  { v: '20-100', k: '20 a 100', s: 'Obra média' },
  { v: '100-500', k: '100 a 500', s: 'Grande obra' },
  { v: '500+', k: '500+', s: 'Licitação · larga escala' },
]

const INITIAL_DATA: FormData = {
  tipo: '',
  volume: '',
  nome: '',
  empresa: '',
  email: '',
  telefone: '',
}

export default function Modal({ open, onClose }: ModalProps) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<FormData>(INITIAL_DATA)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!open) {
      setStep(0)
      setSent(false)
      setData(INITIAL_DATA)
    }
  }, [open])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const submit = () => setSent(true)

  const firstName = data.nome.split(' ')[0] || 'pessoal'

  return (
    <div className="lp-modal-backdrop" onClick={onClose}>
      <div className="lp-modal" onClick={(e) => e.stopPropagation()}>
        <button className="lp-modal-close" onClick={onClose} aria-label="Fechar">
          ✕
        </button>

        {sent ? (
          <div className="lp-modal-success">
            <div className="lp-modal-success-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <div className="lp-modal-kicker">Solicitação recebida</div>
            <h3>Obrigado, {firstName}.</h3>
            <p className="lp-modal-sub">
              Um especialista entrará em contato em até 2 horas úteis. Sua proposta será
              personalizada conforme as informações enviadas.
            </p>
            <button className="btn btn-accent btn-lg" onClick={onClose}>
              Voltar ao site
            </button>
          </div>
        ) : (
          <>
            <div className="lp-modal-steps">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`lp-modal-step-dot${i <= step ? ' is-on' : ''}`} />
              ))}
            </div>

            {/* Step 0 — Tipo */}
            {step === 0 && (
              <>
                <div className="lp-modal-kicker">Etapa 01 / 03 · Tipo</div>
                <h3>
                  Qual linha
                  <br />
                  você precisa?
                </h3>
                <p className="lp-modal-sub">
                  Escolha a que melhor descreve seu projeto. Se tiver dúvida, marque "ainda não sei".
                </p>
                <div className="lp-modal-opts">
                  {TIPOS.map((t) => (
                    <button
                      key={t.v}
                      className={`lp-modal-opt${data.tipo === t.v ? ' is-on' : ''}`}
                      onClick={() => setData({ ...data, tipo: t.v })}
                    >
                      {t.k}
                      <span className="sub">{t.s}</span>
                    </button>
                  ))}
                </div>
                <div className="lp-modal-actions">
                  <button className="btn btn-ghost" onClick={onClose}>
                    Cancelar
                  </button>
                  <button
                    className="btn btn-accent"
                    disabled={!data.tipo}
                    onClick={() => setStep(1)}
                    style={{ opacity: data.tipo ? 1 : 0.4 }}
                  >
                    Próximo →
                  </button>
                </div>
              </>
            )}

            {/* Step 1 — Volume */}
            {step === 1 && (
              <>
                <div className="lp-modal-kicker">Etapa 02 / 03 · Volume</div>
                <h3>
                  Volume estimado
                  <br />
                  do projeto.
                </h3>
                <p className="lp-modal-sub">
                  Mesmo uma estimativa aproximada nos ajuda a propor a melhor condição.
                </p>
                <div className="lp-modal-opts">
                  {VOLUMES.map((v) => (
                    <button
                      key={v.v}
                      className={`lp-modal-opt${data.volume === v.v ? ' is-on' : ''}`}
                      onClick={() => setData({ ...data, volume: v.v })}
                    >
                      {v.k} postes
                      <span className="sub">{v.s}</span>
                    </button>
                  ))}
                </div>
                <div className="lp-modal-actions">
                  <button className="btn btn-ghost" onClick={() => setStep(0)}>
                    ← Voltar
                  </button>
                  <button
                    className="btn btn-accent"
                    disabled={!data.volume}
                    onClick={() => setStep(2)}
                    style={{ opacity: data.volume ? 1 : 0.4 }}
                  >
                    Próximo →
                  </button>
                </div>
              </>
            )}

            {/* Step 2 — Contact */}
            {step === 2 && (
              <>
                <div className="lp-modal-kicker">Etapa 03 / 03 · Contato</div>
                <h3>
                  Para onde
                  <br />
                  enviamos a proposta?
                </h3>
                <p className="lp-modal-sub">
                  Resposta em até 2 horas úteis, com avaliação técnica do especialista.
                </p>
                <div className="lp-modal-field">
                  <label>Nome completo</label>
                  <input
                    value={data.nome}
                    onChange={(e) => setData({ ...data, nome: e.target.value })}
                    placeholder="Seu nome"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="lp-modal-field">
                    <label>Empresa</label>
                    <input
                      value={data.empresa}
                      onChange={(e) => setData({ ...data, empresa: e.target.value })}
                      placeholder="Construtora · Produtora"
                    />
                  </div>
                  <div className="lp-modal-field">
                    <label>Telefone</label>
                    <input
                      value={data.telefone}
                      onChange={(e) => setData({ ...data, telefone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
                <div className="lp-modal-field">
                  <label>E-mail</label>
                  <input
                    value={data.email}
                    onChange={(e) => setData({ ...data, email: e.target.value })}
                    placeholder="nome@empresa.com.br"
                  />
                </div>
                <div className="lp-modal-actions">
                  <button className="btn btn-ghost" onClick={() => setStep(1)}>
                    ← Voltar
                  </button>
                  <button
                    className="btn btn-accent"
                    disabled={!data.nome || !data.email || !data.telefone}
                    onClick={submit}
                    style={{
                      opacity: data.nome && data.email && data.telefone ? 1 : 0.4,
                    }}
                  >
                    Enviar solicitação
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
