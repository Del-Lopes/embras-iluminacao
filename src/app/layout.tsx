import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import './globals.css'
import SmoothScroll from '@/lib/lenis/SmoothScroll'
import CustomCursor from '@/components/common/CustomCursor'
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
		<html lang="pt-BR" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: `(function(){try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.add('light')}catch(e){}})()` }} />
			</head>
			<body
				className={`${inter.variable} ${outfit.variable} antialiased`}
				suppressHydrationWarning
			>
				<ThemeProvider>
					<SmoothScroll>
						<CustomCursor />
						{children}
					</SmoothScroll>
				</ThemeProvider>
			</body>
		</html>
	)
}
