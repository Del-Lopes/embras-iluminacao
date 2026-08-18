import type { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
	title: 'Política de Privacidade',
	description:
		'Como a Embras Iluminação coleta, usa, compartilha e protege os dados pessoais de quem navega no site, conforme a Lei Geral de Proteção de Dados.',
}

// Mês e ano exibidos no topo. Fica aqui em cima, e não perdido no meio do
// texto, para a revisão da política ser uma linha só.
const ATUALIZADO_EM = 'agosto de 2026'

/**
 * Política de privacidade. Página estática, sem nada vindo do banco e sem
 * animação de entrada: é um documento de leitura, e o texto precisa estar
 * inteiro no primeiro quadro.
 *
 * O conteúdo descreve o tratamento REAL do site: o formulário que libera os
 * arquivos técnicos do catálogo, o cookie de sessão da área administrativa e a
 * preferência de tema. Mudando qualquer um deles, esta página muda junto.
 */
export default function PoliticaDePrivacidadePage() {
	return (
		<main className="min-h-screen bg-(--color-bg)">
			<Header variant="solid" />

			{/* max-w-site é o token de 1366px do @theme; padding lateral e vertical
			    na escala das demais páginas de leitura. */}
			<article className="max-w-site mx-auto w-full px-6 md:px-8 lg:px-12 pt-15 md:pt-20 pb-15 md:pb-20 lg:pb-32">
				<header className="flex flex-col gap-3">
					<h1 className="text-[22px] md:text-[1.75rem] font-(family-name:--font-libre) font-medium leading-[1.3] tracking-tight text-(--color-accent)">
						Política de Privacidade
					</h1>
					<p className="text-[13px] uppercase tracking-[0.12em] text-(--color-muted)">
						Última atualização: {ATUALIZADO_EM}
					</p>
				</header>

				{/* Medida de leitura em ch: a linha cheia num container de 1366px
				    passaria de 150 caracteres, e o olho perde a linha seguinte. */}
				<div className="blog-content mt-10 md:mt-12 max-w-[80ch]">
					<p>
						Esta política explica como a Embras Iluminação trata os dados
						pessoais de quem navega neste site, entra em contato conosco ou
						baixa materiais do nosso catálogo. Ela segue a Lei Geral de
						Proteção de Dados Pessoais (Lei nº 13.709/2018).
					</p>

					<h2>Quem é responsável pelos seus dados</h2>
					<p>
						A responsável pelo tratamento é a Embras Iluminação, indústria de
						postes, luminárias LED e soluções de iluminação, com sede em Embu
						Guaçu, São Paulo, SP. Para qualquer assunto relacionado a esta
						política, o canal é o e-mail{' '}
						<a href="mailto:vendas@embrasiluminacao.com.br">
							vendas@embrasiluminacao.com.br
						</a>
						.
					</p>

					<h2>Quais dados coletamos</h2>
					<p>
						<strong>Dados que você informa.</strong> Ao solicitar o download de
						arquivos técnicos de um produto, pedir um orçamento ou nos procurar
						pelos canais de contato, coletamos nome, e-mail e telefone, junto
						com o produto ou material que originou o pedido. Se você escrever
						para nós, também guardamos o conteúdo da mensagem.
					</p>
					<p>
						<strong>Dados coletados automaticamente.</strong> Como em qualquer
						site, nossos servidores registram informações técnicas de acesso,
						entre elas endereço IP, data e hora, páginas visitadas, tipo de
						navegador e sistema operacional. Esses registros são exigidos pelo
						Marco Civil da Internet e servem para segurança e diagnóstico de
						problemas.
					</p>
					<p>
						Não coletamos dados sensíveis, não pedimos documentos e não tomamos
						nenhuma decisão automatizada a seu respeito.
					</p>

					<h2>Para que usamos esses dados</h2>
					<ul>
						<li>
							Responder pedidos de orçamento, dúvidas técnicas e contatos
							comerciais.
						</li>
						<li>
							Liberar o acesso a catálogos, fichas técnicas e demais materiais.
						</li>
						<li>
							Entrar em contato sobre o produto ou projeto que motivou o pedido.
						</li>
						<li>
							Entender quais produtos e páginas despertam mais interesse, de
							forma agregada.
						</li>
						<li>Manter o site no ar, seguro e livre de uso indevido.</li>
						<li>Cumprir obrigações legais e regulatórias.</li>
					</ul>

					<h2>Com que base legal tratamos</h2>
					<p>
						Cada uso tem um fundamento próprio na LGPD. O atendimento a pedidos
						e a preparação de propostas se apoiam em procedimentos preliminares
						de contrato. O funcionamento do site, a segurança e a comunicação
						sobre produtos de seu interesse se apoiam no legítimo interesse. Os
						registros de acesso e as obrigações fiscais e contábeis se apoiam no
						cumprimento de obrigação legal. Quando nenhuma dessas hipóteses se
						aplicar, pediremos seu consentimento, que pode ser retirado a
						qualquer momento.
					</p>

					<h2>Com quem compartilhamos</h2>
					<p>
						Não vendemos, alugamos ou cedemos dados pessoais. O compartilhamento
						acontece apenas com quem precisa participar da operação:
					</p>
					<ul>
						<li>
							Fornecedores de infraestrutura, como hospedagem, banco de dados,
							armazenamento de arquivos e envio de e-mails, que tratam os dados
							apenas sob nossas instruções.
						</li>
						<li>
							Representantes comerciais e parceiros envolvidos no atendimento do
							seu pedido, quando isso for necessário para responder você.
						</li>
						<li>
							Autoridades públicas, quando houver obrigação legal ou ordem
							judicial.
						</li>
					</ul>
					<p>
						Alguns desses fornecedores mantêm servidores fora do Brasil. Nesses
						casos, a transferência internacional segue as garantias previstas na
						LGPD.
					</p>

					<h2>Cookies e armazenamento no navegador</h2>
					<p>
						Este site usa o mínimo necessário para funcionar. Guardamos no seu
						navegador a preferência entre o tema claro e o escuro, para que a
						escolha continue valendo na próxima visita. A área administrativa,
						restrita à equipe da Embras, usa cookies de sessão para manter o
						login. Nenhum deles serve para publicidade nem acompanha você em
						outros sites.
					</p>
					<p>
						Você pode apagar ou bloquear esses itens nas configurações do seu
						navegador. Bloqueando os cookies de sessão, o acesso à área
						administrativa deixa de funcionar; o restante do site continua
						normalmente.
					</p>

					<h2>Por quanto tempo guardamos</h2>
					<p>
						Os dados de contato ficam conosco enquanto durar o relacionamento
						comercial e pelo prazo necessário para cumprir obrigações legais ou
						defender nossos direitos. Os registros de acesso ao site são
						mantidos pelo prazo mínimo previsto no Marco Civil da Internet.
						Encerrado o prazo, os dados são eliminados ou anonimizados.
					</p>

					<h2>Como protegemos</h2>
					<p>
						Adotamos medidas técnicas e administrativas para proteger os dados
						contra acesso não autorizado, perda ou alteração, entre elas conexão
						criptografada em todo o site, acesso restrito por autenticação e
						registro das ações feitas no painel administrativo. Nenhum sistema é
						infalível, e por isso mantemos esses controles em revisão.
					</p>

					<h2>Seus direitos</h2>
					<p>A LGPD garante a você o direito de:</p>
					<ul>
						<li>Confirmar se tratamos dados seus e acessar esses dados.</li>
						<li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
						<li>
							Pedir a anonimização, o bloqueio ou a eliminação de dados
							desnecessários ou tratados fora da lei.
						</li>
						<li>Solicitar a portabilidade a outro fornecedor.</li>
						<li>Saber com quem compartilhamos seus dados.</li>
						<li>
							Revogar o consentimento e pedir a eliminação dos dados tratados
							com base nele.
						</li>
						<li>
							Opor-se a um tratamento feito com base no legítimo interesse.
						</li>
					</ul>
					<p>
						Para exercer qualquer um deles, escreva para{' '}
						<a href="mailto:vendas@embrasiluminacao.com.br">
							vendas@embrasiluminacao.com.br
						</a>
						. Respondemos no menor prazo possível, podendo pedir informações
						adicionais para confirmar sua identidade antes de atender ao pedido.
					</p>

					<h2>Links para outros sites</h2>
					<p>
						Nossas páginas trazem links para serviços de terceiros, como
						WhatsApp e redes sociais. A partir do momento em que você sai daqui,
						vale a política de privacidade do serviço de destino, sobre a qual
						não temos controle.
					</p>

					<h2>Mudanças nesta política</h2>
					<p>
						Podemos atualizar este texto sempre que houver mudança nos serviços
						do site ou na legislação. A data no topo da página indica a última
						revisão, e o texto vigente é sempre o publicado aqui.
					</p>

					<h2>Fale com a gente</h2>
					<p>
						Dúvidas sobre esta política ou sobre o tratamento dos seus dados:
					</p>
					<ul>
						<li>
							E-mail:{' '}
							<a href="mailto:vendas@embrasiluminacao.com.br">
								vendas@embrasiluminacao.com.br
							</a>{' '}
							ou{' '}
							<a href="mailto:projetos@embrasiluminacao.com.br">
								projetos@embrasiluminacao.com.br
							</a>
						</li>
						<li>
							WhatsApp:{' '}
							<a
								href="https://wa.me/5511947467797"
								target="_blank"
								rel="noopener noreferrer"
							>
								11 94746-7797
							</a>
						</li>
						<li>
							Telefone: <a href="tel:+551136051589">11 3605-1589</a>
						</li>
						<li>Endereço: Embu Guaçu, São Paulo, SP</li>
					</ul>
				</div>
			</article>

			<Footer />
		</main>
	)
}
