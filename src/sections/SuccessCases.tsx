import Image from 'next/image'
import Link from 'next/link'
import {
	AnimatedParagraph,
	AnimatedPill,
} from '@/components/common/AnimatedTypography'
import { ButtonLink } from '@/components/common/ButtonLink'
import { GridReveal } from '@/components/common/GridReveal'
import type { ProjectCardData } from '@/server/project.actions'

type CaseCard = {
	title: string
	location: string
	image: string
	// slug != null → o card leva à página do projeto (/projetos/[slug]).
	slug: string | null
}

// Projetos-destaque de fallback (usados enquanto não há projetos cadastrados no
// admin marcados como destaque). São 5 porque o grid tem 5 posições: um card
// grande à esquerda ocupando as duas linhas, e quatro menores à direita.
const FALLBACK_CASES: CaseCard[] = [
	{ title: 'Mansão Alpha', location: 'São Paulo', image: '/images/case-1.png', slug: null },
	{ title: 'Fazenda Aurora', location: 'Minas Gerais', image: '/images/hero.png', slug: null },
	{ title: 'Apartamento Garden', location: 'Rio de Janeiro', image: '/images/case-1.png', slug: null },
	{ title: 'Residência Moderna', location: 'Curitiba', image: '/images/hero.png', slug: null },
	{ title: 'Cobertura Vista', location: 'Florianópolis', image: '/images/case-1.png', slug: null },
]

type Props = {
	featured?: ProjectCardData[]
	recent?: ProjectCardData[]
}

export default function SuccessCases({ featured = [], recent = [] }: Props) {
	// Grid principal: destaques vindos do admin (is_featured), completados com os
	// fallbacks até fechar as 5 posições do layout.
	const featuredCases: CaseCard[] = featured.map((p) => ({
		title: p.name,
		location: p.location ?? '',
		image: p.cover_image || '/images/case-1.png',
		slug: p.slug,
	}))
	const cases: CaseCard[] = [...featuredCases, ...FALLBACK_CASES].slice(0, 5)

	return (
		<section
			id="projetos"
			className="py-15 md:py-20 lg:py-32 px-6 md:px-8 lg:px-12 max-w-site mx-auto bg-(--color-bg) overflow-hidden"
		>
			{/* Mesmo par das outras seções da home: rótulo + uma declaração
			    grande, sem título. Medida (46ch) e entrelinha (1.2) iguais, para
			    as três lerem como uma família. */}
			<div className="mb-12.5 md:mb-20 flex flex-col items-start gap-5">
				<AnimatedPill className="text-(--color-eyebrow) uppercase w-fit items-start">
					Projetos
				</AnimatedPill>
				<AnimatedParagraph
					direction="left"
					className="text-[22px] md:text-[1.75rem] font-(family-name:--font-libre) font-medium leading-[1.3]! tracking-tight text-pretty md:max-w-[46ch] text-(--color-accent)!"
				>
					Nossa iluminação está em residências, ambientes comerciais e
					grandes produções de televisão. Conheça alguns dos projetos
					que já receberam a luz da Embras.
				</AnimatedParagraph>
			</div>

			{/* Grid no formato da landing /postes: 2fr 1fr 1fr em duas linhas, com
			    o primeiro card ocupando a coluna larga inteira. Em telas menores
			    vira 2 colunas e, no celular, uma só.

			    A antiga coreografia (linhas em cruz varrendo o grid + selo
			    central) saiu por completo; a entrada agora é o GridReveal. */}
			{/* Direções na ordem do grid — cada peça entra pela borda mais
			    próxima da sua posição final:
			      1 (coluna larga, à esquerda) ← esquerda
			      2 (topo, centro)             ← cima
			      3 (topo, direita)            ← direita
			      4 (base, centro)             ← baixo
			      5 (base, direita)            ← direita
			    O overflow-hidden da <section> impede que o deslocamento inicial
			    gere barra de rolagem horizontal. */}
			<GridReveal
				directions={['left', 'top', 'right', 'bottom', 'right']}
				className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr] lg:grid-rows-2 gap-4 lg:h-160"
			>
				{cases.map((item, index) => {
					const inner = (
						<>
							<Image
								src={item.image}
								alt={item.title}
								fill
								sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
								// Dessaturada e apagada em repouso; ganha cor, luz e um
								// zoom leve no hover. Mesma transição de 1s do original.
								className="object-cover opacity-50 grayscale contrast-[1.1] transition-all duration-1000 group-hover:opacity-85 group-hover:grayscale-0 group-hover:contrast-100 group-hover:scale-[1.04]"
							/>

							{/* Véu escuro fixo: garante contraste do texto sobre
							    qualquer foto, clara ou escura. */}
							<div className="absolute inset-0 bg-linear-to-t from-[#050505]/85 via-[#050505]/10 to-[#050505]/50 pointer-events-none" />

							{/* Faixa de luz que varre o card no hover. */}
							<div className="absolute inset-0 bg-linear-to-br from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

							{/* transform-gpu mantém este bloco SEMPRE na própria camada
							    de composição. Sem ele, as animações de transform da
							    imagem e da faixa de luz (1000ms) promovem o conteúdo
							    do card a uma camada temporária durante o hover: ali o
							    texto troca de antialiasing subpixel para escala de
							    cinza, o que aparenta mudança de peso, e volta ao
							    normal quando a camada é descartada. Com a camada
							    fixa, o modo de renderização nunca alterna. */}
							<div className="absolute left-6 right-6 bottom-6 z-10 flex flex-col gap-1.5 pointer-events-none transform-gpu">
								{item.location && (
									<span className="text-[11px] uppercase tracking-[0.25em] text-(--color-highlight)">
										{item.location}
									</span>
								)}
								{/* Libre Franklin: a fonte da home, e não a da landing
								    /postes, de onde veio só o layout. */}
								<span className="font-(family-name:--font-libre) font-medium text-lg lg:text-[22px] leading-tight tracking-tight text-white">
									{item.title}
								</span>
							</div>
						</>
					)

					// O primeiro card ocupa as duas linhas da coluna larga.
					const cardClass = `group relative overflow-hidden bg-[#0f0f0f] border border-white/10 min-h-[260px] lg:min-h-0 ${
						index === 0 ? 'lg:row-span-2' : ''
					}`

					return item.slug ? (
						<Link key={`${item.title}-${index}`} href={`/projetos/${item.slug}`} className={cardClass}>
							{inner}
						</Link>
					) : (
						<div key={`${item.title}-${index}`} className={cardClass}>
							{inner}
						</div>
					)
				})}
			</GridReveal>

			{/* Botão "Ver mais projetos" → listagem paginada */}
			<div className="mt-12.5 md:mt-16 flex justify-center">
				<ButtonLink href="/projetos">Ver mais projetos</ButtonLink>
			</div>

			{/* Faixa de cards menores dos projetos cadastrados no admin */}
			{recent.length > 0 && (
				<div className="success-cases-strip">
					{recent.map((project) => (
						<Link
							key={project.id}
							href={`/projetos/${project.slug}`}
							className="success-cases-strip-card group"
						>
							<div className="success-cases-strip-img">
								{project.cover_image ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img src={project.cover_image} alt={project.name} loading="lazy" />
								) : (
									<span className="success-cases-strip-img-empty" aria-hidden="true" />
								)}
							</div>
							<div className="success-cases-strip-info">
								<span className="success-cases-strip-name">{project.name}</span>
								{project.location && (
									<span className="success-cases-strip-loc">{project.location}</span>
								)}
							</div>
						</Link>
					))}
				</div>
			)}
		</section>
	)
}
