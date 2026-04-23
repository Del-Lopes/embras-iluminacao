import type { CopyVariant } from './LandingPage'
import HeroPill from './HeroPill'

interface PainProps {
  copy: CopyVariant
}

const ITEMS = [
  { t: 'Prazo quebrado', b: 'Fornecedor promete data e some perto da entrega, emperrando seu cronograma.' },
  { t: 'Qualidade frágil', b: 'Acabamento ruim, galvanização irregular, material fora do padrão técnico.' },
  { t: 'Sem escala', b: 'Dificuldade real de encontrar quem produza volume sem terceirizar metade.' },
  { t: 'Preço instável', b: 'Cotação muda toda semana. Margem do projeto imprevisível.' },
  { t: 'Zero confiança', b: 'Você não sabe se quem vendeu realmente fabrica — ou só revende.' },
  { t: 'Comunicação lenta', b: 'WhatsApp sem resposta, pedidos perdidos, atualização só quando cobra.' },
]

export default function Pain({ copy }: PainProps) {
  return (
    <section className="section" id="dores">
      <div className="section-inner">
        <div className="section-head-row">
          <div>
            <HeroPill text="Cenário atual" />
            <h2 className="lp-h1">
              Você já passou
              <br />
              <span className="dim">por isso antes.</span>
            </h2>
          </div>
          <p className="body-lg">{copy.painIntro}</p>
        </div>

        <div className="pain-grid">
          {ITEMS.map((item, i) => (
            <div key={i} className="pain-item">
              <div className="pain-num">{String(i + 1).padStart(2, '0')} / 06</div>
              <div className="pain-title">{item.t}</div>
              <div className="pain-body">{item.b}</div>
            </div>
          ))}
        </div>

        <div className="pain-bottom">
          <div className="pain-bottom-text">{copy.painBottom}</div>
          <div className="kicker" style={{ color: 'var(--accent-steel)' }}>
            → A Embras resolve
          </div>
        </div>
      </div>
    </section>
  )
}
