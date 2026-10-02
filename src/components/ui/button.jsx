import { forwardRef } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center rounded font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45',
  {
    variants: {
      variant: {
        default: 'border border-line2 bg-panel text-fg hover:border-line2 hover:bg-surface',
        primary: 'border border-transparent bg-accent text-accentfg hover:opacity-90',
        outline: 'border border-line2 bg-transparent text-fg hover:bg-panel',
        ghost: 'border border-transparent bg-transparent text-muted hover:bg-panel hover:text-fg',
        subtle: 'border border-transparent bg-bg text-muted hover:bg-panel hover:text-fg',
        danger: 'border border-line2 bg-transparent text-err hover:bg-err/10',
      },
      size: {
        xs: 'h-6 gap-1 px-2 text-xs',
        sm: 'h-7 gap-1.5 px-2.5 text-sm',
        md: 'h-8 gap-2 px-3 text-base',
        lg: 'h-9 gap-2 px-4 text-base',
        icon: 'h-7 w-7 justify-center',
        'icon-sm': 'h-6 w-6 justify-center',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
)

const Button = forwardRef(({ className, variant, size, as: As = 'button', ...props }, ref) => (
  <As ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
))
Button.displayName = 'Button'

export { Button, buttonVariants }