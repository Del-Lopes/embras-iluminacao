'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from '@/components/common/ThemeProvider'

// Animação da seção "Nossos números". São dois arquivos, um por tema, porque
// o vídeo tem fundo chapado — não há transparência para deixar o fundo do site
// aparecer, então a versão precisa casar com a cor da página.
const SOURCES = {
	light: '/animation/anim-iron-light.mp4',
	dark: '/animation/anim-iron-dark.mp4',
} as const

export function IronArtVideo({ className = '' }: { className?: string }) {
	const { theme } = useTheme()
	const ref = useRef<HTMLVideoElement>(null)
	const src = SOURCES[theme] ?? SOURCES.light

	// `muted` como PROPRIEDADE, e não só atributo JSX: o React nem sempre
	// aplica o atributo a tempo, e um vídeo que o navegador considera "com
	// som" tem o autoplay bloqueado — ficaria parado no primeiro quadro.
	useEffect(() => {
		if (ref.current) ref.current.muted = true
	}, [])

	return (
		<video
			ref={ref}
			// key no src força remontagem ao trocar de tema. Só mudar o atributo
			// src NÃO faz o navegador recarregar um vídeo já iniciado: ele segue
			// tocando o arquivo antigo até um .load() explícito.
			key={src}
			src={src}
			autoPlay
			muted
			loop
			playsInline
			// Decorativo: não acrescenta informação a quem usa leitor de tela.
			aria-hidden
			preload="metadata"
			className={`w-full h-full object-contain ${className}`}
		/>
	)
}
