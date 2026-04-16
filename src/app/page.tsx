import HeroProductsWrapper from '@/sections/HeroProductsWrapper'
import ProductLines from '@/sections/ProductLines'
import Manifesto from '@/sections/Manifesto'
import SuccessCases from '@/sections/SuccessCases'
import WhoWeAre from '@/sections/WhoWeAre'
import TestimonialsHeader from '@/sections/TestimonialsHeader'
import TestimonialsSection from '@/sections/TestimonialsSection'
import ContactSection from '@/sections/ContactSection'
import Footer from '@/components/layout/Footer'

export default function Home() {
	return (
		<main className="min-h-screen bg-(--color-bg)">
			<div id="project-preview">
				<HeroProductsWrapper />
				<ProductLines />
				<SuccessCases />
				<Manifesto />
				<WhoWeAre />
				<TestimonialsHeader />
				<TestimonialsSection />
				<ContactSection />
			</div>
			<Footer />
		</main>
	)
}
