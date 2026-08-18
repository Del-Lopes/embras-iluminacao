// Vizinhos de um item dentro de uma lista ordenada de slugs.
//
// A ordem tem de ser a mesma da listagem pública correspondente, para "próximo"
// significar o card seguinte na tela. Cada página faz a própria consulta (é ela
// que conhece a tabela e a ordenação padrão) e passa o resultado aqui.
//
// A lista chega inteira, e não por consulta de vizinhança: comparar "o
// publicado logo antes deste" exige desempate estável quando duas linhas têm a
// mesma data, o que acontece em qualquer carga inicial de dados. Buscar só a
// coluna slug de algumas dezenas ou centenas de linhas custa menos que acertar
// isso com duas consultas.

export type AdjacentSlugs = { prev: string | null; next: string | null }

export const findAdjacentSlugs = (
  slugs: string[],
  current: string
): AdjacentSlugs => {
  const i = slugs.indexOf(current)
  if (i === -1) return { prev: null, next: null }
  return {
    prev: i > 0 ? slugs[i - 1] : null,
    next: i < slugs.length - 1 ? slugs[i + 1] : null,
  }
}
