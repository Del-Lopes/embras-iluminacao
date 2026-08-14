import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { ProjectEditor } from '@/components/admin/project-editor'
import type { GalleryImage } from '@/components/admin/product-image-gallery'
import type { Project } from '@/lib/db/schema'

export const metadata: Metadata = {
  title: 'Editar Projeto',
  robots: { index: false, follow: false },
}

type Props = { params: Promise<{ id: string }> }

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const [{ data: project }, { data: imgData }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase
      .from('project_images')
      .select('url, alt, sort_order')
      .eq('project_id', id)
      .order('sort_order'),
  ])

  if (!project) notFound()

  const projectImages: GalleryImage[] = (imgData ?? []).map((i) => ({
    url: i.url,
    alt: i.alt ?? '',
  }))

  return (
    <div className="editor-page">
      <div className="editor-header">
        <Link href="/admin/projects" className="editor-back">← Projetos</Link>
        <h1 className="dashboard-title">Editar Projeto</h1>
        <p className="dashboard-subtitle">{project.name}</p>
      </div>

      <ProjectEditor project={project as Project} projectImages={projectImages} />
    </div>
  )
}
