import Image from 'next/image'
import Link from 'next/link'
import { AnimatedPill } from '@/components/common/AnimatedTypography'

/**
 * Página 404. Vale para qualquer rota inexistente e também para o
 * notFound() chamado pelas páginas de slug quando o registro não existe.
 *
 * Sem header e sem rodapé: é uma tela de saída, e a única navegação que
 * interessa aqui é a volta para a home.
 *
 * Sem export de metadata: o Next só lê esse export em layout e page, e aqui
 * ele seria código morto. O título da aba vem do layout raiz.
 */
export default function NotFound() {
	return (
		// min-h-dvh, e não h-screen: dvh desconta a barra do navegador no
		// celular, que o vh ignora, e o min- deixa a tela crescer se o conteúdo
		// não couber numa altura pequena, em vez de cortar o texto.
		<main className="min-h-dvh bg-(--color-bg) flex flex-col">
			{/* Logo no mesmo lugar em que ela aparece no header, com o padding
			    lateral do site. O arquivo é branco, então no tema claro ele é
			    invertido para preto: é a mesma solução do header, e evita um
			    segundo asset para manter em sincronia. */}
			<Link
				href="/"
				aria-label="Ir para a home"
				className="relative block w-[120px] h-8 mx-6 md:mx-8 lg:mx-12 mt-6 shrink-0 in-[.light]:invert"
			>
				<Image
					src="/images/embras-logo-w.png"
					alt="Embras"
					fill
					sizes="120px"
					className="object-contain object-left"
				/>
			</Link>

			{/* flex-1 + items-center: o bloco fica no meio do que sobra abaixo da
			    logo, e não grudado no topo com uma faixa vazia embaixo. */}
			<div className="flex-1 flex items-center max-w-site mx-auto w-full px-6 md:px-8 lg:px-12 py-12 md:py-16">
				<div className="w-full grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-16 items-center">
					{/* Ilustração. Um arquivo por tema: o original no claro e a
					    versão preparada para fundo escuro no dark. Antes era o mesmo
					    arquivo recolorido por filtro CSS, e o invert mexia também nas
					    peças coloridas.

					    Os dois ficam no DOM e o tema esconde um; trocar o src por
					    JavaScript exigiria saber o tema antes de pintar, e a página
					    piscaria a arte errada. A caixa usa a proporção real do
					    arquivo (502×529), e não um quadrado, para não reservar faixa
					    vazia em volta. */}
					<div className="relative w-full max-w-[260px] md:max-w-[340px] lg:max-w-[420px] mx-auto lg:mx-0 aspect-[502/529]">
						<Image
							src="/images/404-illustration-O.webp"
							alt="Uma lâmpada acesa pendurada sobre criaturas desenhadas à mão"
							fill
							sizes="(max-width: 1024px) 80vw, 420px"
							className="object-contain in-[.light]:hidden"
						/>
						<Image
							src="/images/404-illustration.webp"
							alt=""
							fill
							sizes="(max-width: 1024px) 80vw, 420px"
							className="hidden object-contain in-[.light]:block"
						/>
					</div>

					<div className="flex flex-col items-start gap-5">
						{/* Eyebrow padrão do site, o mesmo das seções da home: marca,
						    caixa alta e a luz que varre letra a letra na entrada. */}
						<AnimatedPill className="text-(--color-eyebrow) uppercase w-fit items-start">
							Erro 404
						</AnimatedPill>

						{/* Libre 500, a fonte de títulos do site, em escala de abertura
						    de página. A largura em ch é o que quebra o título em duas
						    linhas sem <br>, que sumiria no responsivo.

						    Título e texto entram sem animação: numa página de erro o
						    conteúdo precisa estar legível no primeiro quadro. A
						    entrada fica só no eyebrow. */}
						<h1 className="text-[40px] md:text-[56px] lg:text-[72px] font-(family-name:--font-libre) font-medium leading-[1.05] tracking-tight text-(--color-accent) max-w-[14ch]">
							aqui dentro também tem luz.
						</h1>

						<p className="text-[15px] leading-relaxed text-(--color-muted) max-w-[52ch]">
							Mas esta página não existe ou o link foi montado de forma
							incorreta.
						</p>

						{/* Mesmo CTA das seções da home, com o filete embaixo. */}
						<Link
							href="/"
							className="group mt-2 w-fit border-b border-(--color-border) pb-2 flex items-center gap-3 text-base font-semibold text-(--color-brand-blue) hover:border-(--color-highlight) transition-colors"
						>
							Ir para a home
							<span
								aria-hidden
								className="text-(--color-highlight) text-xl leading-none transition-transform duration-300 group-hover:translate-x-1"
							>
								→
							</span>
						</Link>
					</div>
				</div>
			</div>
		</main>
	)
}
