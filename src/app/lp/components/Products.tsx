import HeroPill from './HeroPill'

interface ProductsProps {
  openForm: () => void
}

function PoleSVGSteel() {
  return (
    <svg viewBox="0 0 200 240" fill="none" preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id="steelG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="steelBody" x1="0.3" y1="0" x2="0.7" y2="0">
          <stop offset="0" stopColor="#4a4a4a" />
          <stop offset="0.5" stopColor="#b8b8b8" />
          <stop offset="1" stopColor="#4a4a4a" />
        </linearGradient>
      </defs>
      {/* Luminaire */}
      <rect x="60" y="14" width="80" height="10" fill="url(#steelG)" />
      <path d="M68 24 L 132 24 L 128 32 L 72 32 Z" fill="#c9a86a" opacity="0.9" />
      {/* Arm */}
      <path d="M100 32 Q 100 40 106 42 L 106 50" stroke="url(#steelG)" strokeWidth="2" fill="none" />
      {/* Body — tapered pole */}
      <path d="M94 50 L 106 50 L 110 230 L 90 230 Z" fill="url(#steelBody)" />
      {/* Rivets/joints */}
      <circle cx="100" cy="80" r="1.2" fill="#0a0a0a" opacity="0.6" />
      <circle cx="100" cy="140" r="1.2" fill="#0a0a0a" opacity="0.6" />
      <circle cx="100" cy="200" r="1.2" fill="#0a0a0a" opacity="0.6" />
      {/* Base */}
      <rect x="82" y="228" width="36" height="6" fill="#2a2a2a" />
      <rect x="78" y="234" width="44" height="4" fill="#1a1a1a" />
      {/* Ground line */}
      <line x1="20" y1="238" x2="180" y2="238" stroke="#ffffff" strokeOpacity="0.15" />
    </svg>
  )
}

function PoleSVGAlum() {
  return (
    <svg viewBox="0 0 200 240" fill="none" preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id="alumBody" x1="0.3" y1="0" x2="0.7" y2="0">
          <stop offset="0" stopColor="#6a6a6a" />
          <stop offset="0.5" stopColor="#e8e8ea" />
          <stop offset="1" stopColor="#6a6a6a" />
        </linearGradient>
      </defs>
      {/* Decorative top luminaire — sphere */}
      <circle cx="100" cy="22" r="12" fill="#c9a86a" opacity="0.85" />
      <circle cx="100" cy="22" r="8" fill="#f2e6cf" opacity="0.3" />
      {/* Curved arm */}
      <path d="M100 34 Q 100 50 100 52" stroke="#9a9a9a" strokeWidth="2" fill="none" />
      {/* Decorative collar */}
      <rect x="92" y="52" width="16" height="4" fill="#9a9a9a" />
      {/* Tapered body with fluting */}
      <path d="M96 56 L 104 56 L 108 230 L 92 230 Z" fill="url(#alumBody)" />
      <line x1="100" y1="60" x2="100" y2="225" stroke="#3a3a3a" strokeWidth="0.5" />
      {/* Decorative rings */}
      <rect x="92" y="90" width="16" height="2" fill="#9a9a9a" />
      <rect x="92" y="160" width="16" height="2" fill="#9a9a9a" />
      {/* Decorative base */}
      <rect x="82" y="228" width="36" height="5" fill="#3a3a3a" />
      <path d="M74 233 L 126 233 L 122 238 L 78 238 Z" fill="#2a2a2a" />
      <line x1="20" y1="238" x2="180" y2="238" stroke="#ffffff" strokeOpacity="0.15" />
    </svg>
  )
}

export default function Products({ openForm }: ProductsProps) {
  return (
    <section className="section" id="produtos">
      <div className="section-inner">
        <div className="section-head-row">
          <div>
            <HeroPill text="Linha de produtos" />
            <h2 className="lp-h1">
              Duas linhas,
              <br />
              <span className="dim">um padrão.</span>
            </h2>
          </div>
          <p className="body-lg">
            Aço galvanizado a fogo para durabilidade industrial. Alumínio para acabamento decorativo
            e leveza. Ambos fabricados sob o mesmo padrão técnico — sob medida conforme seu projeto.
          </p>
        </div>

        <div className="prod-grid">
          {/* Aço Galvanizado */}
          <div className="prod-card">
            <div className="prod-head">
              <div>
                <div className="prod-name">Aço Galvanizado</div>
                <div className="prod-sub">Série Industrial · Fogo</div>
              </div>
              <div>
                <div className="prod-spec-k">Linha</div>
                <div className="prod-spec-v">01 / Aço</div>
              </div>
            </div>

            <div className="prod-visual">
              <PoleSVGSteel />
            </div>

            <div className="prod-specs">
              <div className="prod-spec">
                <span className="prod-spec-label">Altura</span>
                <span className="prod-spec-value">3m · 12m</span>
              </div>
              <div className="prod-spec">
                <span className="prod-spec-label">Tratamento</span>
                <span className="prod-spec-value">Galvanizado a fogo</span>
              </div>
              <div className="prod-spec">
                <span className="prod-spec-label">Aplicação</span>
                <span className="prod-spec-value">Pública · Industrial</span>
              </div>
              <div className="prod-spec">
                <span className="prod-spec-label">Norma</span>
                <span className="prod-spec-value">NBR 6323</span>
              </div>
            </div>
          </div>

          {/* Alumínio */}
          <div className="prod-card">
            <div className="prod-head">
              <div>
                <div className="prod-name">Alumínio</div>
                <div className="prod-sub">Série Decorativa · Premium</div>
              </div>
              <div>
                <div className="prod-spec-k">Linha</div>
                <div className="prod-spec-v">02 / Alumínio</div>
              </div>
            </div>

            <div className="prod-visual">
              <PoleSVGAlum />
            </div>

            <div className="prod-specs">
              <div className="prod-spec">
                <span className="prod-spec-label">Altura</span>
                <span className="prod-spec-value">2.5m · 9m</span>
              </div>
              <div className="prod-spec">
                <span className="prod-spec-label">Acabamento</span>
                <span className="prod-spec-value">Pintura eletrostática</span>
              </div>
              <div className="prod-spec">
                <span className="prod-spec-label">Aplicação</span>
                <span className="prod-spec-value">Urbana · Cenografia</span>
              </div>
              <div className="prod-spec">
                <span className="prod-spec-label">Peso</span>
                <span className="prod-spec-value">40% mais leve</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button className="btn" onClick={openForm}>
            Especificar meu projeto
          </button>
        </div>
      </div>
    </section>
  )
}
