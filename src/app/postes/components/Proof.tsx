'use client'

import { useState } from 'react'
import HeroPill from './HeroPill'

const METRICS = [
  { k: 'Mercado', v: '15', u: '+ anos', d: 'De operação industrial contínua.' },
  { k: 'Capacidade', v: '2.4', u: 'k/mês', d: 'Postes produzidos em linha.' },
  { k: 'Projetos', v: '820', u: '+', d: 'Grandes obras entregues no Brasil.' },
  { k: 'Cobertura', v: '27', u: 'UF', d: 'Logística nacional organizada.' },
]

const PROJECTS = [
  { tag: 'Reality Show Nacional', name: 'A Fazenda', sub: 'Postes cenográficos · Record TV' },
  { tag: 'Construtora', name: 'Obra Residencial', sub: 'São Paulo · 340 postes' },
  { tag: 'Reality Show', name: 'Power Couple', sub: 'Iluminação externa' },
  { tag: 'Obra Pública', name: 'Avenida Central', sub: 'Minas Gerais · 180 postes' },
  { tag: 'Produção', name: 'A Grande Conquista', sub: 'Estrutura cênica' },
]

const QUOTES = [
  {
    t: 'Prazo cumprido à risca, material dentro da especificação. É o tipo de fornecedor que a gente mantém no contato rápido.',
    who: 'Eng. Ricardo Mendes',
    role: 'Construtora Horizonte · Diretor de Obras',
  },
  {
    t: 'Produziram 240 postes sob medida em seis semanas. Sem drama, sem atraso, sem retrabalho. Raro.',
    who: 'Arq. Camila Torres',
    role: 'Estúdio CT Arquitetura',
  },
  {
    t: 'Quando a produção pediu 80 postes em 15 dias, a Embras entregou. Foi o que salvou o cronograma.',
    who: 'Marcos Andrade',
    role: 'Produtor Executivo · Record TV',
  },
]

export default function Proof() {
  const [qi, setQi] = useState(0)
  const q = QUOTES[qi]

  return (
    <section className="section" id="prova">
      <div className="section-inner">
        <div className="section-head-row">
          <div>
            <HeroPill text="Autoridade técnica" />
            <h2 className="lp-h1">
              Quem já
              <br />
              <span className="dim">confiou na</span> Embras.
            </h2>
          </div>
          <p className="body-lg">
            Fornecemos para grandes produções nacionais e construtoras. Nosso histórico é a primeira
            prova de que o próximo projeto também será entregue.
          </p>
        </div>

        {/* Metrics */}
        <div className="proof-metrics">
          {METRICS.map((m, i) => (
            <div key={i} className="proof-metric">
              <div className="proof-metric-k">
                {String(i + 1).padStart(2, '0')} / {m.k}
              </div>
              <div className="proof-metric-v">
                {m.v}
                <span className="u">{m.u}</span>
              </div>
              <div className="proof-metric-d">{m.d}</div>
            </div>
          ))}
        </div>

        {/* Projects grid */}
        <div className="proof-projects-grid">
          {PROJECTS.map((p, i) => (
            <div key={i} className="proof-project">
              <div
                className="proof-project-img"
                style={{
                  backgroundImage: `url(/images/${i % 2 === 0 ? 'case-1.png' : 'hero.png'})`,
                }}
              />
              <div className="proof-project-overlay" />
              <div className="proof-project-content">
                <div className="proof-project-tag">{p.tag}</div>
                <div className="proof-project-name">{p.name}</div>
                <div className="proof-project-sub">{p.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="proof-testi">
          <div className="proof-testi-icon">
            <svg width="56" height="40" viewBox="0 0 56 40" fill="none">
              <path
                d="M0 40V22C0 9.85 9.85 0 22 0v8c-7.73 0-14 6.27-14 14h14v18H0zm32 0V22C32 9.85 41.85 0 54 0v8c-7.73 0-14 6.27-14 14h14v18H32z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div>
            <div className="kicker" style={{ color: 'var(--accent-steel)', marginBottom: 20 }}>
              Depoimentos · {String(qi + 1).padStart(2, '0')} /{' '}
              {String(QUOTES.length).padStart(2, '0')}
            </div>
            <p className="proof-testi-quote">"{q.t}"</p>
            <div className="proof-testi-author">
              <div>
                <div className="proof-testi-who">{q.who}</div>
                <div className="proof-testi-role">{q.role}</div>
              </div>
              <div className="proof-testi-nav">
                <button
                  className="proof-testi-btn"
                  onClick={() => setQi((qi - 1 + QUOTES.length) % QUOTES.length)}
                  aria-label="Depoimento anterior"
                >
                  ←
                </button>
                <button
                  className="proof-testi-btn"
                  onClick={() => setQi((qi + 1) % QUOTES.length)}
                  aria-label="Próximo depoimento"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
