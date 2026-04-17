// ============================================================
// embras-closing.ts — Parágrafo de fechamento SEO da Embras
//
// A IA analisa o contexto real do artigo e escreve um texto único.
// Guardrails determinísticos evitam alucinação:
//   1. Categoria detectada por keywords (sem IA)
//   2. URL real fornecida ao modelo no prompt — não gerada por ele
//   3. Fatos da empresa fixos no prompt — nada inventado
//   4. Pós-processamento garante que a URL correta esteja no output
//   5. Fallback para templates fixos se a IA falhar ou exceder timeout
// ============================================================

import { gemini, gemma } from '@/lib/ai/google-ai-client'

const BASE_URL = 'https://www.embrasiluminacao.com.br'

type CategoryKey = 'postes' | 'pendentes' | 'arandelas' | 'balizadores' | 'linha-publica'

const CATEGORY_URLS: Record<CategoryKey, string> = {
  postes: `${BASE_URL}/categoria-produto/postes/`,
  pendentes: `${BASE_URL}/categoria-produto/pendentes/`,
  arandelas: `${BASE_URL}/categoria-produto/arandelas/`,
  balizadores: `${BASE_URL}/categoria-produto/balizadores-de-jardim/`,
  'linha-publica': `${BASE_URL}/categoria-produto/linha-publica/`,
}

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  postes: 'Postes e Iluminação Pública',
  pendentes: 'Pendentes Decorativos',
  arandelas: 'Arandelas',
  balizadores: 'Balizadores de Jardim',
  'linha-publica': 'Luminárias Públicas LED',
}

// Ordem importa — primeira correspondência vence
const DETECTION_RULES: Array<{ category: CategoryKey; keywords: string[] }> = [
  {
    category: 'balizadores',
    keywords: [
      'jardim', 'paisagismo', 'gramado', 'area externa', 'arvore', 'quintal',
      'terraco', 'ao ar livre', 'paisagem', 'garden',
    ],
  },
  {
    category: 'linha-publica',
    keywords: [
      'led', 'tecnologia', 'eficiencia', 'eficiente', 'sustentavel',
      'sustentabilidade', 'economia de energia', 'inovacao', 'smart',
      'inteligente', 'consumo energetico', 'energia eletrica',
    ],
  },
  {
    category: 'arandelas',
    keywords: ['fachada', 'condominio', 'edificio', 'parede'],
  },
  {
    category: 'pendentes',
    keywords: [
      'decoracao', 'design de interiores', 'restaurante', 'hotel', 'interior',
      'interiores', 'pendente', 'ambiente', 'arquitetura de interiores',
    ],
  },
  {
    category: 'postes',
    keywords: [
      'praca', 'urbano', 'urbana', 'rua', 'avenida', 'prefeitura', 'publico',
      'publica', 'viario', 'cidade', 'parque', 'poste', 'municipal',
    ],
  },
]

// Fallback — usado apenas se a IA falhar ou exceder timeout
const FALLBACKS: Record<CategoryKey, (url: string) => string> = {
  postes: (url) =>
    `A escolha dos postes certos é um dos fatores que mais influencia a segurança e a identidade visual de espaços urbanos. A Embras Iluminação fabrica <a href="${url}">postes decorativos e de iluminação pública em alumínio</a> com tecnologia LED, atendendo projetos de diferentes escalas em todo o Brasil.`,
  pendentes: (url) =>
    `A iluminação define o clima de um ambiente antes mesmo que qualquer detalhe decorativo seja percebido. Para quem projeta interiores com atenção ao acabamento, a linha de <a href="${url}">pendentes decorativos em alumínio da Embras</a> oferece modelos variados, fabricados no Brasil com produção própria desde 2012.`,
  arandelas: (url) =>
    `A iluminação de fachadas exige produtos que combinem resistência e acabamento adequado ao projeto. Para esse uso, a Embras Iluminação fabrica <a href="${url}">arandelas decorativas em alumínio</a> com modelos para diferentes estilos, distribuídas para todo o Brasil.`,
  balizadores: (url) =>
    `A iluminação de áreas externas define como o espaço é percebido à noite. Para projetos de jardim e paisagismo, a Embras Iluminação oferece <a href="${url}">balizadores decorativos em alumínio</a> com fabricação própria e distribuição nacional.`,
  'linha-publica': (url) =>
    `A tecnologia LED transformou os parâmetros de eficiência na iluminação pública. A Embras Iluminação desenvolve <a href="${url}">luminárias públicas em LED</a> para projetos em vias, avenidas e obras municipais, com atendimento para todo o Brasil.`,
}

// Remove acentos para comparação de keywords
const normalize = (text: string): string =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const detectCategory = (text: string): CategoryKey => {
  const normalized = normalize(text)
  for (const rule of DETECTION_RULES) {
    if (rule.keywords.some((kw) => normalized.includes(normalize(kw)))) {
      return rule.category
    }
  }
  return 'postes'
}

// Garante que a URL correta esteja no output — substitui qualquer href errado
const enforceUrl = (html: string, correctUrl: string): string => {
  // Se a URL correta já está presente, nada a fazer
  if (html.includes(correctUrl)) return html

  // Substitui o href de qualquer <a> existente pelo correto
  const withFixedHref = html.replace(/href="[^"]*"/g, `href="${correctUrl}"`)
  if (withFixedHref !== html) return withFixedHref

  // Nenhuma âncora encontrada — appenda um link de segurança
  return html.replace(
    /<\/p>$/,
    ` Conheça a <a href="${correctUrl}">linha de produtos da Embras Iluminação</a>.</p>`,
  )
}

const buildPrompt = (
  articleTitle: string,
  articleExcerpt: string,
  categoryLabel: string,
  categoryUrl: string,
): string =>
  `Você é um redator especialista em SEO para o setor de iluminação. Escreva um parágrafo de fechamento para o artigo abaixo, conectando o tema com a Embras Iluminação.

ARTIGO
Título: ${articleTitle}
Resumo: ${articleExcerpt}

DADOS REAIS DA EMPRESA (use apenas estes — não invente nada)
- Nome: Embras Iluminação
- Fundada em 2012, sede em São Paulo
- Fabricante brasileira com produção própria de luminárias em alumínio
- Tecnologia LED em toda a linha
- Distribui para todo o Brasil
- Categoria relevante para este artigo: ${categoryLabel}
- URL da categoria (use exatamente esta): ${categoryUrl}

REGRAS
1. Conecte ao tema real do artigo — não escreva algo genérico
2. Apresente a Embras de forma natural, sem parecer anúncio
3. Insira exatamente 1 link HTML usando href="${categoryUrl}" com âncora descritiva
4. Nunca escreva "clique aqui" como âncora
5. Máximo 120 palavras
6. No máximo 2 menções ao nome "Embras"
7. Não use: "líder", "melhor do mercado", superlativos ou frases genéricas
8. Não invente produtos, modelos ou dados que não estão acima
9. Retorne APENAS o parágrafo em HTML, sem explicações ou markdown

Formato do link: <a href="${categoryUrl}">texto da âncora</a>`.trim()

// ----------------------------------------------------------------
// Helpers internos
// ----------------------------------------------------------------
const tryModel = async (
  model: typeof gemini,
  prompt: string,
  url: string,
  timeoutMs = 8_000,
): Promise<string> => {
  const result = await Promise.race([
    model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('embras-closing timeout')), timeoutMs),
    ),
  ])

  const raw = result.response.text().trim()
  const cleaned = raw.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const wrapped = cleaned.startsWith('<p') ? cleaned : `<p class="embras-closing">${cleaned}</p>`
  return enforceUrl(wrapped, url)
}

// ----------------------------------------------------------------
// Ponto de entrada público
// ----------------------------------------------------------------
export const generateEmbrasClosing = async (
  title: string,
  excerpt: string,
  sourceDescription: string,
): Promise<string> => {
  const combined = `${title} ${excerpt} ${sourceDescription}`
  const category = detectCategory(combined)
  const url = CATEGORY_URLS[category]
  const label = CATEGORY_LABELS[category]
  const prompt = buildPrompt(title, `${excerpt} ${sourceDescription}`.slice(0, 500), label, url)

  // 1ª tentativa — Gemini Flash Lite (conta 1)
  try {
    const text = await tryModel(gemini, prompt, url)
    console.info('[embras-closing] gemini gerou texto | categoria:', category)
    return text
  } catch (err) {
    console.warn('[embras-closing] gemini falhou, tentando gemma |', (err as Error).message)
  }

  // 2ª tentativa — Gemma 3 27B (conta 1)
  try {
    const text = await tryModel(gemma, prompt, url)
    console.info('[embras-closing] gemma gerou texto | categoria:', category)
    return text
  } catch (err) {
    console.warn('[embras-closing] gemma falhou, usando template |', (err as Error).message)
  }

  // Template fixo
  return `<p class="embras-closing">${FALLBACKS[category](url)}</p>`
}
