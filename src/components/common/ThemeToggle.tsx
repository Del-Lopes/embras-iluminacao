'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/common/ThemeProvider'
import { cn } from '@/lib/utils/cn'

type Props = {
  className?: string
}

// Pílula com dois círculos que trocam de lado: o ativo fica preenchido e o
// outro acompanha, apagado.
//
// O estado vem do ThemeProvider, e não de um useState local: é ele que grava a
// escolha no localStorage e liga ou desliga a classe .light no <html>, que é o
// que o CSS do site inteiro observa. Um estado próprio aqui daria um botão que
// se mexe sem trocar o tema.
export default function ThemeToggle({ className }: Props) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      // Botão de verdade, e não uma div com role: assim o foco pela tecla Tab e
      // o acionamento por Enter ou espaço vêm de graça.
      aria-label={`Mudar para tema ${isDark ? 'claro' : 'escuro'}`}
      aria-pressed={isDark}
      className={cn(
        'flex w-16 h-8 p-1 rounded-full cursor-pointer transition-colors duration-300',
        // Borda em contraste com o próprio fundo da pílula, e não um cinza
        // vizinho dele: no escuro um branco a 25%, no claro um preto a 20%.
        isDark ? 'bg-zinc-950 border border-white/25' : 'bg-white border border-black/20',
        className
      )}
    >
      <div className="flex justify-between items-center w-full">
        <div
          className={cn(
            'flex justify-center items-center w-6 h-6 rounded-full transition-transform duration-300',
            isDark ? 'translate-x-0 bg-zinc-800' : 'translate-x-8 bg-gray-200'
          )}
        >
          {isDark ? (
            <Moon className="w-4 h-4 text-white" strokeWidth={1.5} />
          ) : (
            <Sun className="w-4 h-4 text-gray-700" strokeWidth={1.5} />
          )}
        </div>

        <div
          className={cn(
            'flex justify-center items-center w-6 h-6 rounded-full transition-transform duration-300',
            isDark ? 'bg-transparent' : '-translate-x-8'
          )}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-gray-500" strokeWidth={1.5} />
          ) : (
            <Moon className="w-4 h-4 text-black" strokeWidth={1.5} />
          )}
        </div>
      </div>
    </button>
  )
}
