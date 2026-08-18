// Formatação de projects.project_date.
//
// O valor é gravado como YYYY-MM (é o que o <input type="month"> produz), um
// formato que ordena e compara corretamente como texto, mas que não serve para
// leitura. Aqui ele vira "Março de 2024".

export const PROJECT_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])$/

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

// Devolve string vazia quando não há data ou o valor está fora do formato, para
// o chamador poder simplesmente omitir o trecho.
export const formatProjectDate = (value: string | null | undefined): string => {
  const raw = (value ?? '').trim()
  if (!PROJECT_DATE_RE.test(raw)) return ''
  const [year, month] = raw.split('-')
  return `${MONTHS[Number(month) - 1]} de ${year}`
}

// Versão curta para os cards, onde a linha divide espaço com o local:
// "Março de 2024" vira "MAR/2024". O CSS é que aplica o caixa alta.
export const formatProjectDateShort = (value: string | null | undefined): string => {
  const raw = (value ?? '').trim()
  if (!PROJECT_DATE_RE.test(raw)) return ''
  const [year, month] = raw.split('-')
  return `${MONTHS[Number(month) - 1].slice(0, 3)}/${year}`
}
