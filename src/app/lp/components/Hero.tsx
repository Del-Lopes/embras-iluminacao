import type { CopyVariant, HeadlineKey } from './LandingPage'
import { HEADLINES } from './LandingPage'
import HeroPill from './HeroPill'

interface HeroProps {
  copy: CopyVariant
  headline: HeadlineKey
  openForm: () => void
}

export default function Hero({ copy, headline, openForm }: HeroProps) {
  const h = HEADLINES[headline]

  const renderBottom = () => {
    if (h.accent) {
      const parts = h.bottom.split(h.accent)
      return (
        <>
          {parts[0]}
          <span className="accent">{h.accent}</span>
          {parts[1]}
        </>
      )
    }
    if (h.outline) {
      const parts = h.bottom.split(h.outline)
      return (
        <>
          {parts[0]}
          <span className="outline">{h.outline}</span>
          {parts[1]}
        </>
      )
    }
    return h.bottom
  }

  return (
    <section className="hero" id="hero">
      <div className="hero-radial" />
      <div className="hero-grid-bg" />

      <div className="hero-inner">
        <HeroPill text="Fabricante nacional com padrão industrial" />

        <h1 className="hero-headline">
          {h.top}
          {' '}
          <br />
          <span className="dim">{h.mid}</span>
          {h.midWhite && <span>{h.midWhite}</span>}
          {' '}
          <br />
          {renderBottom()}
        </h1>

        <div className="hero-sub">
          <p>{copy.heroSub}</p>
          <div>
            <div className="hero-cta">
              <button className="btn btn-accent btn-lg" onClick={openForm}>
                Solicitar Orçamento
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </button>
              <a
                className="btn btn-ghost btn-lg"
                href="https://wa.me/5511999999999?text=Quero%20um%20or%C3%A7amento%20de%20postes"
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            </div>
            <div className="hero-micro">
              <span>Resposta rápida</span>
              <span className="sep" />
              <span>Sem compromisso</span>
              <span className="sep" />
              <span>Especialista técnico</span>
            </div>
          </div>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-num">
              15<span className="suffix">+</span>
            </div>
            <div className="hero-stat-k">Anos de mercado</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-num">
              2.4k<span className="suffix">/mês</span>
            </div>
            <div className="hero-stat-k">Capacidade produtiva</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-num">
              100<span className="suffix">%</span>
            </div>
            <div className="hero-stat-k">Produção própria</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-num">
              27<span className="suffix">UF</span>
            </div>
            <div className="hero-stat-k">Entrega nacional</div>
          </div>
        </div>
      </div>

    </section>
  )
}
