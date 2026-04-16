// ============================================================
// sales-post-generator.ts — Geração de artigos de vendas SEO
//
// Recebe produto + cidade e gera página SEO comercial única.
// Cascade de modelos (igual ao general density):
//   1. Gemini Flash Lite  (GOOGLE_AI_API_KEY)
//   2. Gemma 3 27B        (GOOGLE_AI_API_KEY)
//   3. Gemma 4 31B        (GOOGLE_AI_API_KEY)
//
// Guardrails:
//   - Dados da empresa fixos no prompt (sem alucinação)
//   - CTA com contatos reais obrigatórios
//   - Mínimo 400 palavras de conteúdo útil
//   - Variação de estrutura e abertura por produto/cidade
// ============================================================

import { gemini, gemma, gemma4 } from '@/lib/ai/google-ai-client'
import { z } from 'zod'

const SalesPostSchema = z.object({
  title: z.string(),
  slug: z.string(),
  content: z.string().min(100),
  excerpt: z.string(),
  seo_title: z.string(),
  seo_description: z.string(),
  seo_keywords: z.array(z.string()),
})

export type GeneratedSalesPost = z.infer<typeof SalesPostSchema> & { model_used: string }

// ----------------------------------------------------------------
// Sistema de geração — Manual de conteúdo embutido como prompt
// ----------------------------------------------------------------
const SYSTEM_PROMPT = `Você é um redator especialista em SEO comercial para o setor de iluminação no mercado brasileiro.
Sua função é criar páginas de venda otimizadas para buscas locais do tipo "[produto] + [cidade]".
Retorne APENAS um objeto JSON válido — sem markdown, sem texto extra, sem blocos de código.

DADOS REAIS DA EMPRESA (use SOMENTE estes — não invente nada):
- Nome: Embras Iluminação
- Fundada: 2012
- Sede: Grande São Paulo, SP
- Especialidade: fabricante e distribuidora de luminárias LED decorativas e de iluminação pública
- Fabrica: postes, balizadores, arandelas, pendentes, embutidos de solo, luminárias externas
- Telefone: (11) 3605-1589
- WhatsApp: 11-94746-7797
- E-mail: vendas@embrasiluminacao.com.br; projetos@embrasiluminacao.com.br
- Loja online: https://www.embrasiluminacao.com.br/loja/

OBJETIVO DA PÁGINA:
Capturar tráfego orgânico com intenção de compra e converter em lead (orçamento ou contato direto).

ESTRUTURA DO CONTEÚDO (flexível — a ordem das seções pode variar):
1. Abertura: responde à intenção de busca; menciona produto + cidade no 1º parágrafo
2. Sobre o produto: características técnicas, aplicações, vantagens específicas
3. Por que a Embras: diferenciais reais para este produto (sem superlativo vazio)
4. Produtos relacionados: lista de 4 a 6 itens relevantes ao tipo pedido (não listar tudo)
5. Contexto local: breve menção ao estado/região/aplicação comum naquela cidade
6. CTA: dados de contato reais + chamada para orçamento

VARIAÇÕES DE H1/TÍTULO (escolha o mais natural para o produto + cidade):
- "Fabricante de [produto] em [cidade]"
- "Fornecedor de [produto] [cidade]"
- "Onde Comprar [produto] em [cidade]"
- "[produto] para [cidade] — Embras Iluminação"
- "Comprar [produto] em [cidade]"
- "[produto] [cidade]: Fabricante com Distribuição Nacional"

REGRAS DE SEO:
- Keyword principal (produto + cidade) deve aparecer 3 a 5 vezes no total
- Nunca repetir a keyword mais de 2 vezes no mesmo parágrafo
- Usar variações: sinônimos, plural/singular, ordem invertida
- O H1 deve conter produto + cidade de forma natural

REGRAS DE CONTEÚDO (anti-repetição):
- Nunca copiar as seções genéricas "Confiança / Versatilidade / Eficiência / Inovação" literalmente
- Não listar 50+ produtos — apenas os 4 a 6 mais relevantes ao produto pedido
- Mínimo de 400 palavras de conteúdo útil
- Variar a abertura: não começar sempre com "A Embras Iluminação"
- Variar expressões: "fabricamos", "produzimos", "desenvolvemos", "nossa linha inclui"

REGRAS DE CTA (obrigatórias — sem exceção):
- Incluir SEMPRE: (11) 3605-1589 e WhatsApp 11-94746-7797
- Mencionar lista de orçamento ou solicitação de orçamento
- E-mail: vendas@embrasiluminacao.com.br
- Não criar links fictícios de páginas que não existem

REGRAS ANTI-ALUCINAÇÃO:
- Não inventar estatísticas, certificações, prêmios ou parceiros
- Não citar modelos de produto por número/código não fornecido
- Não mencionar outras cidades além da pedida
- Se não souber algo específico da cidade, usar apenas: estado, "interior paulista", "região metropolitana", "polo industrial" etc.

FORMATO DE SAÍDA:
HTML semântico limpo. Use:
- <h1> para o título principal
- <h2> para seções
- <p> para parágrafos
- <ul><li> para listas
- <strong> para ênfase em palavras-chave
- NÃO use classes CSS, <html>, <head>, <body>, <script>, <style>, <iframe>
- NÃO use markdown

Retorne JSON com exatamente estes campos:
{
  "title": "string (mesmo que o conteúdo do H1, máx 100 chars)",
  "slug": "string (kebab-case sem acentos, baseado em produto e cidade)",
  "content": "string (HTML completo com h1, seções e CTA)",
  "excerpt": "string (máx 160 chars — resume a intenção comercial)",
  "seo_title": "string (máx 60 chars — keyword principal)",
  "seo_description": "string (máx 160 chars — intenção comercial + chamada para ação)",
  "seo_keywords": ["keyword-1", "keyword-2", "keyword-3", "keyword-4"]
}`

const buildUserPrompt = (product: string, city: string): string =>
  `produto: ${product}\ncidade: ${city}`

// ----------------------------------------------------------------
// Parsing robusto — extrai JSON mesmo com texto ao redor
// ----------------------------------------------------------------
const parseJSON = (raw: string): unknown => {
  const trimmed = raw.trim()

  // Remove blocos de markdown (```json ... ```)
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  // Tenta parse direto
  try {
    return JSON.parse(stripped)
  } catch {
    // Extrai o primeiro objeto JSON encontrado no texto
    const match = stripped.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Nenhum JSON encontrado na resposta')
  }
}

// ----------------------------------------------------------------
// Cascade de modelos
// ----------------------------------------------------------------
type ModelClient = typeof gemini

const MODELS: Array<{ client: ModelClient; name: string }> = [
  { client: gemini, name: 'gemini-flash-lite' },
  { client: gemma, name: 'gemma-3-27b' },
  { client: gemma4, name: 'gemma-4-31b' },
]

export const generateSalesPostContent = async (
  product: string,
  city: string,
): Promise<GeneratedSalesPost> => {
  const userPrompt = buildUserPrompt(product, city)
  const errors: string[] = []

  for (const { client, name } of MODELS) {
    try {
      const result = await client.generateContent({
        systemInstruction: SYSTEM_PROMPT,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      })

      const raw = result.response.text()
      const parsed = SalesPostSchema.safeParse(parseJSON(raw))

      if (!parsed.success) {
        errors.push(`[${name}] schema inválido: ${parsed.error.message}`)
        continue
      }

      console.info(`[sales-post-generator] conteúdo gerado | modelo: ${name} | produto: ${product} | cidade: ${city}`)
      return { ...parsed.data, model_used: name }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`[${name}] ${msg}`)
      console.warn(`[sales-post-generator] falha no modelo ${name}: ${msg}`)
    }
  }

  throw new Error(
    `Todos os modelos falharam ao gerar o artigo de vendas:\n${errors.join('\n')}`,
  )
}
