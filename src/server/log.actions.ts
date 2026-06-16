'use server'

import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { revalidatePath } from 'next/cache'

export const deleteLogAction = async (formData: FormData): Promise<void> => {
  const logId = formData.get('logId') as string
  if (!logId) return

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // RLS (ai_logs_delete_staff, migration 006) restricts the delete to
  // admin/editor at the database layer.
  await supabase.from('ai_automation_logs').delete().eq('id', logId)
  revalidatePath('/admin/logs')
}

export const deleteAllLogsAction = async (): Promise<void> => {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return

  // Match-all via a sentinel UUID that no real row can have (id is uuid).
  await supabase
    .from('ai_automation_logs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  revalidatePath('/admin/logs')
}
