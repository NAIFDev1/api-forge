import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex h-[18px] items-center rounded border px-1.5 text-2xs font-medium',
  {
    variants: {
      tone: {
        muted: 'border-line bg-bg text-muted',
        accent: 'border-accent/30 bg-accent/10 text-accent',
        ok: 'border-ok/30 bg-ok/10 text-ok',
        warn: 'border-warn/30 bg-warn/10 text-warn',
        err: 'border-err/30 bg-err/10 text-err',
        info: 'border-info/30 bg-info/10 text-info',
      },
    },
    defaultVariants: { tone: 'muted' },
  }
)

function Badge({ tone, className, children }) {
  return (
    <span className={cn(badgeVariants({ tone }), className)}>{children}</span>
  )
}

/**
 * Method pill. The method text is always rendered, so the colour is a
 * secondary cue rather than the only signal.
 */
function MethodTag({ method, className }) {
  const m = (method || 'GET').toUpperCase()
  return <span className={cn('font-mono text-2xs font-medium tracking-tight', `m-${m}`, className)}>{m}</span>
}

function StatusTag({ status, label, className }) {
  const tone =
    status == null ? 'muted' : status >= 500 ? 'err' : status >= 400 ? 'err' : status >= 300 ? 'info' : 'ok'
  return (
    <Badge tone={tone} className={cn('font-mono', className)}>
      {status ?? '—'} {label}
    </Badge>
  )
}

export { Badge, badgeVariants, MethodTag, StatusTag }