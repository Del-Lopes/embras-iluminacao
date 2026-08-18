// Períodos do filtro de data da listagem de projetos.
//
// A data do projeto é gravada como YYYY-MM (ver project-date.ts), então cada
// período vira um intervalo de meses no mesmo formato: a comparação de texto
// já é cronológica. Fica num módulo à parte porque a lista é usada pelo
// componente de filtros (client) e pela consulta (server), e um arquivo
// "use server" só pode exportar funções async.

export type ProjectPeriod = {
  value: string
  label: string
}

export const PROJECT_PERIODS: ProjectPeriod[] = [
  { value: 'este-mes', label: 'Este mês' },
  { value: '3-meses', label: 'Últimos 3 meses' },
  { value: '6-meses', label: 'Últimos 6 meses' },
  { value: 'este-ano', label: 'Este ano' },
  { value: '3-anos', label: 'Últimos 3 anos' },
  { value: '3-mais', label: 'Mais de 3 anos' },
]

const PERIOD_VALUES = new Set(PROJECT_PERIODS.map((p) => p.value))

// Um intervalo fechado em YYYY-MM. `from` ausente = sem limite inferior.
export type MonthRange = { from?: string; to?: string }

const toMonth = (year: number, monthIndex0: number): string => {
  // Normaliza estouro/negativo de mês (ex.: mês -2 vira novembro do ano anterior).
  const y = year + Math.floor(monthIndex0 / 12)
  const m = ((monthIndex0 % 12) + 12) % 12
  return `${y}-${String(m + 1).padStart(2, '0')}`
}

// Converte um período no intervalo correspondente, ancorado em `now`.
// Devolve null para valores desconhecidos, que assim são simplesmente ignorados.
export const periodToRange = (value: string, now: Date): MonthRange | null => {
  if (!PERIOD_VALUES.has(value)) return null

  const year = now.getFullYear()
  const month = now.getMonth() // 0-11
  const current = toMonth(year, month)

  switch (value) {
    case 'este-mes':
      return { from: current, to: current }
    // "Últimos N meses" inclui o mês corrente, por isso N-1 meses para trás.
    case '3-meses':
      return { from: toMonth(year, month - 2), to: current }
    case '6-meses':
      return { from: toMonth(year, month - 5), to: current }
    case 'este-ano':
      return { from: `${year}-01`, to: current }
    case '3-anos':
      return { from: toMonth(year - 3, month + 1), to: current }
    // Tudo anterior à janela dos 3 anos, sem limite inferior.
    case '3-mais':
      return { to: toMonth(year - 3, month) }
    default:
      return null
  }
}

// Lista de períodos → intervalos, descartando os inválidos. Períodos marcados
// juntos são somados (união), e não interseccionados: marcar "Este mês" e
// "Mais de 3 anos" traz os dois conjuntos.
export const periodsToRanges = (values: string[], now: Date): MonthRange[] =>
  values
    .map((v) => periodToRange(v, now))
    .filter((r): r is MonthRange => !!r)
