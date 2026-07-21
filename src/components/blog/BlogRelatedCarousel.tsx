'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PostCard, type PostCardData } from './PostCard'

// Controles (setas + dots) do carrossel de posts relacionados. O carrossel em si
// é um scroll-container CSS (definido em globals.css); aqui só adicionamos os
// controles, que aparecem apenas no tablet/mobile (<=1024), onde o layout vira
// carrossel. No desktop (grid de 4 colunas) os controles ficam ocultos via CSS.
export function BlogRelatedCarousel({ posts }: { posts: PostCardData[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(1)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const measure = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const firstChild = el.firstElementChild as HTMLElement | null
    const itemW = firstChild?.offsetWidth || el.clientWidth
    const perView = Math.max(1, Math.round(el.clientWidth / itemW))
    const total = Math.max(1, Math.ceil(posts.length / perView))
    setPages(total)
    setPage(Math.min(total - 1, Math.round(el.scrollLeft / el.clientWidth)))
    setAtStart(el.scrollLeft <= 2)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2)
  }, [posts.length])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    measure()
    const onScroll = () => measure()
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  const scrollByPage = (dir: number) => {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' })
  }

  const goToPage = (i: number) => {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <section className="blog-related">
      <div className="blog-related-inner">
        <div className="blog-related-head">
          <h2 className="blog-related-title">Posts Relacionados</h2>
          <div className="blog-related-controls">
            <button
              type="button"
              className="blog-related-arrow"
              onClick={() => scrollByPage(-1)}
              disabled={atStart}
              aria-label="Posts anteriores"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              className="blog-related-arrow"
              onClick={() => scrollByPage(1)}
              disabled={atEnd}
              aria-label="Próximos posts"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="blog-related-grid" ref={trackRef}>
          {posts.map((rp) => (
            <PostCard key={rp.id} {...rp} />
          ))}
        </div>

        <div className="blog-related-dots">
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              type="button"
              className={`blog-related-dot${i === page ? ' is-active' : ''}`}
              onClick={() => goToPage(i)}
              aria-label={`Ir para a página ${i + 1}`}
              aria-current={i === page}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
