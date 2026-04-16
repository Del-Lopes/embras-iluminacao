// ============================================================
// embras-products.ts — Catálogo de produtos para geração de
// artigos de vendas automatizados.
//
// Usado pelo cron-runner para rotação produto × cidade.
// ============================================================

export const EMBRAS_PRODUCTS = [
  'Postes Decorativos',
  'Balizadores de Jardim',
  'Arandelas Externas',
  'Pendentes de Iluminação',
  'Embutidos de Solo',
  'Luminárias para Jardim',
  'Luminárias Externas LED',
  'Luminárias para Quadras Esportivas',
  'Luminárias para Estacionamento',
  'Luminárias para Piscinas',
  'Luminárias para Fachadas',
  'Luminárias para Calçadas',
  'Projetores Externos LED',
  'Postes de Iluminação Pública',
  'Luminárias Decorativas LED',
  'Arandelas para Muros',
  'Luminárias com Sensor de Presença',
  'Luminárias para Condomínios',
  'Luminárias para Praças Públicas',
  'Luminárias para Parques',
  'Luminárias para Garagem',
  'Postes para Condomínio',
  'Luminárias para Área de Lazer',
  'Luminárias para Entrada de Edifício',
  'Balizadores para Escada',
] as const

/**
 * Selects a product deterministically based on the date + slot,
 * ensuring variety across days and within the same daily run.
 */
export function pickProduct(dateStr: string, slot: number): string {
  // dateStr: 'YYYY-MM-DD' → numeric seed
  const seed = parseInt(dateStr.replace(/-/g, ''), 10)
  const idx = (seed + slot * 7) % EMBRAS_PRODUCTS.length
  return EMBRAS_PRODUCTS[idx]
}
