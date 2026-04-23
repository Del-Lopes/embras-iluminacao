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

      {/* Decorative silhouette of pole towers */}
      <svg
        className="hero-silhouette"
        viewBox="0 0 320 900"
        fill="none"
        preserveAspectRatio="xMidYMax meet"
      >
        <defs>
          <linearGradient id="poleG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c9a86a" stopOpacity="0.15" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.2" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {/* Pole 1 — decorative public lighting pole */}
        <g stroke="url(#poleG)" strokeWidth="1.2" fill="none">
          <line x1="60" y1="120" x2="60" y2="900" />
          <path d="M60 140 Q 60 100 90 100 L 130 100" />
          <circle cx="138" cy="100" r="8" />
          <path d="M60 170 Q 60 140 35 140 L 10 140" />
          <circle cx="5" cy="140" r="6" />
          <rect x="52" y="860" width="16" height="40" />
        </g>
        {/* Pole 2 — industrial tall */}
        <g stroke="url(#poleG)" strokeWidth="1.2" fill="none">
          <line x1="180" y1="80" x2="180" y2="900" />
          <line x1="180" y1="90" x2="180" y2="95" strokeWidth="4" />
          <rect x="150" y="95" width="60" height="8" />
          <line x1="160" y1="103" x2="160" y2="120" />
          <line x1="200" y1="103" x2="200" y2="120" />
          <circle cx="160" cy="128" r="4" />
          <circle cx="200" cy="128" r="4" />
          <rect x="172" y="860" width="16" height="40" />
        </g>
        {/* Pole 3 — curved decorative */}
        <g stroke="url(#poleG)" strokeWidth="1.2" fill="none">
          <line x1="270" y1="180" x2="270" y2="900" />
          <path d="M270 200 Q 270 150 240 150 Q 210 150 210 170" />
          <circle cx="210" cy="175" r="6" />
          <rect x="262" y="860" width="16" height="40" />
        </g>
        {/* Ground line */}
        <line x1="0" y1="895" x2="320" y2="895" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1" />
      </svg>

      <div className="hero-inner">
        <HeroPill text="Fabricante nacional com padrão industrial" />

        <h1 className="hero-headline">
          {h.top}
          <br />
          <span className="dim">{h.mid}</span>
          {h.midWhite && <span>{h.midWhite}</span>}
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
