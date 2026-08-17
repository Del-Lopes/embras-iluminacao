import Link from 'next/link'
import type { ReactNode } from 'react'

type Props = {
	href: string
	children: ReactNode
	className?: string
}

// Botão padrão do site: bloco azul sólido, texto branco, e o laranja
// preenchendo da esquerda para a direita no hover.
//
// O preenchimento é um ::before animado por transform (e não width ou
// background-position): transform roda na GPU e não provoca reflow. O texto
// vai num <span> com z-10 porque, sem isso, o ::before pintaria por cima dele.
export function ButtonLink({ href, children, className = '' }: Props) {
	return (
		<Link
			href={href}
			className={`group relative inline-block overflow-hidden rounded-none px-12 py-5 bg-(--color-brand-blue) text-[11px] uppercase tracking-[2px] font-semibold text-white cursor-pointer
				before:absolute before:inset-0 before:bg-(--color-highlight) before:origin-left before:scale-x-0 before:transition-transform before:duration-450 before:ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:before:scale-x-100 ${className}`}
		>
			<span className="relative z-10">{children}</span>
		</Link>
	)
}
