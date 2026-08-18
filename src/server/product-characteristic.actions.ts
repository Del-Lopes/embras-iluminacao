'use server'

// ================================================================
// product-characteristic.actions.ts
// CRUD das características de produto (hoje só Materiais).
// Espelha product-category.actions.ts: slug único (por tipo), escrita
// gated por RLS (admin/editor).
// ================================================================

import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ProductCharacteristicType } from '@/lib/db/schema'
import { toTitleCase } from '@/lib/utils/title-case'

const CHARACTERISTICS_PATH = '/admin/products/characteristics'

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const TYPES = ['material'] as const

// ================================================================
// createProductCharacteristicAction
// ================================================================
const CreateSchema = z.object({
  name: z.string().min(1, 'Informe um valor').max(80),
  type: z.enum(TYPES),
})

export type CreateCharacteristicResult = { error: string } | { ok: true }

export const createProductCharacteristicAction = async (
  formData: FormData
): Promise<CreateCharacteristicResult> => {
  const parsed = CreateSchema.safeParse({
    name: (formData.get('name') as string | null) ?? '',
    type: (formData.get('type') as string | null) ?? '',
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // toTitleCase: a lista aparece como filtro no catálogo, então a
  // capitalização entra padronizada em vez de depender de quem digitou.
  const { type } = parsed.data
  const name = toTitleCase(parsed.data.name)
  const slug = slugify(name)
  if (!slug) return { error: 'Valor inválido para gerar o slug' }

  const supabase = await createSupabaseServerClient()

  // Slug único dentro do tipo
  const { count } = await supabase
    .from('product_characteristics')
    .select('*', { count: 'exact', head: true })
    .eq('type', type as ProductCharacteristicType)
    .eq('slug', slug)

  if ((count ?? 0) > 0) {
    return { error: 'Já existe um valor com esse nome neste tipo' }
  }

  const { error } = await supabase
    .from('product_characteristics')
    .insert({ type: type as ProductCharacteristicType, name, slug })

  if (error) return { error: 'Erro ao criar característica: ' + error.message }

  revalidatePath(CHARACTERISTICS_PATH)
  return { ok: true }
}

// ================================================================
// deleteProductCharacteristicAction
// Bloqueia exclusão quando há produtos vinculados.
// ================================================================
export type DeleteCharacteristicResult = { error: string } | { ok: true }

export const deleteProductCharacteristicAction = async (
  id: string
): Promise<DeleteCharacteristicResult> => {
  if (!id) return { error: 'ID inválido' }

  const supabase = await createSupabaseServerClient()

  const { count: productCount } = await supabase
    .from('product_characteristic_map')
    .select('*', { count: 'exact', head: true })
    .eq('characteristic_id', id)

  if ((productCount ?? 0) > 0) {
    return {
      error: `Não é possível excluir: ${productCount} produto(s) vinculado(s)`,
    }
  }

  const { error } = await supabase
    .from('product_characteristics')
    .delete()
    .eq('id', id)

  if (error) return { error: 'Erro ao excluir característica: ' + error.message }

  revalidatePath(CHARACTERISTICS_PATH)
  return { ok: true }
}
