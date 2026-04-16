'use server'

import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

// ================================================================
// createCategoryAction
// ================================================================
const CreateSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(80),
  description: z.string().max(255).optional(),
})

export type CreateCategoryResult = { error: string } | { ok: true }

export const createCategoryAction = async (
  formData: FormData
): Promise<CreateCategoryResult> => {
  const raw = {
    name: (formData.get('name') as string | null) ?? '',
    description: (formData.get('description') as string | null) ?? '',
  }

  const parsed = CreateSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { name, description } = parsed.data
  const slug = slugify(name)

  const supabase = await createSupabaseServerClient()

  // Check slug uniqueness
  const { count } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })
    .eq('slug', slug)

  if ((count ?? 0) > 0) {
    return { error: 'Já existe uma categoria com esse nome (slug duplicado)' }
  }

  const { error } = await supabase
    .from('categories')
    .insert({ name, slug, description: description || null })

  if (error) return { error: 'Erro ao criar categoria: ' + error.message }

  revalidatePath('/admin/categories')
  return { ok: true }
}

// ================================================================
// deleteCategoryAction
// ================================================================
export type DeleteCategoryResult = { error: string } | { ok: true }

export const deleteCategoryAction = async (
  id: string
): Promise<DeleteCategoryResult> => {
  if (!id) return { error: 'ID inválido' }

  const supabase = await createSupabaseServerClient()

  // Block deletion if posts are linked
  const { count } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id)

  if ((count ?? 0) > 0) {
    return {
      error: `Não é possível excluir: ${count} post(s) vinculado(s) a esta categoria`,
    }
  }

  const { error } = await supabase.from('categories').delete().eq('id', id)

  if (error) return { error: 'Erro ao excluir categoria: ' + error.message }

  revalidatePath('/admin/categories')
  return { ok: true }
}
