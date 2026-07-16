import type { CopyVariant } from './LandingPage'
import HeroPill from './HeroPill'

interface CTAFinalProps {
  copy: CopyVariant
  openForm: () => void
}

export default function CTAFinal({ copy, openForm }: CTAFinalProps) {
  return (
    <section className="cta-final" id="contato">
      <div className="cta-final-radial" />
      <div className="cta-final-inner">
        <HeroPill text="Próximo passo" style={{ justifyContent: 'center' }} />
        <h2>
          Fale direto
          <br />
          com quem <span className="accent">fabrica.</span>
        </h2>
        <p className="body-lg">{copy.ctaFinal}</p>
        <div className="cta-final-cta">
          <button className="btn btn-accent btn-lg" onClick={openForm}>
            Solicitar Orçamento
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
          <a
            className="btn btn-ghost btn-lg"
            href="https://wa.me/5511999999999"
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp direto
          </a>
        </div>
      </div>
    </section>
  )
}
