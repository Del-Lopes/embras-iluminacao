// Capitalização de nomes cadastrados (materiais, categorias, rótulos).
//
// Regra: primeira letra maiúscula em cada palavra principal, deixando em
// minúscula as preposições, conjunções e artigos — salvo quando um deles é a
// PRIMEIRA palavra, que sempre sobe.
//
//   "luminária de ferro"  -> "Luminária de Ferro"
//   "tensão de saída"     -> "Tensão de Saída"
//   "de acordo com a nbr" -> "De Acordo com a NBR"
//
// Serve para o dado entrar uniforme independentemente de quem digitou, já
// que essas listas são vistas lado a lado no admin e no catálogo.

// Palavras que ficam em minúscula no meio do nome. Cobre artigos,
// preposições (simples e contraídas) e as conjunções mais comuns.
const MINOR_WORDS = new Set([
  // artigos
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
  // preposições
  'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas',
  'por', 'pelo', 'pela', 'pelos', 'pelas',
  'ao', 'aos', 'à', 'às',
  'para', 'com', 'sem', 'sob', 'sobre', 'entre', 'até',
  'após', 'ante', 'contra', 'desde', 'perante', 'trás',
  // conjunções
  'e', 'ou', 'mas', 'nem', 'que', 'se', 'como',
  'porém', 'contudo', 'todavia', 'pois', 'porque',
])

// Um "grito" é a palavra escrita inteira em maiúsculas que NÃO é sigla:
// mais de três letras e sem dígito. "FERRO" cai aqui e vira "Ferro"; "LED",
// "IP" e "RGB" não caem, e sobrevivem como foram escritos.
//
// O corte em três letras é heurística, não regra: "INOX" será rebaixado para
// "Inox" (o que é desejável) mas uma sigla de quatro letras também seria.
const isShouting = (word: string) =>
  word.length > 3 && !/\d/.test(word) && word === word.toLocaleUpperCase('pt-BR')

const capitalize = (word: string) =>
  word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1)

export const toTitleCase = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word, index) => {
      if (!word) return word

      const lower = word.toLocaleLowerCase('pt-BR')

      // Palavra menor no meio do nome desce inteira. Na primeira posição, não:
      // "De Acordo com a NBR" começa com preposição e ainda assim sobe.
      if (index > 0 && MINOR_WORDS.has(lower)) return lower

      // Só o caixa-alta gritado é rebaixado. Fora isso o miolo da palavra é
      // preservado como veio, para siglas e grafias como "kWh" não se perderem.
      return capitalize(isShouting(word) ? lower : word)
    })
    .join(' ')
