import Link from 'next/link'

type Props = {
  prevHref: string | null
  nextHref: string | null
}

function Chevron() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

// Navegação entre itens vizinhos da listagem, no topo do container da imagem:
// rótulo, os dois círculos encostados no centro, rótulo.
//
// Nas pontas da lista o controle continua ocupando o lugar, desabilitado:
// removê-lo deslocaria o outro e daria a impressão de que a navegação mudou de
// posição.
export function AdjacentNav({ prevHref, nextHref }: Props) {
  if (!prevHref && !nextHref) return null

  const prevInner = (
    <>
      <span className="adjacent-nav-label">Voltar</span>
      <span className="adjacent-nav-circle">
        <Chevron />
      </span>
    </>
  )

  const nextInner = (
    <>
      <span className="adjacent-nav-circle">
        <Chevron />
      </span>
      <span className="adjacent-nav-label">Próximo</span>
    </>
  )

  return (
    <div className="adjacent-nav">
      {prevHref ? (
        <Link href={prevHref} className="adjacent-nav-btn adjacent-nav-btn--prev">
          {prevInner}
        </Link>
      ) : (
        <span className="adjacent-nav-btn adjacent-nav-btn--prev is-disabled" aria-hidden>
          {prevInner}
        </span>
      )}

      {nextHref ? (
        <Link href={nextHref} className="adjacent-nav-btn adjacent-nav-btn--next">
          {nextInner}
        </Link>
      ) : (
        <span className="adjacent-nav-btn adjacent-nav-btn--next is-disabled" aria-hidden>
          {nextInner}
        </span>
      )}
    </div>
  )
}
