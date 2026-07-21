import type { CSSProperties } from 'react'

interface HeroPillProps {
  text: string
  bulletColor?: string
  style?: CSSProperties
}

export default function HeroPill({
  text,
  bulletColor = 'var(--accent-steel)',
  style,
}: HeroPillProps) {
  return (
    <div className="hero-pill" style={style}>
      <span className="hero-pill-bullet" style={{ background: bulletColor }} />
      <span className="hero-pill-text">{text}</span>
    </div>
  )
}
