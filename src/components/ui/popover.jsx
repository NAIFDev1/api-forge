import { useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'

function Popover({ open, onClose, trigger, children, align = 'start', className }) {
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) onClose()
    }
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <div ref={wrapRef} className="relative inline-flex">
      {trigger}
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute top-full z-40 mt-1 min-w-[180px] animate-pop-in rounded border border-line2 bg-surface p-1 shadow-xl',
            align === 'end' ? 'right-0' : 'left-0',
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon: Icon, children, onClick, danger, shortcut, className }) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-base transition-colors',
        danger ? 'text-err hover:bg-err/10' : 'text-fg hover:bg-panel',
        className
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden="true" />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut && <span className="shrink-0 font-mono text-2xs text-subtle">{shortcut}</span>}
    </button>
  )
}

export { Popover, MenuItem }