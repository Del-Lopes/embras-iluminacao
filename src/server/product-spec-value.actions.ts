'use server'

// ================================================================
// product-spec-value.actions.ts
// CRUD dos VALORES presets de "Informações Técnicas" + o gatilho da
// promoção automática.
//
// Diferença para os rótulos: aqui não existe "salvar" na tela do produto.
// O valor entra sozinho quando já foi usado em MIN_USES produtos distintos.
// O cadastro manual pela página de admin continua livre e não depende disso.
// ================================================================

import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { normalizeLabel } from '@/lib/utils/normalize-label'
import { canonicalizeUnits } from '@/lib/utils/si-units'
import type { ProductSpecValue } from '@/lib/db/schema'

const SPEC_LABELS_PATH = '/admin/products/specifications'

// Quantos produtos DISTINTOS precisam usar um valor para ele virar preset.
const MIN_USES = 10

export type SpecValueResult = { error: string } | { ok: true }

const NameSchema = z.string().min(1, 'Informe um valor').max(120)

export const listProductSpecValues = async (): Promise<ProductSpecValue[]> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('product_spec_values')
    .select('id, name, normalized, label_normalized, sort_order, created_at')
    .order('label_normalized')
    .order('sort_order')
    .order('name')

  if (error) {
    console.error('[listProductSpecValues]', error.message)
    return []
  }
  return (data ?? []) as ProductSpecValue[]
}

export const createProductSpecValueAction = async (
  formData: FormData
): Promise<SpecValueResult> => {
  const parsed = NameSchema.safeParse((formData.get('name') as string | null) ?? '')
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // O rótulo é obrigatório: um valor sem rótulo não teria a que grandeza
  // pertencer, e voltaria a ser sugerido em campos onde não cabe.
  const label = ((formData.get('label') as string | null) ?? '').trim()
  const labelNormalized = normalizeLabel(label)
  if (!labelNormalized) return { error: 'Escolha o rótulo a que o valor pertence' }

  // canonicalizeUnits aqui também: o cadastro manual entra na mesma grafia
  // do que vem pela promoção, senão "200 n" digitado à mão conviveria com o
  // "200 N" promovido.
  const name = canonicalizeUnits(parsed.data.trim())
  const normalized = normalizeLabel(name)
  if (!normalized) return { error: 'Valor inválido' }

  const supabase = await createSupabaseServerClient()

  const { count } = await supabase
    .from('product_spec_values')
    .select('*', { count: 'exact', head: true })
    .eq('label_normalized', labelNormalized)
    .eq('normalized', normalized)

  if ((count ?? 0) > 0) {
    return { error: 'Já existe esse valor neste rótulo (ignorando acentos e maiúsculas)' }
  }

  const { error } = await supabase
    .from('product_spec_values')
    .insert({ name, normalized, label_normalized: labelNormalized })
  if (error) return { error: 'Erro ao criar valor: ' + error.message }

  revalidatePath(SPEC_LABELS_PATH)
  return { ok: true }
}

export const updateProductSpecValueAction = async (
  id: string,
  rawName: string
): Promise<SpecValueResult> => {
  if (!id) return { error: 'ID inválido' }

  const parsed = NameSchema.safeParse(rawName)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const name = canonicalizeUnits(parsed.data.trim())
  const normalized = normalizeLabel(name)
  if (!normalized) return { error: 'Valor inválido' }

  const supabase = await createSupabaseServerClient()

  // Renomear não muda o rótulo, então a colisão precisa ser buscada DENTRO do
  // rótulo do próprio registro. Global, esta checagem barraria "2700" em
  // "Potência" só porque já existe "2700" em "Temperatura de Cor".
  const { data: current } = await supabase
    .from('product_spec_values')
    .select('label_normalized')
    .eq('id', id)
    .maybeSingle()

  if (!current) return { error: 'Valor não encontrado' }

  const { data: clash } = await supabase
    .from('product_spec_values')
    .select('id')
    .eq('label_normalized', current.label_normalized)
    .eq('normalized', normalized)
    .neq('id', id)
    .maybeSingle()

  if (clash) {
    return { error: 'Já existe outro valor com esse nome neste rótulo' }
  }

  const { error } = await supabase
    .from('product_spec_values')
    .update({ name, normalized })
    .eq('id', id)

  if (error) return { error: 'Erro ao renomear valor: ' + error.message }

  revalidatePath(SPEC_LABELS_PATH)
  return { ok: true }
}

// Excluir um valor promovido não impede que ele volte: se continuar em uso
// em MIN_USES produtos, a próxima promoção o repõe. Para tirá-lo de vez é
// preciso deixar de usá-lo nos produtos.
export const deleteProductSpecValueAction = async (
  id: string
): Promise<SpecValueResult> => {
  if (!id) return { error: 'ID inválido' }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('product_spec_values').delete().eq('id', id)

  if (error) return { error: 'Erro ao excluir valor: ' + error.message }

  revalidatePath(SPEC_LABELS_PATH)
  return { ok: true }
}

// ================================================================
// promoteProductSpecValues
// Chamada depois de salvar um produto. Toda a varredura acontece no banco
// (função promote_product_spec_values), porque a alternativa seria trazer o
// tech_specs de todos os produtos para cá e contar em memória a cada
// salvamento, o que piora conforme o catálogo cresce.
// ================================================================
export const promoteProductSpecValues = async (): Promise<void> => {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.rpc('promote_product_spec_values', { min_uses: MIN_USES })

  // Best-effort: o produto já foi salvo, e a promoção é um efeito colateral.
  // Falhar aqui não pode derrubar o salvamento.
  if (error) {
    console.error('[promoteProductSpecValues]', error.message)
    return
  }

  revalidatePath(SPEC_LABELS_PATH)
}
