import type { Metadata } from 'next'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = {
  title: 'Acesso Administrativo',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-logo">Embras</span>
          <p className="login-subtitle">Painel Administrativo</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
