import type { Metadata } from 'next'
import { BannersManager } from '@/components/admin/banners-manager'
import { getBannerProductOptions, getBanners } from '@/server/banner.actions'

export const metadata: Metadata = {
	title: 'Banners',
	robots: { index: false, follow: false },
}

export default async function BannersPage() {
	// As duas leituras são independentes: a lista de produtos alimenta o
	// seletor do formulário e não depende dos banners.
	const [banners, products] = await Promise.all([getBanners(), getBannerProductOptions()])

	return (
		<div className="dashboard-page">
			<header className="dashboard-header">
				<div>
					<h1 className="dashboard-title">Banners</h1>
					<p className="dashboard-subtitle">
						Os slides do topo da página inicial. Cada um mostra a foto de um projeto
						à esquerda e o produto usado nele à direita, com o botão levando à página
						do produto.
					</p>
				</div>
			</header>

			<BannersManager banners={banners} products={products} />
		</div>
	)
}
