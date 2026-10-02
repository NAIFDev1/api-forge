import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Select = forwardRef(({ className, children, ...props }, ref) => (
  <div className="relative inline-flex">
    <select
      ref={ref}
      className={cn(
        'h-7 cursor-pointer appearance-none rounded border border-line2 bg-panel pl-2 pr-6 text-sm text-fg',
        'focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-subtle"
    >
      <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  </div>
))
Select.displayName = 'Select'

export { Select }