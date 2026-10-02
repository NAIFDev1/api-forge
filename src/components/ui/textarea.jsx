import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Textarea = forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full rounded border border-line2 bg-surface p-2 font-mono text-sm leading-relaxed text-fg',
      'placeholder:text-subtle focus:border-accent focus:outline-none',
      className
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export { Textarea }