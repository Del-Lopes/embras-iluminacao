import type React from 'react'

// JSX typing for the <model-viewer> web component (@google/model-viewer).
// The element is registered client-side at runtime; this only types the tag.
type ModelViewerAttributes = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  src?: string
  poster?: string
  alt?: string
  'camera-controls'?: boolean | ''
  'auto-rotate'?: boolean | ''
  ar?: boolean | ''
  'ar-modes'?: string
  'ar-placement'?: string
  'ar-scale'?: string
  'disable-zoom'?: boolean | ''
  'shadow-intensity'?: string
  'min-camera-orbit'?: string
  'max-camera-orbit'?: string
  exposure?: string
  'environment-image'?: string
  'tone-mapping'?: string
  loading?: 'auto' | 'lazy' | 'eager'
  reveal?: 'auto' | 'manual' | 'interaction'
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerAttributes
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerAttributes
    }
  }
}

export {}
