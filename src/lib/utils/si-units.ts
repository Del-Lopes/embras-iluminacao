// Grafia canônica dos símbolos de unidade, conforme o Sistema Internacional.
//
// O SI distingue maiúscula de minúscula: "N" é newton e "n" é o prefixo nano;
// "K" é kelvin e "k" é quilo. Sem normalizar, o mesmo dado entra no banco como
// "200 n", "200 N" e "200 newton", vira três presets e some da sugestão por
// falta de contagem. Aqui a forma escrita é corrigida antes de gravar.
//
// A lista é EXPLÍCITA de propósito. Corrigir por regra genérica (tipo "toda
// letra solta depois de número vira maiúscula") quebraria "cm", "mm", "kg" e
// "mol", que são minúsculos no próprio SI. Só o que está aqui é tocado; o
// resto passa intacto.
//
// Para estender, basta acrescentar a forma canônica: a chave de busca é ela
// mesma em minúscula.
const CANONICAL_UNITS = [
  // Base e derivadas mais comuns no domínio de iluminação.
  'A', // ampere
  'V', // volt
  'W', // watt
  'K', // kelvin
  'N', // newton
  'J', // joule
  'C', // coulomb
  'Hz', // hertz
  'Pa', // pascal
  'lm', // lúmen
  'lx', // lux
  'cd', // candela
  'mol',
  's',
  'm',
  'kg',
  'g',
  'rad',
  'sr',
  // Múltiplos e submúltiplos usados no dia a dia do catálogo.
  'mA',
  'kV',
  'mV',
  'kW',
  'kWh',
  'mW',
  'kHz',
  'MHz',
  'mm',
  'cm',
  'km',
  'mg',
  'mL',
  'L',
  'h',
  'min',
  // Compostas.
  'lm/W',
  'cd/m²',
  'W/m²',
  'V/m',
  '°C',
  'dB',
] as const

const BY_LOWER = new Map(CANONICAL_UNITS.map((u) => [u.toLowerCase(), u as string]))

// Símbolos de ângulo plano: a ÚNICA exceção do SI à regra do espaço. Grau,
// minuto e segundo de ângulo ficam colados ao número ("45°", "30′").
//
// Atenção ao caso que parece igual mas não é: °C (grau Celsius) NÃO entra
// aqui. A exceção vale só para ângulo plano, então a temperatura leva espaço
// normalmente ("25 °C"). Por isso °C está na lista canônica acima e ° está
// nesta.
const NO_SPACE_UNITS = ['°', '′', '″', "'", '"'] as const
const NO_SPACE_SET = new Set<string>(NO_SPACE_UNITS)

// Um "token de unidade" é o trecho que vem logo depois de um número, com ou
// sem espaço entre os dois: casa "220V", "200 n", "8000k", "45 °".
//
// Exige o número ANTES de propósito. Sem isso, "IP65" ou um rótulo como
// "Cor" entrariam na troca e virariam outra coisa.
const UNIT_AFTER_NUMBER = /(\d)(\s*)([a-zA-Zµ°Ω/²³′″'"]+)/g

// Aplica as duas regras do SI ao par número + unidade:
//
//   1. grafia canônica do símbolo ("200 n" -> "200 N")
//   2. exatamente um espaço entre valor e unidade ("220V" -> "220 V"),
//      exceto nos símbolos de ângulo plano, que ficam colados ("45 °" -> "45°")
//
// O que não for unidade reconhecida passa intacto: sem lista, não há como
// saber se um trecho de letras depois de um número é unidade ou parte do
// texto, e o palpite estragaria valores legítimos.
export const canonicalizeUnits = (value: string): string =>
  value.replace(UNIT_AFTER_NUMBER, (match, digit: string, _gap: string, unit: string) => {
    if (NO_SPACE_SET.has(unit)) return `${digit}${unit}`

    const canonical = BY_LOWER.get(unit.toLowerCase())
    return canonical ? `${digit} ${canonical}` : match
  })
