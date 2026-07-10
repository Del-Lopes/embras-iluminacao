export type SEOConfig = {
  title: string
  description: string
  openGraph: {
    title: string
    description: string
    url: string
    siteName: string
    images: { url: string; width: number; height: number; alt: string }[]
    locale: string
    type: string
  }
  twitter: {
    card: string
    title: string
    description: string
    images: string[]
  }
}

export type NavItem = {
  label: string
  href: string
  isExternal?: boolean
  /** Item exibido sem link (ex.: página ainda não criada) */
  disabled?: boolean
}
