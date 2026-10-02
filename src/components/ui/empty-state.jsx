import { cn } from '../../lib/utils'

function EmptyState({ icon: Icon, title, body, action, className }) {
  return (
    <div
      className={cn(
        'flex h-full min-h-[160px] flex-col items-center justify-center gap-2 px-6 py-10 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-panel">
          <Icon className="h-4 w-4 text-subtle" aria-hidden="true" />
        </div>
      )}
      <p className="text-base font-medium text-fg">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {action}
    </div>
  )
}

function Spinner({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export { EmptyState, Spinner }