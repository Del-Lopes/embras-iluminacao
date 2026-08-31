// ================================================================
// Degradês do hero da home.
//
// O banco guarda só a CHAVE, e o valor vive aqui. Guardar a cor lá permitiria
// qualquer combinação, e todo o texto do slide é branco: um fundo claro demais
// apagaria o título, a descrição e o botão de uma vez. Com uma lista fechada,
// a escolha do painel nunca produz um slide ilegível.
//
// Acrescentar um degradê é uma linha aqui; ele aparece sozinho no seletor do
// painel.
// ================================================================

export type BannerGradient = {
	key: string
	label: string
	css: string
}

export const BANNER_GRADIENTS: BannerGradient[] = [
	{
		key: 'areia',
		label: 'Areia e terra',
		css: 'linear-gradient(125deg, #d8cec4 0%, #b9a794 60%, #6b3c16 100%)',
	},
	{
		key: 'grafite',
		label: 'Cinza e grafite',
		css: 'linear-gradient(125deg, #cfc6bd 0%, #a08e7c 58%, #2f2a26 100%)',
	},
	{
		key: 'cobre',
		label: 'Bege e cobre',
		css: 'linear-gradient(125deg, #d3c8bb 0%, #9c8a76 58%, #3a2a1c 100%)',
	},
	{
		key: 'noite',
		label: 'Azul e noite',
		css: 'linear-gradient(125deg, #b9bcc4 0%, #5c6a86 55%, #16213a 100%)',
	},
	{
		key: 'brasa',
		label: 'Laranja e brasa',
		css: 'linear-gradient(125deg, #e0cfc2 0%, #c37a4a 55%, #5a2410 100%)',
	},
]

export const DEFAULT_GRADIENT = BANNER_GRADIENTS[0]

// Chave desconhecida cai no primeiro em vez de deixar o painel sem fundo: um
// degradê antigo removido desta lista não pode derrubar a home.
export const gradientCss = (key: string | null | undefined): string =>
	BANNER_GRADIENTS.find((g) => g.key === key)?.css ?? DEFAULT_GRADIENT.css
