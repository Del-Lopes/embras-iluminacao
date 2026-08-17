import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Mail, MessageCircle, Phone } from 'lucide-react'
import { socialLinks } from '@/config/navigation'

// Ícones de marca em SVG inline: o lucide-react removeu os brand icons
// (Instagram, LinkedIn…) das versões recentes, então importá-los quebra o build.
const InstagramIcon = () => (
	<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<rect x="2" y="2" width="20" height="20" rx="5" />
		<circle cx="12" cy="12" r="4" />
		<circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
	</svg>
)

const LinkedInIcon = () => (
	<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
		<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-.95 1.83-1.95 3.75-1.95 4 0 4.4 2.5 4.4 5.9V21h-4v-5.5c0-1.3-.03-3-1.9-3-1.9 0-2.2 1.4-2.2 2.9V21H9z" />
	</svg>
)

// Rodapé único do site (a landing /postes tem o LPFooter próprio e não usa este).
//
// Os tokens de cor são fixados AQUI, no escopo do rodapé, e não herdados: ele
// aparece na home (dentro de .home-palette, onde o destaque é laranja) e também
// em blog/catálogo, onde --color-highlight ainda é o dourado antigo. Sem fixar,
// o mesmo rodapé sairia laranja numa página e dourado na outra.
const FOOTER_TOKENS = {
	['--color-highlight' as string]: '#e54621',
	['--color-accent' as string]: '#ffffff',
	['--color-body-text' as string]: 'rgba(255, 255, 255, 0.72)',
	['--color-muted' as string]: 'rgba(255, 255, 255, 0.45)',
	['--color-border' as string]: 'rgba(255, 255, 255, 0.12)',
}

const NAV_LINKS = [
	{ label: 'Home', href: '/' },
	{ label: 'Produtos', href: '/catalogo' },
	// Páginas próprias, e não mais âncoras: acompanham o menu do header.
	{ label: 'Projetos', href: '/projetos' },
	{ label: 'Quem Somos', href: '/quem-somos' },
	{ label: 'Postes', href: '/postes' },
	{ label: 'Blog', href: '/blog' },
	{ label: 'Contato', href: '/#contato' },
]

// TODO: telefone e endereço vieram de placeholder do projeto — confirmar os
// dados reais antes de publicar.
const CONTACT = [
	{
		icon: MapPin,
		text: 'Embu Guaçu, São Paulo, SP',
		href: null,
	},
	{
		icon: Mail,
		text: 'contato@embras.com.br',
		href: 'mailto:contato@embras.com.br',
	},
	{
		icon: MessageCircle,
		text: '(11) 99999-9999',
		href: 'https://wa.me/5511999999999',
	},
	{
		icon: Phone,
		text: '(11) 3333-3333',
		href: 'tel:+551133333333',
	},
]

// Chaveado pelo `label` de socialLinks. Redes novas entram adicionando o
// ícone aqui; sem entrada no mapa, o link ainda funciona com o texto.
const SOCIAL_ICONS: Record<string, () => React.JSX.Element> = {
	Instagram: InstagramIcon,
	LinkedIn: LinkedInIcon,
}

export default function Footer() {
	return (
		// relative z-20: o TestimonialsBackdrop da home tem z-10 e um blur de
		// 120px que sangra para fora da caixa dele. Sem elevar o rodapé, esse
		// halo pintava por cima do topo daqui e virava uma mancha clara.
		// Resolvido aqui, e não removendo o z-10 de lá, para não alterar o
		// comportamento da seção de depoimentos.
		<footer className="relative z-20 bg-[#14110f] w-full" style={FOOTER_TOKENS}>
			{/* ---------- CTA gigante ---------- */}
			{/* Em repouso o bloco herda o preto do rodapé; o laranja é a
			    recompensa do hover. Full-bleed de propósito: a faixa colorida
			    varre a tela toda, enquanto o texto segue alinhado ao container. */}
			<Link
				href="/#contato"
				className="group block w-full bg-transparent transition-colors duration-500 hover:bg-(--color-highlight)"
			>
				{/* Container padded por fora, borda no filho: assim a divisória
				    começa e termina junto com o conteúdo, e não nas bordas do
				    container. Ela fica dentro do Link para receber o group-hover
				    e sumir junto com a entrada do laranja. */}
				<div className="max-w-site mx-auto w-full px-6 md:px-8 lg:px-12">
					<div className="py-6 md:py-8 flex items-center justify-between gap-8 border-b border-(--color-border) group-hover:border-transparent transition-colors duration-500">
					<span className="font-(family-name:--font-libre) font-medium text-white text-5xl sm:text-7xl lg:text-[110px] leading-none tracking-tight">
						Entre em contato
					</span>
					{/* Seta em SVG, e não caractere: o traço fino e o tamanho grande
					    precisam ser previsíveis entre fontes. */}
					<svg
						aria-hidden
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="shrink-0 w-16 h-16 md:w-28 md:h-28 lg:w-40 lg:h-40 text-white transition-transform duration-500 group-hover:translate-x-2 group-hover:-translate-y-2"
					>
						<path d="M7 17L17 7M17 7H8M17 7v9" />
					</svg>
					</div>
				</div>
			</Link>

			<div className="max-w-site mx-auto w-full px-6 md:px-8 lg:px-12">
				{/* ---------- Corpo ---------- */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1.2fr] gap-12 lg:gap-16 py-16 md:py-24">
					{/* Marca */}
					<div className="flex flex-col gap-6">
						<div className="relative h-9 w-[150px]">
							<Image
								src="/images/embras-logo-w.png"
								alt="Embras Iluminação"
								fill
								sizes="150px"
								className="object-contain object-left"
							/>
						</div>

						<p className="text-(--color-body-text)! text-sm max-w-[46ch]">
							A Embras Iluminação é uma indústria brasileira
							especializada na fabricação de postes, luminárias LED e
							soluções de iluminação, atendendo projetos em todo o
							território nacional.
						</p>

						<div className="flex gap-3 mt-2">
							{socialLinks.map((link) => {
								const Icon = SOCIAL_ICONS[link.label]
								return (
									<a
										key={link.label}
										href={link.href}
										target={link.isExternal ? '_blank' : undefined}
										rel={link.isExternal ? 'noopener noreferrer' : undefined}
										aria-label={link.label}
										className="w-11 h-11 rounded-full border border-(--color-border) flex items-center justify-center text-white hover:bg-(--color-highlight) hover:border-(--color-highlight) transition-colors duration-300"
									>
										{Icon ? <Icon /> : link.label}
									</a>
								)
							})}
						</div>
					</div>

					{/* Navegação.
					    md:order-3 troca o lugar com o Contato só no tablet, onde a
					    grade tem duas colunas: assim a primeira linha fica Marca +
					    Contato e a Navegação desce inteira para a segunda. Feito por
					    order, e não reordenando o DOM, porque em lg a sequência
					    Marca → Navegue → Contato é a correta. */}
					<nav className="flex flex-col gap-4 md:order-3 lg:order-0">
						<h2 className="text-(--color-muted) text-xs uppercase tracking-[0.2em]">
							Navegue
						</h2>
						<ul className="flex flex-col gap-3">
							{NAV_LINKS.map((item) => (
								<li key={item.href}>
									<Link
										href={item.href}
										className="text-white/85 text-sm hover:text-(--color-highlight) transition-colors"
									>
										{item.label}
									</Link>
								</li>
							))}
						</ul>
					</nav>

					{/* Contato.
					    id="contato" herdado da antiga ContactSection, removida da
					    home: o menu do header, o link "Contato" abaixo e o CTA
					    grande acima apontam todos para /#contato, e sem esta
					    âncora os três levariam a lugar nenhum. */}
					<div id="contato" className="flex flex-col gap-4 scroll-mt-24 md:order-2 lg:order-0">
						<h2 className="text-(--color-muted) text-xs uppercase tracking-[0.2em]">
							Contato
						</h2>
						<ul className="flex flex-col gap-4">
							{CONTACT.map(({ icon: Icon, text, href }) => (
								<li key={text} className="flex items-start gap-3">
									<Icon
										size={16}
										strokeWidth={1.6}
										className="shrink-0 mt-0.5 text-(--color-highlight)"
									/>
									{href ? (
										<a
											href={href}
											target={href.startsWith('http') ? '_blank' : undefined}
											rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
											className="text-white/85 text-sm hover:text-(--color-highlight) transition-colors"
										>
											{text}
										</a>
									) : (
										<span className="text-white/85 text-sm">{text}</span>
									)}
								</li>
							))}
						</ul>
					</div>
				</div>

				{/* ---------- Barra inferior ---------- */}
				<div className="border-t border-(--color-border) py-8 flex flex-col sm:flex-row items-center justify-center gap-x-4 gap-y-2 text-center">
					<span className="text-(--color-muted) text-sm">
						© 2026 Embras Iluminação.
					</span>
					<span aria-hidden className="hidden sm:block text-(--color-highlight)">
						•
					</span>
					<Link
						href="/politica-de-privacidade"
						className="text-(--color-muted) text-sm hover:text-white transition-colors"
					>
						Política de Privacidade
					</Link>
				</div>
			</div>
		</footer>
	)
}
