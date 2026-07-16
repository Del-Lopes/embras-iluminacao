import LandingPage from './components/LandingPage'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import type { CarouselLine, CarouselProduct } from './components/LineCarousel'

// Materiais que alimentam as abas do carrossel (aba → termos que casam no nome/slug)
const TABS = [
  { id: 'aco', label: 'Aço', keys: ['aco', 'aço'] },
  { id: 'aluminio', label: 'Alumínio', keys: ['aluminio', 'alumínio'] },
]

async function getLines(): Promise<CarouselLine[]> {
  const supabase = await createSupabaseServerClient()

  // Características de material do catálogo
  const { data: materials } = await supabase
    .from('product_characteristics')
    .select('id, name, slug')
    .eq('type', 'material')

  const list = materials ?? []
  const matches = (m: { name: string; slug: string }, keys: string[]) =>
    keys.some(
      (k) =>
        (m.slug ?? '').toLowerCase().includes(k) || (m.name ?? '').toLowerCase().includes(k)
    )

  // product_ids que possuem qualquer um dos materiais informados
  const productsFor = async (materialIds: string[]): Promise<CarouselProduct[]> => {
    if (!materialIds.length) return []
    const { data: maps } = await supabase
      .from('product_characteristic_map')
      .select('product_id')
      .in('characteristic_id', materialIds)
    const ids = [...new Set((maps ?? []).map((r) => r.product_id))]
    if (!ids.length) return []
    const { data } = await supabase
      .from('products')
      .select(
        'id, name, slug, cover_image, has_3d_model, model_3d_url, model_3d_poster, model_3d_alt'
      )
      .eq('status', 'published')
      .in('id', ids)
      .order('name')
    return (data ?? []) as CarouselProduct[]
  }

  return Promise.all(
    TABS.map(async (tab) => {
      const materialIds = list.filter((m) => matches(m, tab.keys)).map((m) => m.id)
      const products = await productsFor(materialIds)
      return { id: tab.id, label: tab.label, products }
    })
  )
}

export default async function LPPage() {
  const lines = await getLines()
  return <LandingPage lines={lines} />
}
