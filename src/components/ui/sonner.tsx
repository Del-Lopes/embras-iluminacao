'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'

// Toasts com o visual padrão do Sonner: card branco, cantos arredondados, sombra
// suave, título em negrito + descrição em cinza. Tema claro fixo (independe do
// tema do site) para ficar sempre igual ao design de referência.
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      closeButton
      toastOptions={{
        style: {
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '14px',
          background: '#ffffff',
          color: '#18181b',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: '10px',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
          padding: '16px',
        },
        classNames: {
          title: 'app-toast-title',
          description: 'app-toast-description',
        },
      }}
      {...props}
    />
  )
}
