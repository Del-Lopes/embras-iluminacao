import type { CopyVariant } from './LandingPage'
import HeroPill from './HeroPill'

interface SolutionProps {
  copy: CopyVariant
  openForm: () => void
}

const FEATURES = [
  {
    k: 'Produção em escala',
    v: 'Linha própria de galvanização a fogo e fabricação em alumínio com capacidade para atender grandes volumes sem subcontratação.',
  },
  {
    k: 'Padronização técnica',
    v: 'Controle de qualidade em cada lote. Espessuras, soldas e acabamento conforme especificação do projeto.',
  },
  {
    k: 'Cumprimento de prazo',
    v: 'Processo industrial com cronograma real. Você sabe quando o material sai da fábrica — e quando chega.',
  },
  {
    k: 'Atendimento direto',
    v: 'Sem intermediário. Você fala com quem fabrica, negocia e executa — do orçamento à entrega.',
  },
]

export default function Solution({ copy, openForm }: SolutionProps) {
  return (
    <section className="section" id="solucao">
      <div className="section-inner">
        <div className="sol-layout">
          <div className="sol-left">
            <HeroPill text="A solução" />
            <h2 className="lp-h1">
              Fábrica nacional
              <br />
              <span className="dim">com estrutura real</span>
              <br />
              de produção.
            </h2>
            <p className="body-lg" style={{ marginTop: 32 }}>
              {copy.solBody}
            </p>
            <div style={{ marginTop: 40, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn" onClick={openForm}>
                Ver capacidade
              </button>
            </div>
          </div>

          <div className="sol-features">
            {FEATURES.map((f, i) => (
              <div key={i} className="sol-feature">
                <div className="sol-feature-num">/{String(i + 1).padStart(2, '0')}</div>
                <div>
                  <div className="sol-feature-k">{f.k}</div>
                  <div className="sol-feature-v">{f.v}</div>
                </div>
                <div className="sol-feature-plus">+</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
