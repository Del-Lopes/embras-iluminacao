import Image from 'next/image'
import { socialLinks } from '@/config/navigation'

export default function Footer() {
	return (
		<footer className="py-20 px-8 border-t border-(--color-surface) bg-(--color-bg)">
			<div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
				<div className="flex items-center gap-2">
					<div className="relative h-8 w-[120px]">
						<Image
							src="/images/embras-logo-w.png"
							alt="Embras Iluminação"
							fill
							sizes="120px"
							className="object-contain opacity-80"
						/>
					</div>
				</div>

				<p className="text-(--color-muted) text-[10px] tracking-[0.3em] uppercase text-center">
					&copy;2026 Embras Iluminação
					<br />
					Todos os direitos reservados
				</p>

				<div className="flex gap-8">
					{socialLinks.map((link) => (
						<a
							key={link.label}
							href={link.href}
							target={link.isExternal ? '_blank' : undefined}
							rel={link.isExternal ? 'noopener noreferrer' : undefined}
							className="text-(--color-muted) text-[10px] tracking-widest uppercase hover:text-(--color-accent) transition-colors"
						>
							{link.label}
						</a>
					))}
				</div>
			</div>
		</footer>
	)
}
