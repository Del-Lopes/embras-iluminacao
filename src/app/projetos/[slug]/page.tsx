import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { ProductGallery } from '@/components/catalog/ProductGallery'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import type { Project } from '@/lib/db/schema'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('projects')
    .select('name, description, cover_image')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!data) return { title: 'Projeto não encontrado' }

  return {
    title: data.name,
    description: data.description?.slice(0, 160) ?? undefined,
    openGraph: { images: data.cover_image ? [data.cover_image] : [] },
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

  return (
    <main className="product-detail-page min-h-screen bg-(--color-bg)">
      <Header variant="solid" />

      <article className="product-detail">
        <div className="product-detail-top">
          {/* Álbum de fotos */}
          <ProductGallery coverImage={project.cover_image} images={images} name={project.name} />

          {/* Info do projeto */}
          <div className="product-info">
            <div className="product-info-cat">
              <Link href="/projetos" className="product-info-category">
                Projetos
              </Link>
            </div>

            <h1 className="product-info-name">{project.name}</h1>
            {project.location && <p className="product-info-sku">{project.location}</p>}

            {project.description && (
              <div className="project-detail-text">
                {project.description
                  .split(/\n{2,}/)
                  .map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
              </div>
            )}

            <Link href="/projetos" className="project-detail-back">
              ← Ver todos os projetos
            </Link>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  )
}
