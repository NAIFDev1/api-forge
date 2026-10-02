import { cn } from '../../lib/utils'

function Tabs({ value, onChange, items, className }) {
  return (
    <div role="tablist" className={cn('flex items-center gap-0.5', className)}>
      {items.map((item) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              'relative inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-sm font-medium transition-colors',
              active ? 'bg-panel text-fg' : 'text-muted hover:text-fg'
            )}
          >
            {item.icon}
            {item.label}
            {item.count > 0 && (
              <span className="rounded bg-bg px-1 text-2xs tabular-nums text-subtle">{item.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export { Tabs }