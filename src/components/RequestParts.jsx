import { useWorkspace } from '../context/WorkspaceContext'
import { MethodTag, StatusTag } from './ui/badge'
import { Spinner } from './ui/empty-state'
import { formatBytes, formatClock, formatMs, formatTimestamp } from '../utils/format'

export function MethodSelector({ value, onChange, methods, className = '' }) {
  return (
    <div
      role="radiogroup"
      aria-label="HTTP method"
      className={`relative inline-flex shrink-0 ${className}`}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="HTTP method"
        className={`h-8 cursor-pointer appearance-none rounded-l border border-line2 bg-surface pl-2.5 pr-7 font-mono text-sm font-medium focus:border-accent focus:outline-none m-${value}`}
      >
        {methods.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-subtle"
      >
        <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export function UrlInput({ value, onChange, onSend, loading, canSend, hasError }) {
  return (
    <div
      className={`flex min-w-0 flex-1 items-center overflow-hidden rounded border bg-surface focus-within:border-accent ${
        hasError ? 'border-err' : 'border-line2'
      }`}
    >
      <label htmlFor="url-input" className="sr-only">
        Request URL
      </label>
      <input
        id="url-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://jsonplaceholder.typicode.com/users"
        spellCheck={false}
        autoComplete="off"
        // Ctrl/Cmd+Enter is handled by the global hotkey so it cannot fire twice.
        className="min-w-0 flex-1 bg-transparent px-3 font-mono text-sm text-fg placeholder:text-subtle focus:outline-none"
      />
      <button
        type="button"
        onClick={onSend}
        disabled={!canSend || loading}
        title="Send request (Ctrl+Enter)"
        className="m-0.5 inline-flex h-7 shrink-0 items-center gap-1.5 rounded bg-accent px-3 text-sm font-semibold text-accentfg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {loading ? (
          <>
            <Spinner />
            <span>Sending</span>
          </>
        ) : (
          <>
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Send</span>
          </>
        )}
      </button>
    </div>
  )
}

export function StatusBar() {
  const { status, response, error, request, activeEnvironment, history } = useWorkspace()

  return (
    <footer className="flex h-6 shrink-0 items-center gap-3 overflow-x-auto border-t border-line bg-panel px-2 text-2xs text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${
            status === 'idle' ? 'bg-subtle' : status === 'loading' ? 'bg-warn animate-pulse' : status === 'success' ? 'bg-ok' : 'bg-err'
          }`}
        />
        <span className="capitalize">{status === 'success' ? 'Ready' : status}</span>
      </span>

      {response && (
        <>
          <span className="text-fg">Status {response.status} {response.statusText}</span>
          <span>{formatMs(response.timeMs)}</span>
          <span>{formatBytes(response.size)}</span>
        </>
      )}

      {status === 'error' && error && <span className="text-err">{error.message}</span>}

      <span className="ml-auto flex shrink-0 items-center gap-3">
        <span>Env: {activeEnvironment?.name ?? 'None'}</span>
        <span>{request.method}</span>
        <span>{history.length} in history</span>
      </span>
    </footer>
  )
}

export function HistoryRow({ item, onReopen, onDelete, active }) {
  return (
    <li className="group flex items-center gap-2 px-2 py-1 hover:bg-panel">
      <button
        type="button"
        onClick={() => onReopen(item)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        title={item.requestUrl || item.url}
      >
        <MethodTag method={item.method} className="w-[46px] shrink-0" />
        <span className={`min-w-0 flex-1 truncate font-mono text-xs ${active ? 'text-fg' : 'text-muted'}`}>
          {pathOf(item.requestUrl || item.url)}
        </span>
        <span className="shrink-0">
          {item.error ? (
            <span className="text-2xs text-err">failed</span>
          ) : (
            <StatusTag status={item.status} />
          )}
        </span>
      </button>
      <span className="shrink-0 text-2xs text-subtle group-hover:hidden">{formatTimestamp(item.at)}</span>
      <span className="hidden shrink-0 text-2xs text-subtle group-hover:inline">{formatClock(item.at)}</span>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        aria-label="Delete history entry"
        className="shrink-0 rounded p-0.5 text-subtle opacity-0 transition-opacity hover:text-err focus-visible:opacity-100 group-hover:opacity-100"
      >
        <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  )
}

export function pathOf(url) {
  try {
    const u = new URL(url)
    return u.pathname === '/' ? u.host : u.pathname + u.search
  } catch {
    return url
  }
}