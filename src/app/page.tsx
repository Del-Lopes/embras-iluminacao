import HeroProductsWrapper from '@/sections/HeroProductsWrapper'
import ProductLines, { type ProductLine } from '@/sections/ProductLines'
import Manifesto from '@/sections/Manifesto'
import SuccessCases from '@/sections/SuccessCases'
import WhoWeAre from '@/sections/WhoWeAre'
import TestimonialsHeader from '@/sections/TestimonialsHeader'
import TestimonialsCarousel from '@/sections/TestimonialsCarousel'
import TestimonialsBackdrop from '@/sections/TestimonialsBackdrop'
import ContactSection from '@/sections/ContactSection'
import Footer from '@/components/layout/Footer'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import type { LineProduct } from '@/sections/ProductLineCard'

const AREAS = [
  { id: 'interno', label: 'Área Interna', env: 'interno' as const },
  { id: 'externo', label: 'Área Externa', env: 'externo' as const },
]

async function getAreaLines(): Promise<ProductLine[]> {
  const supabase = await createSupabaseServerClient()

  const fetchArea = async (env: 'interno' | 'externo'): Promise<LineProduct[]> => {
    const { data } = await supabase
      .from('products')
      .select(
        'id, name, slug, cover_image, has_3d_model, model_3d_url, model_3d_poster, model_3d_alt'
      )
      .eq('status', 'published')
      .eq('environment', env)
      .order('name')
      .limit(8)
    return (data ?? []) as LineProduct[]
  }

  return Promise.all(
    AREAS.map(async (area) => ({
      id: area.id,
      label: area.label,
      products: await fetchArea(area.env),
    }))
  )
}

export default async function Home() {
  const lines = await getAreaLines()

  return (
    <main className="min-h-screen bg-(--color-bg)">
      <div id="project-preview">
        <HeroProductsWrapper />
        <ProductLines lines={lines} defaultActive="externo" />
        <SuccessCases />
        <Manifesto />
        <WhoWeAre />
        <TestimonialsHeader />
        {/* Mesma estrutura da antiga TestimonialsSection: a casca com o fundo e
            o glow permanece, só o conteúdo passa a ser o carrossel novo. */}
        <TestimonialsBackdrop>
          <TestimonialsCarousel />
        </TestimonialsBackdrop>
        <ContactSection />
      </div>
      <Footer />
    </main>
  )
}
