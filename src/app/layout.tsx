import type { Metadata } from 'next'
import { Inter, Libre_Franklin } from 'next/font/google'
import './globals.css'
import SmoothScroll from '@/lib/lenis/SmoothScroll'
import ThemeProvider from '@/components/common/ThemeProvider'
import { defaultSEO, siteUrl } from '@/config/seo'

const inter = Inter({
	variable: '--font-inter',
	subsets: ['latin'],
})

// Duas famílias, e não quatro. A Outfit e a Playfair entraram como teste no
// hero antigo, que saiu do ar quando o slider chegou, e continuavam sendo
// baixadas em toda visita: eram 70 KB de woff2 disputando banda com a imagem
// do hero, que é o elemento de LCP.
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

	// Verificação do Search Console e do Bing. A propriedade só existe se a
	// variável estiver definida: uma meta de verificação vazia no HTML não
	// verifica nada e ainda confunde quem for depurar.
	verification: {
		google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
		other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
			? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
			: undefined,
	},

	// SEM alternates.canonical aqui. Metadata do layout é HERDADA por todas as
	// páginas, então esta linha fazia /catalogo, /blog, /projetos e todo post
	// declararem que a versão boa deles era a HOME. Para o Google isso é o
	// mesmo que pedir para não indexar nenhuma outra página do site. Cada
	// página declara a própria canonical, e a da home está em app/page.tsx.
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
			className={`${inter.variable} ${libreFranklin.variable}`}
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
