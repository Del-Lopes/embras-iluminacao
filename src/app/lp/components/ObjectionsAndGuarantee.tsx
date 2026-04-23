import HeroPill from './HeroPill'

const OBJS = [
  {
    q: 'E o preço?',
    a: 'Produzimos em escala e sem intermediários. Isso nos permite praticar condições competitivas sem abrir mão da especificação técnica.',
  },
  {
    q: 'E o prazo?',
    a: 'Temos estrutura industrial com processo programado. O prazo é definido no orçamento e cumprido — com status do lote em cada etapa.',
  },
  {
    q: 'Posso confiar?',
    a: 'Já fornecemos para grandes produções nacionais e construtoras de alto padrão. Histórico disponível sob solicitação.',
  },
  {
    q: 'E se meu projeto for grande?',
    a: 'É exatamente aqui que a Embras se destaca: capacidade real para atender demandas em larga escala sem subcontratar produção.',
  },
]

export default function ObjectionsAndGuarantee() {
  return (
    <section className="section" id="objecoes">
      <div className="section-inner">
        <div className="section-head-row">
          <div>
            <HeroPill text="Objeções" />
            <h2 className="lp-h1">
              As perguntas
              <br />
              <span className="dim">que você</span> faria
              <br />
              antes de fechar.
            </h2>
          </div>
          <p className="body-lg">
            Respondemos direto, sem rodeio comercial. Se ainda restar dúvida, a proposta é: converse
            com nosso especialista e avalie você mesmo.
          </p>
        </div>

        <div className="obj-grid">
          {OBJS.map((o, i) => (
            <div key={i} className="obj-item">
              <div className="obj-q">
                <span className="obj-q-mark">Q.{String(i + 1).padStart(2, '0')}</span>
                {o.q}
              </div>
              <div className="obj-a">{o.a}</div>
            </div>
          ))}
        </div>

        {/* Guarantee seal */}
        <div className="guar" id="garantia">
          <div className="guar-seal">
            Compromisso
            <div className="guar-seal-main">Embras</div>
            de Entrega
          </div>
          <div className="guar-text">
            <h3>
              Nosso compromisso
              <br />
              <span style={{ color: 'var(--accent-steel)', fontWeight: 300 }}>é simples:</span>
            </h3>
            <p>
              Entregar exatamente o que foi acordado — na especificação, no prazo e no volume
              combinado. Cada projeto recebe tratamento técnico individualizado, com responsabilidade
              de execução fabril. Porque sabemos que o seu resultado depende disso.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
