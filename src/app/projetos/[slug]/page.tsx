import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { ProductGallery } from '@/components/catalog/ProductGallery'
import { EditorJsContent } from '@/components/blog/EditorJsContent'
import { formatProjectDate } from '@/lib/utils/project-date'
import { findAdjacentSlugs } from '@/lib/utils/adjacent'
import { AdjacentNav } from '@/components/common/AdjacentNav'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import type { Project } from '@/lib/db/schema'
import { absoluteUrl } from '@/config/seo'
import { BreadcrumbSchema } from '@/components/seo/StructuredData'

type Props = { params: Promise<{ slug: string }> }

const stripTags = (html: string | null | undefined) =>
  (html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('projects')
    .select('name, description, cover_image')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!data) return { title: 'Projeto não encontrado', robots: { index: false, follow: false } }

  const url = absoluteUrl(`/projetos/${slug}`)
  const titulo = `${data.name} | Projeto de Iluminação`
  // O texto vem do editor rico: sem tirar as tags, a meta description sairia
  // como "<p>Uma resid…" e gastaria os 160 caracteres com marcação.
  const descricao =
    stripTags(data.description)?.slice(0, 160) ||
    `Projeto de iluminação executado com produtos Embras: ${data.name}.`

  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: url },
    openGraph: {
      title: titulo,
      description: descricao,
      url,
      type: 'article',
      images: data.cover_image ? [data.cover_image] : [],
    },
  }
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  const project = data as Project | null
  if (!project) notFound()

  const { data: imgData } = await supabase
    .from('project_images')
    .select('url, alt, sort_order')
    .eq('project_id', project.id)
    .order('sort_order')

  const images = (imgData ?? []).map((i) => ({ url: i.url, alt: i.alt ?? '' }))

  // Vizinhos na mesma ordem padrão da listagem (/projetos): data do projeto
  // decrescente, com os sem data no fim, e publicação como desempate.
  const { data: orderData } = await supabase
    .from('projects')
    .select('slug')
    .eq('status', 'published')
    .order('project_date', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false })
  const { prev, next } = findAdjacentSlugs(
    (orderData ?? []).map((r) => r.slug as string),
    project.slug
  )

  return (
    // project-detail-page: mesma casca do produto, com a escala vertical
    // própria (128px). A classe extra evita mexer no padding do catálogo.
    <main className="product-detail-page project-detail-page min-h-screen bg-(--color-bg)">
      <Header variant="solid" />

      <BreadcrumbSchema
        items={[
          { name: 'Início', path: '/' },
          { name: 'Projetos', path: '/projetos' },
          { name: project.name, path: `/projetos/${project.slug}` },
        ]}
      />

      <article className="product-detail">
        {/* Navegação entre projetos: container próprio acima do conteúdo, para
            não empurrar a galeria e desalinhá-la do texto ao lado. */}
        <AdjacentNav prevHref={prev ? `/projetos/${prev}` : null} nextHref={next ? `/projetos/${next}` : null} />

        <div className="product-detail-top">
          {/* Álbum de fotos */}
          <ProductGallery coverImage={project.cover_image} images={images} name={project.name} />

          {/* Info do projeto */}
          <div className="product-info">
            {/* No lugar do rótulo fixo "Projetos": a cidade, que leva à
                listagem já filtrada por ela. */}
            {project.location && (
              <div className="product-info-cat">
                <Link
                  href={`/projetos?location=${encodeURIComponent(project.location)}`}
                  className="product-info-category"
                >
                  {project.location}
                </Link>
              </div>
            )}

            <h1 className="product-info-name">{project.name}</h1>
            {project.project_date && (
              <p className="product-info-sku">{formatProjectDate(project.project_date)}</p>
            )}

            {/* Divisor no mesmo tom das divisórias da home. */}
            <hr className="project-detail-rule" />

            {/* O campo passou a ser texto rico. Projetos salvos antes disso
                guardam texto puro, que renderizado como HTML viraria um bloco
                único sem parágrafos: quando não há marcação, mantém a quebra
                por linha em branco. */}
            {stripTags(project.description) && (
              <div className="project-detail-text">
                {/<[a-z][\s\S]*>/i.test(project.description ?? '') ? (
                  <EditorJsContent content={project.description!} />
                ) : (
                  project.description!.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)
                )}
              </div>
            )}
          </div>
        </div>
      </article>

      <Footer />
    </main>
  )
}
