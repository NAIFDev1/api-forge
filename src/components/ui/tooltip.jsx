import { useState } from 'react'
import { cn } from '../../lib/utils'

function Tooltip({ label, children, side = 'bottom' }) {
  const [open, setOpen] = useState(false)

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-50 whitespace-nowrap rounded border border-line2 bg-panel px-1.5 py-0.5 text-2xs text-fg shadow-lg',
            side === 'bottom' ? 'top-full left-1/2 mt-1 -translate-x-1/2' : 'bottom-full left-1/2 mb-1 -translate-x-1/2'
          )}
        >
          {label}
        </span>
      )}
    </span>
  )
}

export { Tooltip }