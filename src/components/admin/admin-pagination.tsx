import Link from 'next/link'

// ----------------------------------------------------------------
// AdminPagination — mesma lógica da paginação do blog:
// janela deslizante de no máximo 9 números (página atual centralizada)
// + setas « ‹ › » para primeira / anterior / próxima / última.
// ----------------------------------------------------------------
type AdminPaginationProps = {
  page: number
  pageCount: number
  searchParams: Record<string, string>
}

const PAGE_WINDOW = 9

export const AdminPagination = ({ page, pageCount, searchParams }: AdminPaginationProps) => {
  if (pageCount <= 1) return null

  const buildHref = (p: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(p))
    return `?${params.toString()}`
  }

  // Janela deslizante — página atual centralizada; nas bordas a janela "encosta".
  let winStart = Math.max(1, page - 4)
  const winEnd = Math.min(pageCount, winStart + PAGE_WINDOW - 1)
  winStart = Math.max(1, winEnd - PAGE_WINDOW + 1)
  const windowPages = Array.from({ length: winEnd - winStart + 1 }, (_, i) => winStart + i)

  const atFirst = page <= 1
  const atLast = page >= pageCount

  const arrow = (target: number, label: string, glyph: string, disabled: boolean) =>
    disabled ? (
      <span className="pagination-page pagination-arrow pagination-page--disabled" aria-hidden="true">
        {glyph}
      </span>
    ) : (
      <Link href={buildHref(target)} className="pagination-page pagination-arrow" aria-label={label}>
        {glyph}
      </Link>
    )

  return (
    <div className="pagination">
      <div className="pagination-pages">
        {arrow(1, 'Primeira página', '«', atFirst)}
        {arrow(page - 1, 'Página anterior', '‹', atFirst)}

        {windowPages.map((p) => (
          <Link
            key={p}
            href={buildHref(p)}
            data-far={Math.abs(p - page) > 2 ? 'true' : undefined}
            className={`pagination-page pagination-num${p === page ? ' pagination-page--active' : ''}`}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </Link>
        ))}

        {arrow(page + 1, 'Próxima página', '›', atLast)}
        {arrow(pageCount, 'Última página', '»', atLast)}
      </div>
    </div>
  )
}
