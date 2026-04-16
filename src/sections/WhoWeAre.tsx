import FragmentedImageReveal from '@/components/common/FragmentedImageReveal'
import {
	AnimatedHeading,
	AnimatedParagraph,
	AnimatedPill,
} from '@/components/common/AnimatedTypography'

export default function WhoWeAre() {
	return (
		<section className="py-36 px-8 md:px-12 bg-(--color-bg) relative">
			<div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-24 items-center">
				<div className="w-full md:w-[60%] relative aspect-4/3 md:aspect-auto md:h-[600px] border border-(--color-border) overflow-hidden">
					<FragmentedImageReveal
						src="/images/case-1.png"
						alt="Who We Are"
						slices={12}
						className="w-full h-full"
					/>
				</div>

				<div className="w-full md:w-[40%] flex flex-col gap-12">
					<div className="flex flex-col gap-4">
						<AnimatedPill className="items-center justify-center md:items-start text-(--color-muted) uppercase w-fit">
							QUem Somos
						</AnimatedPill>
						<AnimatedHeading
							className="text-5xl md:text-7xl font-(--font-heading) uppercase leading-tight md:leading-[82px] tracking-tighter"
							direction="left"
						>
							Tradição em <br /> esculpir o <br />{' '}
							<span className="text-(--color-muted)">invisível.</span>
						</AnimatedHeading>
					</div>
					<div className="flex flex-col gap-6 max-w-lg">
						<AnimatedParagraph>
							Com mais de uma década de experiência no mercado, a Embras se destaca como uma empresa inovadora no mercado de iluminação, atuando como fabricante e distribuidora de uma ampla gama de produtos de alta qualidade. Nós transformamos espaços através de um olhar técnico e artístico sobre a luz.
						</AnimatedParagraph>
						<AnimatedParagraph>
							Fornecemos soluções de iluminação eficientes e elegantes para residências, empresas e espaços públicos. Nossa missão é criar ambientes que não apenas funcionam, mas que emocionam e traduzem o estilo de vida exclusivo de nossos clientes.
						</AnimatedParagraph>
						<AnimatedParagraph>
							Convidamos todos a conhecer de perto a excelência e a inovação que a Embras Iluminação oferece. Nossa dedicação à qualidade e à satisfação do cliente garante que seus projetos de iluminação sejam executados com o mais alto nível de precisão e excelência.
						</AnimatedParagraph>
					</div>
				</div>
			</div>

			<div
				className="absolute bottom-0 right-0 h-px w-[85%]"
				style={{ background: 'linear-gradient(to left, #474747 0%, #474747 60%, transparent 100%)' }}
			/>
		</section>
	)
}
