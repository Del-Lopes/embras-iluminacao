import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import './lp.css'

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  // absolute: o título já traz a marca, e o template do layout raiz a
  // repetiria no fim da linha.
  title: { absolute: 'Embras Iluminação · Postes de Aço e Alumínio Direto da Fábrica' },
  description:
    'Fabricamos postes de aço galvanizado e alumínio em escala industrial. Sem intermediário, sem atraso e sem desculpa quando o prazo aperta.',
  robots: { index: false, follow: false },
}

export default function LPLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`lp-page ${jetbrainsMono.variable}`}>
      {children}
    </div>
  )
}
