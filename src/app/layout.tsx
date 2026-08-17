import type { Metadata } from 'next'
import { Inter, Outfit, Playfair_Display, Libre_Franklin } from 'next/font/google'
import './globals.css'
import SmoothScroll from '@/lib/lenis/SmoothScroll'
import ThemeProvider from '@/components/common/ThemeProvider'
import { defaultSEO, siteUrl } from '@/config/seo'

const inter = Inter({
	variable: '--font-inter',
	subsets: ['latin'],
})

const outfit = Outfit({
	variable: '--font-outfit',
	subsets: ['latin'],
})

// Teste de fonte para o wordmark EMBRAS (hero). Serif de alto contraste.
const playfair = Playfair_Display({
	variable: '--font-playfair',
	subsets: ['latin'],
})

// TESTE: títulos da home. Grotesca clássica, mesma família usada pela
// Dantalux — ar mais institucional que a Outfit, que é geométrica.
const libreFranklin = Libre_Franklin({
	variable: '--font-libre',
	subsets: ['latin'],
})

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: defaultSEO.title,
		template: `%s | Embras Iluminação`,
	},
	description: defaultSEO.description,
	openGraph: defaultSEO.openGraph,
	twitter: defaultSEO.twitter,
	alternates: { canonical: siteUrl },
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		// As variáveis de fonte precisam estar no <html>, e não no <body>.
		// globals.css declara --font-heading e --font-body em :root, que É o
		// <html>. Com as variáveis no body, --font-libre e --font-inter não
		// existiam nesse escopo, e uma custom property cujo valor tem var() para
		// algo indefinido SEM fallback computa para o guaranteed-invalid value.
		// --font-heading nascia inválida ali e herdava inválida para a árvore
		// inteira: o body nunca recalcula a declaração, só herda o resultado.
		// Efeito: todo font-family que lesse esses tokens caía na fonte herdada.
		<html
			lang="pt-BR"
			className={`${inter.variable} ${outfit.variable} ${playfair.variable} ${libreFranklin.variable}`}
			suppressHydrationWarning
		>
			<head>
				{/* Tema padrão = light, aplicado ANTES da pintura (daí o script inline
				    no head, e não um efeito no React) para não haver flash.
				    A ordem importa: aplica 'light' incondicionalmente e só remove se
				    o usuário tiver escolhido 'dark'. Fazer o inverso — condicionar o
				    add à leitura do storage — deixava o site abrir ESCURO sempre que
				    localStorage lançasse (storage particionado, modo restrito), que é
				    justamente quando não há preferência salva a respeitar. */}
				<script dangerouslySetInnerHTML={{ __html: `(function(){document.documentElement.classList.add('light');try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.remove('light')}catch(e){}})()` }} />
			</head>
			{/* antialiased fica: é renderização de texto, não definição de token. */}
			<body className="antialiased" suppressHydrationWarning>
				<ThemeProvider>
					<SmoothScroll>
						{children}
					</SmoothScroll>
				</ThemeProvider>
			</body>
		</html>
	)
}
