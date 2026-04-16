import { redirect } from 'next/navigation'

// "Publicações" no menu leva à criação manual de post
export default function PublishPage() {
  redirect('/admin/posts/new')
}
