import type { Metadata } from 'next'
import Link from 'next/link'
import { ProjectEditor } from '@/components/admin/project-editor'

export const metadata: Metadata = {
  title: 'Novo Projeto',
  robots: { index: false, follow: false },
}

export default function NewProjectPage() {
  return (
    <div className="editor-page">
      <div className="editor-header">
        <Link href="/admin/projects" className="editor-back">← Projetos</Link>
        <h1 className="dashboard-title">Novo Projeto</h1>
        <p className="dashboard-subtitle">Cadastre um projeto do portfólio</p>
      </div>

      <ProjectEditor />
    </div>
  )
}
