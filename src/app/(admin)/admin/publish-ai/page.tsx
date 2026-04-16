import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { AiPublishFlow } from '@/components/admin/ai-publish-flow'

export const metadata: Metadata = {
  title: 'Criar com IA',
  robots: { index: false, follow: false },
}

export default async function PublishAiPage() {
  const supabase = await createSupabaseServerClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name')

  return (
    <div className="editor-page">
      <div className="editor-header">
        <Link href="/admin/dashboard" className="editor-back">← Dashboard</Link>
        <h1 className="dashboard-title">Criar com IA</h1>
        <p className="dashboard-subtitle">Gere um post a partir de artigos recentes</p>
      </div>
      <AiPublishFlow categories={categories ?? []} />
    </div>
  )
}
