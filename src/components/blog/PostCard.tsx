import Link from 'next/link'

export type PostCardData = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  cover_image: string | null
  published_at: string | null
  created_at: string
  category: { name: string; slug: string } | null
}

export function PostCard({ title, slug, excerpt, cover_image, published_at, created_at, category }: PostCardData) {
  const href = `/blog/${slug}`
  const date = new Date(published_at ?? created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <article className="blog-card">
      <Link href={href} className="blog-card-img-link" tabIndex={-1} aria-hidden="true">
        <div className="blog-card-img-wrap">
          {cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover_image} alt={title} className="blog-card-img" />
          ) : (
            <div className="blog-card-img-placeholder" />
          )}
        </div>
      </Link>

      <div className="blog-card-body">
        {category && (
          <Link href={`/blog?category=${category.slug}`} className="blog-card-category">
            {category.name}
          </Link>
        )}

        <Link href={href}>
          <h2 className="blog-card-title">{title}</h2>
        </Link>

        {excerpt && <p className="blog-card-excerpt">{excerpt}</p>}

        <div className="blog-card-footer">
          <time className="blog-card-date">{date}</time>
          <Link href={href} className="blog-card-cta">
            Leia mais <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
        </div>
      </div>
    </article>
  )
}
