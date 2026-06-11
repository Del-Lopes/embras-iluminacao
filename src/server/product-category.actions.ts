'use server'

// ================================================================
// product-category.actions.ts
// Mirrors category.actions.ts (blog) — slug uniqueness, RLS-gated
// writes via the user-session client — plus hierarchical parent_id
// support for the cascading product categories.
// ================================================================

import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const PRODUCT_CATEGORIES_PATH = '/admin/products/product-categories'

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

// ================================================================
// createProductCategoryAction
// ================================================================
const CreateSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(80),
  description: z.string().max(255).optional(),
  parent_id: z.string().uuid().optional().or(z.literal('')),
})

export type CreateProductCategoryResult = { error: string } | { ok: true }

export const createProductCategoryAction = async (
  formData: FormData
): Promise<CreateProductCategoryResult> => {
  const raw = {
    name: (formData.get('name') as string | null) ?? '',
    description: (formData.get('description') as string | null) ?? '',
    parent_id: (formData.get('parent_id') as string | null) ?? '',
  }

  const parsed = CreateSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { name, description, parent_id } = parsed.data
  const slug = slugify(name)

  if (!slug) return { error: 'Nome inválido para gerar o slug' }

  const supabase = await createSupabaseServerClient()

  // Validate parent exists (when provided)
  if (parent_id) {
    const { count: parentCount } = await supabase
      .from('product_categories')
      .select('*', { count: 'exact', head: true })
      .eq('id', parent_id)

    if ((parentCount ?? 0) === 0) {
      return { error: 'Categoria pai não encontrada' }
    }
  }

  // Check slug uniqueness
  const { count } = await supabase
    .from('product_categories')
    .select('*', { count: 'exact', head: true })
    .eq('slug', slug)

  if ((count ?? 0) > 0) {
    return { error: 'Já existe uma categoria com esse nome (slug duplicado)' }
  }

  const { error } = await supabase.from('product_categories').insert({
    name,
    slug,
    description: description || null,
    parent_id: parent_id || null,
  })

  if (error) return { error: 'Erro ao criar categoria: ' + error.message }

  revalidatePath(PRODUCT_CATEGORIES_PATH)
  return { ok: true }
}

// ================================================================
// deleteProductCategoryAction
// Blocks deletion when the category has children OR linked products.
// ================================================================
export type DeleteProductCategoryResult = { error: string } | { ok: true }

export const deleteProductCategoryAction = async (
  id: string
): Promise<DeleteProductCategoryResult> => {
  if (!id) return { error: 'ID inválido' }

  const supabase = await createSupabaseServerClient()

  // Block if it has child categories
  const { count: childCount } = await supabase
    .from('product_categories')
    .select('*', { count: 'exact', head: true })
    .eq('parent_id', id)

  if ((childCount ?? 0) > 0) {
    return {
      error: `Não é possível excluir: ${childCount} subcategoria(s) vinculada(s)`,
    }
  }

  // Block if products are linked through the map
  const { count: productCount } = await supabase
    .from('product_category_map')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id)

  if ((productCount ?? 0) > 0) {
    return {
      error: `Não é possível excluir: ${productCount} produto(s) vinculado(s) a esta categoria`,
    }
  }

  const { error } = await supabase
    .from('product_categories')
    .delete()
    .eq('id', id)

  if (error) return { error: 'Erro ao excluir categoria: ' + error.message }

  revalidatePath(PRODUCT_CATEGORIES_PATH)
  return { ok: true }
}
