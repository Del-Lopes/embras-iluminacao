import { supabaseAdmin } from '@/lib/db/supabase-admin'

/**
 * Updates all posts with status='scheduled' whose published_at has passed
 * to status='published'. Safe to call from any server context.
 */
export async function publishScheduledPosts(): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .update({ status: 'published' })
    .eq('status', 'scheduled')
    .lte('published_at', new Date().toISOString())
    .select('id')

  if (error) {
    console.error('[publishScheduledPosts] error:', error.message)
    return 0
  }

  const count = data?.length ?? 0
  if (count > 0) console.info(`[publishScheduledPosts] published ${count} scheduled post(s)`)
  return count
}
