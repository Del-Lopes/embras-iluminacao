import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { requireUser } from '@/lib/auth/guards'
import { CategoriesManager } from '@/components/admin/categories-manager'

export const metadata: Metadata = {
  title: 'Categorias',
  robots: { index: false, follow: false },
}

export default async function CategoriesPage() {
  const session = await requireUser()
  const supabase = await createSupabaseServerClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, description, created_by, created_at')
    .order('name')

  return (
    <div className="editor-page">
      <div className="editor-header">
        <Link href="/admin/dashboard" className="editor-back">← Dashboard</Link>
        <h1 className="dashboard-title">Categorias</h1>
        <p className="dashboard-subtitle">Gerencie as categorias dos posts</p>
      </div>

      <CategoriesManager
        categories={categories ?? []}
        currentUserId={session.id}
        currentUserRole={session.role}
      />
    </div>
  )
}
