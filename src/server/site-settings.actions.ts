'use server'

// ================================================================
// site-settings.actions.ts — configurações gerais do site (linha única).
// Hoje guarda a URL do PDF do catálogo (download público na página /catalogo).
// ================================================================

import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import type { SiteSettings } from '@/lib/db/schema'
import { revalidatePath } from 'next/cache'

export type SaveResult = { error: string } | { success: true }

// Leitura pública (usada pela página /catalogo e pelo admin).
export const getSiteSettings = async (): Promise<SiteSettings | null> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .single()
  if (error) {
    console.error('[getSiteSettings]', error.message)
    return null
  }
  return (data as SiteSettings) ?? null
}

// Gate de staff (admin/editor) — mesmo shape das outras actions.
const requireStaff = async () => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !['admin', 'editor'].includes(profile.role)) return null
  return user
}

// Remove do R2 um arquivo de catálogo antigo (best-effort — nunca bloqueia).
const deleteOldCatalog = async (url: string | null | undefined) => {
  if (!url) return
  try {
    const { r2KeyFromPublicUrl, deleteR2Objects } = await import('@/lib/storage/r2-client')
    const key = r2KeyFromPublicUrl(url)
    if (key) await deleteR2Objects([key])
  } catch (err) {
    console.error('[deleteOldCatalog]', (err as Error).message)
  }
}

// Salva a URL do catálogo (após o upload do PDF no R2). Remove o arquivo
// anterior do R2 se estiver sendo substituído.
export const saveCatalogAction = async (input: {
  url: string
  filename: string
}): Promise<SaveResult> => {
  const user = await requireStaff()
  if (!user) return { error: 'Não autorizado' }

  const url = (input.url || '').trim()
  if (!url) return { error: 'URL do arquivo inválida' }

  const supabase = await createSupabaseServerClient()
  const { data: existing } = await supabase
    .from('site_settings')
    .select('catalog_url')
    .eq('id', 1)
    .single()

  const { error } = await supabase
    .from('site_settings')
    .update({ catalog_url: url, catalog_filename: (input.filename || '').trim() || null })
    .eq('id', 1)

  if (error) {
    console.error('[saveCatalogAction]', error.message)
    return { error: 'Erro ao salvar o catálogo' }
  }

  // Limpa o PDF anterior (se trocou).
  if (existing?.catalog_url && existing.catalog_url !== url) {
    await deleteOldCatalog(existing.catalog_url)
  }

  revalidatePath('/admin/catalog')
  revalidatePath('/catalogo')
  return { success: true }
}

// Remove o catálogo (limpa a coluna e apaga o arquivo do R2).
export const removeCatalogAction = async (): Promise<SaveResult> => {
  const user = await requireStaff()
  if (!user) return { error: 'Não autorizado' }

  const supabase = await createSupabaseServerClient()
  const { data: existing } = await supabase
    .from('site_settings')
    .select('catalog_url')
    .eq('id', 1)
    .single()

  const { error } = await supabase
    .from('site_settings')
    .update({ catalog_url: null, catalog_filename: null })
    .eq('id', 1)

  if (error) {
    console.error('[removeCatalogAction]', error.message)
    return { error: 'Erro ao remover o catálogo' }
  }

  await deleteOldCatalog(existing?.catalog_url)

  revalidatePath('/admin/catalog')
  revalidatePath('/catalogo')
  return { success: true }
}
