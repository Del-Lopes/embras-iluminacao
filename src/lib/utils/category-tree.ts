import type { ProductCategory } from '@/lib/db/schema'

export type CategoryTreeOption = { id: string; name: string; slug: string; depth: number }

// Flatten a parent_id tree into a depth-ordered list (roots first, children
// nested under their parent). Used by the dashboard filter and the editor's
// category checklist.
export const flattenCategoryTree = (
  categories: ProductCategory[]
): CategoryTreeOption[] => {
  const byParent = new Map<string | null, ProductCategory[]>()
  for (const cat of categories) {
    const list = byParent.get(cat.parent_id) ?? []
    list.push(cat)
    byParent.set(cat.parent_id, list)
  }
  for (const list of byParent.values()) {
    list.sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'pt-BR')
    )
  }

  const out: CategoryTreeOption[] = []
  const walk = (parentId: string | null, depth: number) => {
    for (const cat of byParent.get(parentId) ?? []) {
      out.push({ id: cat.id, name: cat.name, slug: cat.slug, depth })
      walk(cat.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}
