import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-accent)] text-[var(--color-bg)]',
        outline:
          'border border-[var(--color-border)] text-[var(--color-primary)] bg-transparent',
        published:
          'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30',
        draft:
          'bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)]',
        review:
          'bg-amber-600/20 text-amber-400 border border-amber-600/30',
        scheduled:
          'bg-blue-600/20 text-blue-400 border border-blue-600/30',
        ai_generating:
          'bg-purple-600/20 text-purple-400 border border-purple-600/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>

const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
)

export { Badge, badgeVariants }
