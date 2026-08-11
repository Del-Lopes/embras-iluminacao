'use server'

import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { guardUser, isGuardFailure } from '@/lib/auth/guards'
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
  const session = await guardUser()
  if (isGuardFailure(session)) return session

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

  // created_by carimba a autoria: é o que depois permite ao editor
  // excluir esta categoria e nenhuma das pré-existentes.
  const { error } = await supabase
    .from('categories')
    .insert({
      name,
      slug,
      description: description || null,
      created_by: session.id,
    })

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

  const session = await guardUser()
  if (isGuardFailure(session)) return session

  const supabase = await createSupabaseServerClient()

  // Autoria: o editor só exclui o que ele mesmo criou. As categorias
  // anteriores à migration 013 têm created_by NULL e ficam com o admin.
  if (session.role !== 'admin') {
    const { data: category } = await supabase
      .from('categories')
      .select('created_by')
      .eq('id', id)
      .single()

    if (!category) return { error: 'Categoria não encontrada' }

    if (category.created_by !== session.id) {
      return {
        error: 'Esta categoria não foi criada por você. Peça a um administrador.',
      }
    }
  }

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
