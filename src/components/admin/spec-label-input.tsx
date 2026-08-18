'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { normalizeLabel } from '@/lib/utils/normalize-label'

// Aceita rótulos ou valores: as duas tabelas têm a mesma forma, e o
// componente só precisa de id/name/normalized.
type SpecPreset = { id: string; name: string; normalized: string }

type Props = {
  value: string
  onChange: (value: string) => void
  // Chamado quando o campo perde o foco, para o editor resolver o texto
  // digitado contra os presets (grafia canônica).
  onResolve: () => void
  labels: SpecPreset[]
  placeholder?: string
}

// Combobox de sugestões para as linhas de informação técnica. Serve tanto ao
// campo de rótulo quanto ao de valor.
//
// Substitui o <datalist> nativo, que resolvia a função mas não a forma: o
// popup dele é desenhado pelo navegador, fora do alcance do CSS, então não
// havia como alinhá-lo ao campo nem uniformizá-lo entre navegadores. Aqui a
// lista é um elemento comum, posicionado em relação ao wrapper.
//
// O campo continua LIVRE: a lista é sugestão, e digitar algo fora dela é um
// caso previsto (informação que só aquele produto tem).
export function SpecLabelInput({ value, onChange, onResolve, labels, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Filtra pelo texto digitado, comparando na forma normalizada para que
  // "protecao" encontre "Grau de proteção".
  const term = normalizeLabel(value)
  const matches = term
    ? labels.filter((l) => l.normalized.includes(term))
    : labels

  // Fecha ao clicar fora. Só registra o listener enquanto está aberto.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const choose = (name: string) => {
    onChange(name)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown' && !open) {
      setOpen(true)
      return
    }
    if (!open || matches.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % matches.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + matches.length) % matches.length)
    } else if (e.key === 'Enter') {
      // Só intercepta o Enter quando há uma opção destacada; caso contrário o
      // usuário está confirmando o texto que escreveu.
      e.preventDefault()
      choose(matches[highlight]?.name ?? value)
    }
  }

  return (
    <div className="spec-label-combo" ref={wrapRef}>
      <Input
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        onChange={(e) => {
          onChange(e.target.value)
          setHighlight(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        // O blur resolve o rótulo, mas NÃO fecha a lista aqui: clicar numa
        // opção dispara blur antes do click, e fechar neste ponto cancelaria a
        // escolha. Quem fecha é o mousedown de fora ou o próprio choose().
        onBlur={onResolve}
        onKeyDown={onKeyDown}
      />

      {open && matches.length > 0 && (
        <ul className="spec-label-list" role="listbox">
          {matches.map((l, i) => (
            <li key={l.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === highlight}
                className={`spec-label-option${i === highlight ? ' is-active' : ''}`}
                // mousedown, e não click: o click chega depois do blur do
                // input, e a essa altura a lista pode já ter sido fechada.
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(l.name)
                }}
                onMouseEnter={() => setHighlight(i)}
              >
                {l.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
