'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { fetchNewsAction, generatePostAction } from '@/server/ai-publish.actions'
import { AiGenerationLoader } from '@/components/admin/ai-generation-loader'
import type { NewsArticle } from '@/lib/ai/news-curation'
import type { Category } from '@/lib/db/schema'

type Step = 'search' | 'articles' | 'generating'

type Props = {
  categories: Pick<Category, 'id' | 'name'>[]
}

export function AiPublishFlow({ categories }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('search')
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id ?? '')
  const [generationDone, setGenerationDone] = useState(false)
  const [isFetching, startFetchTransition] = useTransition()
  const [isGenerating, startGenerateTransition] = useTransition()
  const topicRef = useRef<HTMLInputElement>(null)

  const handleSearch = () => {
    const topic = topicRef.current?.value.trim() ?? ''
    if (!topic) { setError('Informe um tópico'); return }
    setError(null)
    const fd = new FormData()
    fd.set('topic', topic)
    startFetchTransition(async () => {
      const result = await fetchNewsAction(fd)
      if ('error' in result) {
        setError(result.error)
      } else {
        setArticles(result.articles)
        setStep('articles')
      }
    })
  }

  const handleGenerate = (article: NewsArticle) => {
    if (!selectedCategoryId) { setError('Selecione uma categoria'); return }
    setError(null)
    setGenerationDone(false)
    setStep('generating')
    const fd = new FormData()
    fd.set('title', article.title)
    fd.set('url', article.url)
    fd.set('description', article.description)
    fd.set('category_id', selectedCategoryId)
    fd.set('density', article.density ?? 'general')
    startGenerateTransition(async () => {
      const result = await generatePostAction(fd)
      if ('error' in result) {
        setStep('articles')
        setError(result.error)
      } else {
        setGenerationDone(true)
        setTimeout(() => router.push(`/admin/posts/${result.postId}/edit`), 800)
      }
    })
  }

  const formatDate = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

  return (
    <div className="ai-flow">
      {error && <div className="ai-modal-error">{error}</div>}

      {/* Step: search */}
      {step === 'search' && (
        <div className="ai-flow-section">
          <label htmlFor="ai-topic" className="ai-label">Tópico ou palavra-chave</label>
          <input
            id="ai-topic"
            ref={topicRef}
            type="text"
            className="ai-input"
            placeholder="Ex: iluminação LED, projetos de iluminação, design de interiores"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            autoFocus
          />
          <div className="ai-suggested">
            {['Iluminação', 'Arquitetura', 'Design de Interiores', 'Tendências'].map((s) => (
              <button
                key={s}
                type="button"
                className="ai-tag"
                onClick={() => { if (topicRef.current) topicRef.current.value = s }}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="ai-flow-actions">
            <button type="button" className="btn-primary" onClick={handleSearch} disabled={isFetching}>
              {isFetching ? 'Buscando...' : 'Buscar artigos'}
            </button>
          </div>
        </div>
      )}

      {/* Step: articles */}
      {step === 'articles' && (
        <div className="ai-flow-section">
          <div className="ai-category-row">
            <label htmlFor="ai-category" className="ai-label">Categoria do post</label>
            <select
              id="ai-category"
              className="ai-select"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <ul className="ai-article-list">
            {articles.map((article) => (
              <li key={article.url} className="ai-article-item">
                <div className="ai-article-meta">
                  <span className="ai-article-source">{article.source}</span>
                  <span className="ai-article-date">{formatDate(article.publishedAt)}</span>
                </div>
                <p className="ai-article-title">{article.title}</p>
                {article.description && (
                  <p className="ai-article-desc">{article.description.slice(0, 150)}...</p>
                )}
                <button
                  type="button"
                  className="ai-article-btn"
                  onClick={() => handleGenerate(article)}
                  disabled={isGenerating}
                >
                  Gerar com IA →
                </button>
              </li>
            ))}
          </ul>
          <div className="ai-flow-actions">
            <button type="button" className="btn-secondary" onClick={() => setStep('search')}>
              ← Voltar
            </button>
          </div>
        </div>
      )}

      {/* Step: generating */}
      {step === 'generating' && <AiGenerationLoader done={generationDone} />}
    </div>
  )
}
