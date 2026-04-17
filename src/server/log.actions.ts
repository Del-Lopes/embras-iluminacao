'use server'

import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { revalidatePath } from 'next/cache'

export const deleteLogAction = async (formData: FormData): Promise<void> => {
  const logId = formData.get('logId') as string
  if (!logId) return

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

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

  await supabase.from('ai_automation_logs').delete().neq('id', '')
  revalidatePath('/admin/logs')
}
