'use server'

import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { guardAdmin, isGuardFailure } from '@/lib/auth/guards'
import { revalidatePath } from 'next/cache'

export const deleteLogAction = async (formData: FormData): Promise<void> => {
  const logId = formData.get('logId') as string
  if (!logId) return

  // Logs viraram área restrita: alinhado com deleteAllLogsAction, que
  // já exigia admin. A RLS da migration 006 ainda aceita editor, então
  // sem este guard a exclusão unitária continuaria aberta a eles.
  if (isGuardFailure(await guardAdmin())) return

  const supabase = await createSupabaseServerClient()
  await supabase.from('ai_automation_logs').delete().eq('id', logId)
  revalidatePath('/admin/logs')
}

export const deleteAllLogsAction = async (): Promise<void> => {
  if (isGuardFailure(await guardAdmin())) return

  const supabase = await createSupabaseServerClient()

  // Match-all via a sentinel UUID that no real row can have (id is uuid).
  await supabase
    .from('ai_automation_logs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  revalidatePath('/admin/logs')
}
