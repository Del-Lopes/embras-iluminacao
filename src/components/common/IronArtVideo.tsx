'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/components/common/ThemeProvider'

// Animação da seção "Nossos números". São dois arquivos, um por tema, porque
// o vídeo tem fundo chapado: não há transparência para deixar o fundo do site
// aparecer, então a versão precisa casar com a cor da página.
const SOURCES = {
	light: '/animation/anim-iron-light.mp4',
	dark: '/animation/anim-iron-dark.mp4',
} as const

// Quanto antes da entrada na tela o vídeo começa a baixar. Com 300px ele chega
// carregado no momento em que aparece, sem competir com o hero.
const ROOT_MARGIN = '300px'

export function IronArtVideo({ className = '' }: { className?: string }) {
	const { theme } = useTheme()
	const ref = useRef<HTMLVideoElement>(null)
	const boxRef = useRef<HTMLDivElement>(null)
	const src = SOURCES[theme] ?? SOURCES.light

	// O vídeo tem 1,3 MB e vive abaixo da dobra, mas o autoPlay faz o navegador
	// baixar o arquivo INTEIRO já no carregamento, disputando banda com a
	// imagem do hero, que é o elemento de LCP. Enquanto a seção não chega
	// perto da tela, o <video> nem existe no DOM.
	const [visivel, setVisivel] = useState(false)

	useEffect(() => {
		const el = boxRef.current
		if (!el) return

		// Sem suporte a IntersectionObserver, mostra direto: o vídeo é o
		// conteúdo da seção, e escondê-lo seria pior que baixá-lo cedo.
		if (typeof IntersectionObserver === 'undefined') {
			setVisivel(true)
			return
		}

		const io = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return
				setVisivel(true)
				io.disconnect()
			},
			{ rootMargin: ROOT_MARGIN }
		)
		io.observe(el)
		return () => io.disconnect()
	}, [])

	// `muted` como PROPRIEDADE, e não só atributo JSX: o React nem sempre
	// aplica o atributo a tempo, e um vídeo que o navegador considera "com
	// som" tem o autoplay bloqueado, ficando parado no primeiro quadro.
	useEffect(() => {
		if (ref.current) ref.current.muted = true
	}, [visivel, src])

	return (
		// A caixa ocupa o mesmo espaço com ou sem o vídeo dentro: sem ela, a
		// seção mudaria de altura na hora em que o elemento aparece, e o CLS,
		// hoje zerado, deixaria de ser.
		<div ref={boxRef} className={`w-full h-full ${className}`}>
			{visivel && (
				<video
					ref={ref}
					// key no src força remontagem ao trocar de tema. Só mudar o
					// atributo src NÃO faz o navegador recarregar um vídeo já
					// iniciado: ele segue tocando o arquivo antigo até um .load()
					// explícito.
					key={src}
					src={src}
					autoPlay
					muted
					loop
					playsInline
					// Decorativo: não acrescenta informação a quem usa leitor de tela.
					aria-hidden
					preload="metadata"
					className="w-full h-full object-contain"
				/>
			)}
		</div>
	)
}
