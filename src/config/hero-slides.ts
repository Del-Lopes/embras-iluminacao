// ================================================================
// Slides do hero da home.
//
// Cada slide junta duas coisas: a FOTO DE UM PROJETO, que ocupa a metade
// esquerda, e o PRODUTO usado nele, apresentado à direita com o link para a
// própria página.
//
// As imagens são as de /public/slider, feitas sob medida para o hero, e por
// isso vêm daqui e não da capa cadastrada no painel: a capa do produto é
// enquadrada para o card do catálogo, não para uma peça de 340x500 sobre
// degradê. O slug do produto continua servindo para o destino do botão.
// ================================================================

export type HeroSlideConfig = {
	// Foto do projeto, na metade esquerda.
	projectImage: string
	// Foto do produto, dentro da moldura de vidro à direita.
	productImage: string
	// Slug do produto. Define o destino do botão; enquanto ele não existir no
	// banco, o botão cai no catálogo.
	productSlug: string
	// Título grande sobre a foto.
	headline: string
	// Linha fina abaixo do título.
	tagline: string
	// Texto sob a foto do produto.
	description: string
	// Rótulo do botão.
	cta: string
	// Degradê do slide, em tela cheia. Um por slide: é ele que dá a virada de
	// clima entre um e outro.
	gradient: string
}

export const HERO_SLIDES: HeroSlideConfig[] = [
	{
		projectImage: '/slider/slider-1-square.webp',
		productImage: '/slider/poste-ref001.webp',
		productSlug: 'poste-girafa-retangular',
		headline: 'Postes',
		tagline: 'Presença que estrutura o espaço',
		description:
			'Estrutura, altura e acabamento pensados para iluminar praças, condomínios e áreas externas de grande porte.',
		cta: 'Ver o produto',
		gradient:
			'linear-gradient(125deg, #d8cec4 0%, #b9a794 60%, #6b3c16 100%)',
	},
	{
		projectImage: '/slider/slider2.webp',
		productImage: '/slider/luminaria-ref001.webp',
		productSlug: 'produto-luminarias',
		headline: 'Luminárias',
		tagline: 'Luz precisa em cada ambiente',
		description:
			'Eficiência e temperatura de cor sob controle, do projeto residencial ao comercial de alto fluxo.',
		cta: 'Ver o produto',
		gradient:
			'linear-gradient(125deg, #cfc6bd 0%, #a08e7c 58%, #2f2a26 100%)',
	},
	{
		projectImage: '/slider/slider3.webp',
		productImage: '/slider/arandela-ref001.webp',
		productSlug: 'produto-arandelas',
		headline: 'Arandelas',
		tagline: 'A parede como fonte de luz',
		description:
			'Facho controlado para fachadas, corredores e ambientes internos, iluminando sem ofuscar quem passa.',
		cta: 'Ver o produto',
		gradient:
			'linear-gradient(125deg, #d3c8bb 0%, #9c8a76 58%, #3a2a1c 100%)',
	},
]
