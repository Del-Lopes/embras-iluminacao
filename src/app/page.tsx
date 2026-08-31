import HeroSlider from '@/sections/HeroSlider'
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
import CustomCursor from '@/components/common/CustomCursor'
import { getHomeProjects, getRecentProjects } from '@/server/project.actions'
import { getHeroSlides } from '@/server/hero.actions'
import { OrganizationSchema } from '@/components/seo/StructuredData'
import { socialLinks } from '@/config/navigation'
import { defaultSEO, siteUrl } from '@/config/seo'
import type { Metadata } from 'next'

// A home é a única página cujo título NÃO usa o template "%s | Embras
// Iluminação": ela já começa pela marca, e o sufixo repetiria o nome duas
// vezes no mesmo resultado de busca.
export const metadata: Metadata = {
	title: { absolute: defaultSEO.title },
	description: defaultSEO.description,
	// Canonical própria. O layout deixou de declarar uma para todas.
	alternates: { canonical: siteUrl },
	openGraph: { ...defaultSEO.openGraph, url: siteUrl },
}

// A seção de produtos passou a exibir CATEGORIAS estáticas com link para o
// catálogo, em vez do carrossel de produtos. Com isso as duas consultas que
// buscavam 8 produtos por área saíram da home — os ids abaixo são os valores
// aceitos pelo catálogo em ?environment=.
// A home passa a ser gerada e revalidada por tempo, em vez de renderizada a
// cada visita. Com as leituras públicas sem cookies (ver supabase-public.ts),
// nada aqui depende de quem está pedindo a página.
//
// Cinco minutos é o atraso máximo de uma edição no painel APENAS se o
// revalidatePath falhar: salvar um banner ou um projeto já invalida a home na
// hora. O número é o piso de segurança, não o tempo de espera normal.
export const revalidate = 300

const AREAS: ProductLine[] = [
  { id: 'interno', label: 'Área Interna' },
  { id: 'externo', label: 'Área Externa' },
]

export default async function Home() {
  // O grid da home vem resolvido em posições; os cards menores excluem quem já
  // apareceu lá em cima, e por isso dependem do primeiro resultado.
  // Slides do hero: o par projeto + produto vem de src/config/hero-slides.ts,
  // e aqui só as imagens e o link são resolvidos no banco.
  const heroSlides = await getHeroSlides()

  const homeSlots = await getHomeProjects()
  const recentProjects = await getRecentProjects(
    homeSlots.filter((p): p is NonNullable<typeof p> => !!p).map((p) => p.id)
  )

  // home-palette: laranja de destaque + azul de título. A identidade nova está
  // confinada à página principal enquanto as demais páginas não migram.
  return (
    <main className="home-palette relative min-h-screen bg-(--color-bg)">
      {/* Header sobre o hero, transparente. `relative` no main ancora o
          posicionamento absoluto do header no topo da página. */}
      {/* Cursor customizado. Montado AQUI, e não no layout raiz, porque ele
          vale só para a home: assim as outras páginas não carregam o script
          nem precisam de exceção por rota. Abaixo de md ele não renderiza. */}
      <CustomCursor />

      <Header variant="overlay" />

      <OrganizationSchema sameAs={socialLinks.map((s) => s.href)} />

      {/* A home não tinha NENHUM h1: o título do slider é h2, porque muda a
          cada slide e não pode ser o título da página. Este h1 fixo diz o que
          a empresa é, para quem lê com leitor de tela e para o buscador, sem
          aparecer na tela. */}
      <h1 className="sr-only">
        Embras Iluminação: fabricante de postes e luminárias LED em Embu-Guaçu, São Paulo
      </h1>

      <div id="project-preview">
        <HeroSlider slides={heroSlides} />
        <CompanyStats />
        <ProductLines lines={AREAS} defaultActive="externo" />
        <SuccessCases slots={homeSlots} recent={recentProjects} />
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
