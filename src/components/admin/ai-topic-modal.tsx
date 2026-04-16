'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { fetchNewsAction, generatePostAction } from '@/server/ai-publish.actions'
import { AiGenerationLoader } from '@/components/admin/ai-generation-loader'
import type { NewsArticle } from '@/lib/ai/news-curation'
import type { Category } from '@/lib/db/schema'

type Step = 'closed' | 'search' | 'articles' | 'generating'

type Props = {
  categories: Pick<Category, 'id' | 'name'>[]
}

export function AiTopicModal({ categories }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('closed')
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id ?? '')
  const [generationDone, setGenerationDone] = useState(false)
  const [isFetching, startFetchTransition] = useTransition()
  const [isGenerating, startGenerateTransition] = useTransition()
  const topicRef = useRef<HTMLInputElement>(null)

  const open = () => {
    setStep('search')
    setError(null)
    setArticles([])
  }

  const close = () => {
    setStep('closed')
    setError(null)
    setArticles([])
    setGenerationDone(false)
  }

  const handleSearch = () => {
    const topic = topicRef.current?.value.trim() ?? ''
    if (!topic) {
      setError('Informe um tópico')
      return
    }
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
    if (!selectedCategoryId) {
      setError('Selecione uma categoria')
      return
    }
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
        setTimeout(() => {
          router.push(`/admin/posts/${result.postId}/edit`)
        }, 800)
      }
    })
  }

  const formatDate = (iso: string) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (step === 'closed') {
    return (
      <button type="button" className="action-btn action-btn--ai" onClick={open}>
        ✦ Criar com IA
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={step !== 'generating' ? close : undefined} />

      {/* Modal */}
      <div className="ai-modal" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="ai-modal-header">
          <div>
            <h2 className="ai-modal-title">Criar Post com IA</h2>
            {step === 'search' && (
              <p className="ai-modal-subtitle">Busque artigos como base para geração</p>
            )}
            {step === 'articles' && (
              <p className="ai-modal-subtitle">Selecione um artigo para gerar o post</p>
            )}
          </div>
          {step !== 'generating' && (
            <button type="button" className="ai-modal-close" onClick={close} aria-label="Fechar">
              ✕
            </button>
          )}
        </div>

        {/* Error */}
        {error && <div className="ai-modal-error">{error}</div>}

        {/* Step: search */}
        {step === 'search' && (
          <div className="ai-modal-body">
            <label htmlFor="ai-topic" className="ai-label">
              Tópico ou palavra-chave
            </label>
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
              {['Iluminação', 'Arquitetura', 'Design de Interiores', 'Tendências'].map(
                (s) => (
                  <button
                    key={s}
                    type="button"
                    className="ai-tag"
                    onClick={() => {
                      if (topicRef.current) topicRef.current.value = s
                    }}
                  >
                    {s}
                  </button>
                )
              )}
            </div>
            <div className="ai-modal-footer">
              <button type="button" className="btn-secondary" onClick={close}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSearch}
                disabled={isFetching}
              >
                {isFetching ? 'Buscando...' : 'Buscar artigos'}
              </button>
            </div>
          </div>
        )}

        {/* Step: articles */}
        {step === 'articles' && (
          <div className="ai-modal-body">
            {/* Category selector */}
            <div className="ai-category-row">
              <label htmlFor="ai-category" className="ai-label">
                Categoria do post
              </label>
              <select
                id="ai-category"
                className="ai-select"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Article list */}
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

            <div className="ai-modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setStep('search')}>
                ← Voltar
              </button>
            </div>
          </div>
        )}

        {/* Step: generating */}
        {step === 'generating' && (
          <div className="ai-modal-body">
            <AiGenerationLoader done={generationDone} />
          </div>
        )}
      </div>
    </>
  )
}
