interface NavProps {
  openForm: () => void
}

export default function Nav({ openForm }: NavProps) {
  return (
    <nav className="lp-nav">
      <div className="nav-brand">
        <img src="/images/embras-logo-w.png" alt="Embras" className="nav-logo" />
      </div>
      <div className="nav-links">
        <a className="m-link" href="#dores">Cenário</a>
        <a className="m-link" href="#produtos">Produtos</a>
        <a className="m-link" href="#prova">Projetos</a>
        <a className="m-link" href="#faq">FAQ</a>
        <a className="m-link" href="#contato">Contato</a>
      </div>
      <div className="nav-cta">
        <button className="btn btn-sm" onClick={openForm}>Orçamento</button>
      </div>
    </nav>
  )
}
