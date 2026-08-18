'use server'

// ================================================================
// product-spec-label.actions.ts
// CRUD dos rótulos de "Informações Técnicas" + o upsert usado pelo editor
// de produto quando o usuário marca "salvar rótulo".
//
// A unicidade é pela forma NORMALIZADA (sem acento, minúscula), não pelo
// nome exibido: "Tensão" e "tensao" são o mesmo rótulo.
// ================================================================

import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { normalizeLabel } from '@/lib/utils/normalize-label'
import { toTitleCase } from '@/lib/utils/title-case'
import type { ProductSpecLabel } from '@/lib/db/schema'

const SPEC_LABELS_PATH = '/admin/products/specifications'

export type SpecLabelResult = { error: string } | { ok: true }

const NameSchema = z.string().min(1, 'Informe um rótulo').max(80)

// ================================================================
// listProductSpecLabels — usado pelo editor de produto e pela página CRUD
// ================================================================
export const listProductSpecLabels = async (): Promise<ProductSpecLabel[]> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('product_spec_labels')
    .select('id, name, normalized, sort_order, created_at')
    .order('sort_order')
    .order('name')

  if (error) {
    console.error('[listProductSpecLabels]', error.message)
    return []
  }
  return (data ?? []) as ProductSpecLabel[]
}

// ================================================================
// createProductSpecLabelAction
// ================================================================
export const createProductSpecLabelAction = async (
  formData: FormData
): Promise<SpecLabelResult> => {
  const parsed = NameSchema.safeParse((formData.get('name') as string | null) ?? '')
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // toTitleCase: o rótulo vira cabeçalho da ficha técnica no site, então a
  // capitalização entra padronizada em vez de depender de quem digitou.
  const name = toTitleCase(parsed.data)
  const normalized = normalizeLabel(name)
  if (!normalized) return { error: 'Rótulo inválido' }

  const supabase = await createSupabaseServerClient()

  const { count } = await supabase
    .from('product_spec_labels')
    .select('*', { count: 'exact', head: true })
    .eq('normalized', normalized)

  if ((count ?? 0) > 0) {
    return { error: 'Já existe um rótulo com esse nome (ignorando acentos e maiúsculas)' }
  }

  const { error } = await supabase
    .from('product_spec_labels')
    .insert({ name, normalized })

  if (error) return { error: 'Erro ao criar rótulo: ' + error.message }

  revalidatePath(SPEC_LABELS_PATH)
  return { ok: true }
}

// ================================================================
// updateProductSpecLabelAction — renomeia (o normalized acompanha)
// ================================================================
export const updateProductSpecLabelAction = async (
  id: string,
  rawName: string
): Promise<SpecLabelResult> => {
  if (!id) return { error: 'ID inválido' }

  const parsed = NameSchema.safeParse(rawName)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // toTitleCase: o rótulo vira cabeçalho da ficha técnica no site, então a
  // capitalização entra padronizada em vez de depender de quem digitou.
  const name = toTitleCase(parsed.data)
  const normalized = normalizeLabel(name)
  if (!normalized) return { error: 'Rótulo inválido' }

  const supabase = await createSupabaseServerClient()

  // Colisão com OUTRO registro (o próprio pode manter o normalized ao só
  // trocar acento ou caixa, ex.: "tensao" -> "Tensão").
  const { data: clash } = await supabase
    .from('product_spec_labels')
    .select('id')
    .eq('normalized', normalized)
    .neq('id', id)
    .maybeSingle()

  if (clash) {
    return { error: 'Já existe outro rótulo com esse nome (ignorando acentos e maiúsculas)' }
  }

  const { error } = await supabase
    .from('product_spec_labels')
    .update({ name, normalized })
    .eq('id', id)

  if (error) return { error: 'Erro ao renomear rótulo: ' + error.message }

  revalidatePath(SPEC_LABELS_PATH)
  return { ok: true }
}

// ================================================================
// deleteProductSpecLabelAction
// Sem checagem de uso: o rótulo é sugestão, e os produtos guardam o texto
// em tech_specs. Excluir aqui tira da lista e não altera produto nenhum.
// ================================================================
export const deleteProductSpecLabelAction = async (
  id: string
): Promise<SpecLabelResult> => {
  if (!id) return { error: 'ID inválido' }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('product_spec_labels').delete().eq('id', id)

  if (error) return { error: 'Erro ao excluir rótulo: ' + error.message }

  revalidatePath(SPEC_LABELS_PATH)
  return { ok: true }
}

// ================================================================
// ensureProductSpecLabels
// Chamada ao salvar o produto com os rótulos marcados como "salvar".
// Insere os que ainda não existem e IGNORA os que já existem — a decisão
// é pelo normalized, então marcar "salvar" escrevendo "tensao" quando já
// há "Tensão" não cria duplicata nem sobrescreve o nome original.
// ================================================================
export const ensureProductSpecLabels = async (labels: string[]): Promise<void> => {
  const wanted = new Map<string, string>()
  for (const raw of labels) {
    // Mesmo padrão para o rótulo que entra sozinho pelo editor de produto:
    // não faria sentido a capitalização depender da porta de entrada.
    const name = toTitleCase(raw)
    const normalized = normalizeLabel(name)
    if (normalized && !wanted.has(normalized)) wanted.set(normalized, name)
  }
  if (wanted.size === 0) return

  const supabase = await createSupabaseServerClient()

  const { data: existing } = await supabase
    .from('product_spec_labels')
    .select('normalized')
    .in('normalized', [...wanted.keys()])

  for (const row of (existing ?? []) as { normalized: string }[]) {
    wanted.delete(row.normalized)
  }
  if (wanted.size === 0) return

  const rows = [...wanted.entries()].map(([normalized, name]) => ({ name, normalized }))
  const { error } = await supabase.from('product_spec_labels').insert(rows)

  // Falha aqui não pode derrubar o salvamento do produto: o rótulo é um
  // acessório, e o tech_specs dele já foi gravado.
  if (error) console.error('[ensureProductSpecLabels]', error.message)

  revalidatePath(SPEC_LABELS_PATH)
}
