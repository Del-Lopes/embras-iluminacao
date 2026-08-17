import HeroProductsWrapper from '@/sections/HeroProductsWrapper'
import CompanyStats from '@/sections/CompanyStats'
import ProductLines, { type ProductLine } from '@/sections/ProductLines'
import SuccessCases from '@/sections/SuccessCases'
import WhyUs from '@/sections/WhyUs'
import WhoWeAre from '@/sections/WhoWeAre'
import TestimonialsHeader from '@/sections/TestimonialsHeader'
import TestimonialsCarousel from '@/sections/TestimonialsCarousel'
import TestimonialsBackdrop from '@/sections/TestimonialsBackdrop'
import Footer from '@/components/layout/Footer'
import Header from '@/components/layout/Header'
import { getFeaturedProjects, getRecentProjects } from '@/server/project.actions'

// A seção de produtos passou a exibir CATEGORIAS estáticas com link para o
// catálogo, em vez do carrossel de produtos. Com isso as duas consultas que
// buscavam 8 produtos por área saíram da home — os ids abaixo são os valores
// aceitos pelo catálogo em ?environment=.
const AREAS: ProductLine[] = [
  { id: 'interno', label: 'Área Interna' },
  { id: 'externo', label: 'Área Externa' },
]

export default async function Home() {
  const [featuredProjects, recentProjects] = await Promise.all([
    getFeaturedProjects(5),
    getRecentProjects(8),
  ])

  // home-palette: laranja de destaque + azul de título. A identidade nova está
  // confinada à página principal enquanto as demais páginas não migram.
  return (
    <main className="home-palette relative min-h-screen bg-(--color-bg)">
      {/* Header sobre o hero, transparente. `relative` no main ancora o
          posicionamento absoluto do header no topo da página. */}
      <Header variant="overlay" />
      <div id="project-preview">
        <HeroProductsWrapper />
        <CompanyStats />
        <ProductLines lines={AREAS} defaultActive="externo" />
        <SuccessCases featured={featuredProjects} recent={recentProjects} />
        <WhoWeAre />
        {/* Manifesto saiu da home: vai para a página /quem-somos, ainda a
            criar. O componente segue em src/sections/Manifesto.tsx. */}
        <WhyUs />
        <TestimonialsHeader />
        {/* Mesma estrutura da antiga TestimonialsSection: a casca com o fundo e
            o glow permanece, só o conteúdo passa a ser o carrossel novo. */}
        <TestimonialsBackdrop>
          <TestimonialsCarousel />
        </TestimonialsBackdrop>
        {/* A antiga ContactSection saiu daqui: o contato agora vive no rodapé,
            que carrega o CTA grande e os dados. O arquivo segue em
            src/sections/ContactSection.tsx, sem uso. */}
      </div>
      <Footer />
    </main>
  )
}
