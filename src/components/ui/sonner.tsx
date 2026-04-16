'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '15px',
          minWidth: '320px',
          padding: '26px 16px',
          borderRadius: '6px',
        },
      }}
      {...props}
    />
  )
}
