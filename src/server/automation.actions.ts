'use server'

import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { supabaseAdmin } from '@/lib/db/supabase-admin'
import { revalidatePath } from 'next/cache'
import type { AutomationSettings } from '@/lib/db/schema'

// ================================================================
// getAutomationSettings — load the single settings row
// ================================================================
export async function getAutomationSettings(): Promise<AutomationSettings | null> {
  const { data } = await supabaseAdmin
    .from('automation_settings')
    .select('*')
    .maybeSingle()
  return (data as AutomationSettings | null) ?? null
}

// ================================================================
// saveAutomationSettingsAction — update settings (admin only)
// ================================================================
export type SaveSettingsResult = { error: string } | { success: true }

export async function saveAutomationSettingsAction(
  _prevState: SaveSettingsResult | null,
  formData: FormData,
): Promise<SaveSettingsResult> {
  // Auth + role guard
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Apenas administradores podem alterar as configurações de automação' }
  }

  // Parse form values
  const startHour    = parseInt(formData.get('cron_start_hour')   as string, 10)
  const startMinute  = parseInt(formData.get('cron_start_minute') as string, 10)
  const intervalHours = parseInt(formData.get('post_interval_hours') as string, 10)
  const newsPerDay   = parseInt(formData.get('news_posts_per_day') as string, 10)
  const salesPerDay  = parseInt(formData.get('sales_posts_per_day') as string, 10)
  const isEnabled    = formData.get('is_enabled') === 'on'

  // Active days: checkboxes named "day_0" … "day_6"
  const activeDays = [0, 1, 2, 3, 4, 5, 6].filter(
    (d) => formData.get(`day_${d}`) === 'on',
  )

  // Validate
  if (isNaN(startHour) || startHour < 0 || startHour > 23) {
    return { error: 'Horário de início inválido (0–23)' }
  }
  if (isNaN(startMinute) || startMinute < 0 || startMinute > 59) {
    return { error: 'Minutos de início inválidos (0–59)' }
  }
  if (isNaN(intervalHours) || intervalHours < 1 || intervalHours > 23) {
    return { error: 'Intervalo entre posts inválido (mínimo 1h, máximo 23h)' }
  }
  if (isNaN(newsPerDay) || newsPerDay < 0 || newsPerDay > 20) {
    return { error: 'Número de postagens de notícias inválido (0–20)' }
  }
  if (isNaN(salesPerDay) || salesPerDay < 0 || salesPerDay > 20) {
    return { error: 'Número de postagens de vendas inválido (0–20)' }
  }
  if (activeDays.length === 0) {
    return { error: 'Selecione pelo menos um dia ativo' }
  }

  // Validate that all slots fit within the same calendar day (< 24h)
  const numSlots = Math.max(newsPerDay, salesPerDay)
  if (numSlots > 1) {
    const lastSlotHour = startHour + (numSlots - 1) * intervalHours
    if (lastSlotHour >= 24) {
      return {
        error: `Agendamento incompatível: com ${numSlots} slots, intervalo de ${intervalHours}h e início às ${startHour}h, o último post seria às ${lastSlotHour}h (após meia-noite). Reduza o número de posts ou o intervalo.`,
      }
    }
  }

  // Fetch the single settings row ID
  const { data: current } = await supabaseAdmin
    .from('automation_settings')
    .select('id')
    .maybeSingle()

  if (!current) return { error: 'Configurações não encontradas — execute a migration 002 no Supabase' }

  const { error: updateError } = await supabaseAdmin
    .from('automation_settings')
    .update({
      cron_start_hour:    startHour,
      cron_start_minute:  startMinute,
      post_interval_hours: intervalHours,
      active_days:        activeDays,
      news_posts_per_day: newsPerDay,
      sales_posts_per_day: salesPerDay,
      is_enabled:         isEnabled,
    })
    .eq('id', current.id)

  if (updateError) return { error: updateError.message }

  revalidatePath('/admin/automation/settings')
  return { success: true }
}
