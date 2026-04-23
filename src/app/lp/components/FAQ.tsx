'use client'

import { useState } from 'react'
import HeroPill from './HeroPill'

interface FAQProps {
  openForm: () => void
}

const FAQS = [
  {
    q: 'Vocês atendem projetos pequenos e grandes?',
    a: 'Sim. Atendemos desde demandas pontuais de dezenas de peças até contratos de milhares de postes para grandes obras e produções.',
  },
  {
    q: 'O preço é fixo?',
    a: 'Não. Trabalhamos com orçamento personalizado conforme o projeto — altura, espessura, tratamento e volume influenciam o custo final.',
  },
  {
    q: 'Qual é o prazo de entrega?',
    a: 'Depende do volume e da especificação, mas informamos com clareza no orçamento e cumprimos. Projetos padrão saem em 2 a 4 semanas após fechamento.',
  },
  {
    q: 'Vocês entregam em todo o Brasil?',
    a: 'Sim. Temos logística organizada para as 27 UFs, com coordenação de transporte incluída na proposta quando necessário.',
  },
  {
    q: 'Posso personalizar os postes?',
    a: 'Sim. Produzimos conforme a necessidade do projeto — altura, tratamento, cor, luminária, base e braço sob medida.',
  },
  {
    q: 'Como funciona o processo?',
    a: 'Você solicita o orçamento → avaliamos tecnicamente → enviamos proposta → fechamos condições → iniciamos produção → entregamos no prazo combinado.',
  },
]

export default function FAQ({ openForm }: FAQProps) {
  const [open, setOpen] = useState<number>(0)

  return (
    <section className="section" id="faq">
      <div className="section-inner">
        <div className="faq-wrap">
          <div className="faq-left">
            <HeroPill text="FAQ" />
            <h2 className="lp-h2">
              Perguntas
              <br />
              <span className="dim">frequentes.</span>
            </h2>
            <p className="lp-body" style={{ marginTop: 24, color: 'var(--color-muted)' }}>
              Não encontrou sua dúvida? Fale com um especialista.
            </p>
            <button className="btn btn-sm" style={{ marginTop: 24 }} onClick={openForm}>
              Falar com especialista
            </button>
          </div>

          <div className="faq-list">
            {FAQS.map((f, i) => (
              <div
                key={i}
                className={`faq-item${open === i ? ' is-open' : ''}`}
                onClick={() => setOpen(open === i ? -1 : i)}
              >
                <div className="faq-q-row">
                  <div className="faq-q-num">{String(i + 1).padStart(2, '0')}</div>
                  <div className="faq-q">{f.q}</div>
                  <div className="faq-toggle" />
                </div>
                <div className="faq-a">
                  <div className="faq-a-inner">{f.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
