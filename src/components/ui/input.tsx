import * as React from 'react'
import { cn } from '@/lib/utils/cn'

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md px-3 py-2',
          'border border-[var(--color-border)]',
          'bg-[var(--color-surface)] text-[var(--color-accent)]',
          'text-sm placeholder:text-[var(--color-muted)]',
          'transition-colors duration-[var(--transition-fast)]',
          // Sem outline/ring no foco — apenas a borda muda de cor (preto).
          'focus:outline-none focus:border-[var(--color-accent)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:border-red-500',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
