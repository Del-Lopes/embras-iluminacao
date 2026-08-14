'use server'

// ================================================================
// lead.actions.ts — captura de leads (popup de download de arquivos)
//   - createLeadAction: pública (visitante). Insere via service role
//     (supabaseAdmin), que ignora RLS — anon não precisa de policy.
//   - getLeads / delete / bulkDelete: dashboard admin (staff).
// ================================================================

import { supabaseAdmin } from '@/lib/db/supabase-admin'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import type { Lead, LeadFileType } from '@/lib/db/schema'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const leadSchema = z.object({
  product_id: z.string().uuid().nullable().optional().default(null),
  product_name: z.string().optional().default(''),
  file_type: z.enum(['datasheet', 'ies', 'certificates']),
  name: z.string().min(1, 'Informe seu nome'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().optional().default(''),
})

export type CreateLeadInput = z.input<typeof leadSchema>
export type CreateLeadResult = { error: string } | { success: true }

// ---- Pública: registra o lead do popup ----
export const createLeadAction = async (input: CreateLeadInput): Promise<CreateLeadResult> => {
  const parsed = leadSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }
  const d = parsed.data

  const { error } = await supabaseAdmin.from('leads').insert({
    product_id: d.product_id,
    product_name: d.product_name.trim() || null,
    file_type: d.file_type,
    name: d.name.trim(),
    email: d.email.trim(),
    phone: d.phone.trim() || null,
  })

  if (error) {
    console.error('[createLeadAction]', error.message)
    return { error: 'Não foi possível registrar agora. Tente novamente.' }
  }
  return { success: true }
}

// ================================================================
// Admin — listagem + exclusão
// ================================================================
const PAGE_SIZE = 30

export type GetLeadsParams = { page?: number; file_type?: LeadFileType | 'all'; q?: string }
export type GetLeadsResult = { leads: Lead[]; total: number; page: number; pageCount: number }

export const getLeads = async ({
  page = 1,
  file_type = 'all',
  q = '',
}: GetLeadsParams = {}): Promise<GetLeadsResult> => {
  const supabase = await createSupabaseServerClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (file_type !== 'all') query = query.eq('file_type', file_type)
  if (q.trim()) {
    const term = q.trim().replace(/[,()]/g, ' ').trim()
    if (term) query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,product_name.ilike.%${term}%`)
  }

  const { data, count, error } = await query
  if (error) {
    console.error('[getLeads]', error.message)
    return { leads: [], total: 0, page, pageCount: 0 }
  }
  const total = count ?? 0
  return { leads: (data ?? []) as Lead[], total, page, pageCount: Math.ceil(total / PAGE_SIZE) }
}

const guardStaff = async () => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'editor'].includes(profile.role)) return null
  return supabase
}

export const deleteLeadAction = async (formData: FormData): Promise<void> => {
  const id = formData.get('leadId') as string
  if (!id) return
  const supabase = await guardStaff()
  if (!supabase) return
  await supabase.from('leads').delete().eq('id', id)
  revalidatePath('/admin/leads')
}

export const bulkDeleteLeadsAction = async (ids: string[]): Promise<void> => {
  if (!ids.length) return
  const supabase = await guardStaff()
  if (!supabase) return
  await supabase.from('leads').delete().in('id', ids)
  revalidatePath('/admin/leads')
}
