import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { PostEditor } from '@/components/admin/post-editor'

export const metadata: Metadata = {
  title: 'Novo Post',
  robots: { index: false, follow: false },
}

export default async function NewPostPage() {
  const supabase = await createSupabaseServerClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name')

  return (
    <div className="editor-page">
      <header className="editor-header">
        <div>
          <Link href="/admin/dashboard" className="editor-back">
            ← Dashboard
          </Link>
          <h1 className="dashboard-title">Novo Post</h1>
        </div>
      </header>

      <PostEditor categories={categories ?? []} />
    </div>
  )
}
