// ============================================================
// product-seo-generator.ts — Geração de SEO de produto por IA
//
// Gera seo_title / seo_description / seo_keywords a partir dos dados
// do produto (nome, descrição, categorias, área de uso). Mesma abordagem
// do blog: cascade de modelos Google + parse JSON robusto + Zod.
//
// Faz até 2 tentativas de IA. Se ambas falharem, cai para uma geração
// DETERMINÍSTICA (sem IA), garantindo que o SEO sempre seja preenchido.
// ============================================================

import { gemini, gemma } from '@/lib/ai/google-ai-client'
import { z } from 'zod'

export type ProductSeoInput = {
  name: string
  description?: string | null // HTML ou texto puro
  categories?: string[]
  environment?: string
}

export type ProductSeo = {
  seo_title: string
  seo_description: string
  seo_keywords: string[]
}

export type ProductSeoResult = ProductSeo & { source: 'ai' | 'fallback' }

const SeoSchema = z.object({
  seo_title: z.string().min(1),
  seo_description: z.string().min(1),
  seo_keywords: z.array(z.string()).min(1),
})

// ----------------------------------------------------------------
// Fallback determinístico — usado quando a IA falha nas 2 tentativas.
// ----------------------------------------------------------------
export const deterministicProductSeo = (input: ProductSeoInput): ProductSeo => {
  const name = input.name.trim()
  const plain = (input.description ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const words = Array.from(
    new Set(
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 2)
    )
  )

  return {
    seo_title: name.slice(0, 60),
    seo_description: (plain || name).slice(0, 155),
    seo_keywords: words.slice(0, 8),
  }
}

// ----------------------------------------------------------------
// Prompt
// ----------------------------------------------------------------
const SYSTEM_PROMPT = `Você é um especialista em SEO para um catálogo de produtos de iluminação (Embras Iluminação, mercado brasileiro).
A partir dos dados de um produto, gere metadados de SEO em português do Brasil.
Retorne APENAS um objeto JSON válido — sem markdown, sem texto extra, sem blocos de código.

REGRAS:
- seo_title: máx. 60 caracteres, inclui o nome do produto e, quando fizer sentido, a categoria.
- seo_description: máx. 155 caracteres, descritiva e com intenção de busca; sem repetir o título literalmente.
- seo_keywords: 4 a 8 termos de busca relevantes (minúsculas, sem repetição), incluindo variações do nome/categoria e a área de uso quando aplicável.
- Não invente características, medidas, certificações ou preços que não estejam nos dados.
- Não use aspas duplas dentro dos valores de texto.

Retorne JSON com exatamente estes campos:
{
  "seo_title": "string",
  "seo_description": "string",
  "seo_keywords": ["k1", "k2", "k3", "k4"]
}`

const buildUserPrompt = (input: ProductSeoInput): string => {
  const plain = (input.description ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 800)
  const env =
    input.environment === 'interno' ? 'Área interna' : input.environment === 'externo' ? 'Área externa' : ''
  return [
    `nome: ${input.name}`,
    input.categories?.length ? `categorias: ${input.categories.join(', ')}` : '',
    env ? `área de uso: ${env}` : '',
    plain ? `descrição: ${plain}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

// ----------------------------------------------------------------
// Parse JSON robusto (mesmo com texto ao redor / markdown)
// ----------------------------------------------------------------
const parseJSON = (raw: string): unknown => {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    return JSON.parse(stripped)
  } catch {
    const match = stripped.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Nenhum JSON encontrado na resposta')
  }
}

const clamp = (seo: ProductSeo): ProductSeo => ({
  seo_title: seo.seo_title.trim().slice(0, 60),
  seo_description: seo.seo_description.trim().slice(0, 160),
  seo_keywords: seo.seo_keywords.map((k) => k.trim().toLowerCase()).filter(Boolean).slice(0, 8),
})

// ----------------------------------------------------------------
// Geração — 2 tentativas de IA, senão fallback determinístico
// ----------------------------------------------------------------
const ATTEMPTS: Array<{ client: typeof gemini; name: string }> = [
  { client: gemini, name: 'gemini-flash-lite' },
  { client: gemma, name: 'gemma-3-27b' },
]

export const generateProductSeo = async (
  input: ProductSeoInput
): Promise<ProductSeoResult> => {
  const userPrompt = buildUserPrompt(input)

  for (const { client, name } of ATTEMPTS) {
    try {
      const result = await client.generateContent({
        systemInstruction: SYSTEM_PROMPT,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      })
      const parsed = SeoSchema.safeParse(parseJSON(result.response.text()))
      if (parsed.success) {
        console.info(`[product-seo-generator] SEO gerado por IA | modelo: ${name}`)
        return { ...clamp(parsed.data), source: 'ai' }
      }
      console.warn(`[product-seo-generator] schema inválido (${name}): ${parsed.error.message}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[product-seo-generator] falha no modelo ${name}: ${msg}`)
    }
  }

  console.warn('[product-seo-generator] IA falhou nas 2 tentativas — usando fallback determinístico')
  return { ...deterministicProductSeo(input), source: 'fallback' }
}
