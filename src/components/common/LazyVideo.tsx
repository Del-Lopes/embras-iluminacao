'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils/cn'

type Props = {
  src: string
  // Quadro exibido antes do play. É uma imagem comum, bem mais leve que o
  // vídeo, e é ela que aparece no carregamento da página.
  poster: string
  label: string
  className?: string
}

/**
 * Vídeo que só existe depois do clique.
 *
 * Enquanto ninguém pede o play, a página não tem elemento <video> nenhum: o que
 * está no DOM é a imagem de capa e um botão. É isso que mantém o arquivo fora
 * do carregamento inicial — `preload="none"` ajudaria, mas navegadores tratam a
 * dica com liberdade, e um <video> presente ainda custa requisição de metadados
 * e trabalho de layout na medição de performance.
 *
 * No clique o elemento é criado já com autoPlay: o gesto do usuário autoriza a
 * reprodução, então não é preciso um segundo toque no controle nativo.
 */
export function LazyVideo({ src, poster, label, className }: Props) {
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  return (
    <div className={cn('relative w-full h-full overflow-hidden bg-(--color-surface)', className)}>
      {playing ? (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          controls
          autoPlay
          playsInline
          preload="auto"
          className="w-full h-full object-cover"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 w-full h-full cursor-pointer"
          aria-label={`Assistir: ${label}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poster}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />

          {/* Véu escuro: garante contraste do botão sobre qualquer quadro. */}
          <span className="absolute inset-0 bg-black/25 transition-colors duration-300 group-hover:bg-black/35" />

          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex items-center justify-center w-16 h-16 rounded-full bg-white/90 text-(--color-brand-blue) transition-colors duration-300 group-hover:bg-(--color-highlight) group-hover:text-white">
              {/* Triângulo deslocado 2px à direita: um play centrado pelo
                  retângulo do ícone parece torto dentro de um círculo. */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="translate-x-[2px]">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </button>
      )}
    </div>
  )
}
