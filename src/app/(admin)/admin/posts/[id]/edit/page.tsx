import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { PostEditor } from '@/components/admin/post-editor'
import type { Post } from '@/lib/db/schema'

export const metadata: Metadata = {
  title: 'Editar Post',
  robots: { index: false, follow: false },
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function EditPostPage({ params }: Props) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const [
    { data: { user } },
    { data: post },
    { data: categories },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('posts').select('*').eq('id', id).single(),
    supabase.from('categories').select('id, name').order('name'),
  ])

  if (!post) notFound()
  if (!user) redirect('/admin/login')

  // Editors can only edit their own posts
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'editor' && post.author_id !== user.id) {
    redirect('/admin/dashboard')
  }

  return (
    <div className="editor-page">
      <header className="editor-header">
        <div>
          <Link href="/admin/dashboard" className="editor-back">
            ← Dashboard
          </Link>
          <h1 className="dashboard-title">Editar Post</h1>
          <p className="dashboard-subtitle editor-slug-hint">/{post.slug}</p>
        </div>
      </header>

      <PostEditor post={post as Post} categories={categories ?? []} />
    </div>
  )
}
