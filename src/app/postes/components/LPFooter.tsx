import Image from 'next/image'

export default function LPFooter() {
  return (
    <footer className="lp-footer">
      <div className="footer-top">
        <div>
          <Image
            src="/images/embras-logo-w.png"
            alt="Embras"
            width={160}
            height={40}
            className="footer-logo"
            style={{ width: 'auto', height: 28, objectFit: 'contain' }}
          />
          <p className="footer-tag">
            Indústria nacional de postes de aço galvanizado e alumínio — produção em escala, padrão
            técnico, entrega confiável.
          </p>
        </div>
        <div className="footer-col">
          <h4>Produtos</h4>
          <a href="#produtos">Aço Galvanizado</a>
          <a href="#produtos">Alumínio</a>
          <a href="#produtos">Sob medida</a>
          <a href="#produtos">Cenografia</a>
        </div>
        <div className="footer-col">
          <h4>Empresa</h4>
          <a href="#solucao">Sobre</a>
          <a href="#prova">Projetos</a>
          <a href="#garantia">Garantia</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="footer-col">
          <h4>Contato</h4>
          <a href="tel:+551140000000">+55 11 4000-0000</a>
          <a href="mailto:comercial@embras.com.br">comercial@embras.com.br</a>
          <span>São Paulo · Brasil</span>
          <a href="https://wa.me/5511999999999" target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Embras Indústria</span>
        <span>CNPJ · 00.000.000/0001-00</span>
      </div>
    </footer>
  )
}
