import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Command,
  Github,
  Info,
  Keyboard,
  Menu,
  Moon,
  Settings,
  Sun,
  X,
} from 'lucide-react'
import { useWorkspace } from '../context/WorkspaceContext'
import { Button } from './ui/button'
import { Tooltip } from './ui/tooltip'

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], label: 'Search everything' },
  { keys: ['Ctrl', 'Enter'], label: 'Send request' },
  { keys: ['Ctrl', 'B'], label: 'Toggle sidebar' },
  { keys: ['Ctrl', 'J'], label: 'New request' },
  { keys: ['Ctrl', 'E'], label: 'Environments' },
  { keys: ['Esc'], label: 'Close dialogs' },
]

export function Topbar() {
  const ws = useWorkspace()
  const shortcutsOpen = ws.shortcutsOpen
  const setShortcutsOpen = ws.setShortcutsOpen

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line bg-panel px-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={ws.toggleNavigation}
        aria-label={ws.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!ws.sidebarCollapsed}
        title="Toggle sidebar (Ctrl+B)"
      >
        <Menu className="h-4 w-4 lg:hidden" />
        <ChevronLeft className="hidden h-4 w-4 lg:block" />
      </Button>

      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-accent text-accentfg">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="text-base font-semibold tracking-tight text-fg">
          API<span className="text-accent">Forge</span>
        </span>
      </div>

      <button
        onClick={() => ws.setPaletteOpen(true)}
        className="ml-2 hidden h-7 flex-1 items-center gap-2 rounded border border-line2 bg-surface px-2 text-left text-sm text-subtle transition-colors hover:border-line2 hover:text-muted md:flex md:max-w-md"
      >
        <Command className="h-3.5 w-3.5" aria-hidden="true" />
        Search requests, history, environments…
        <kbd className="ml-auto rounded border border-line2 px-1 font-mono text-2xs">Ctrl K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-0.5">
        <Tooltip label="Search (Ctrl+K)">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => ws.setPaletteOpen(true)}
            aria-label="Search"
          >
            <Command className="h-4 w-4" />
          </Button>
        </Tooltip>
        <Tooltip label="Shortcuts (?)">
          <Button variant="ghost" size="icon" onClick={() => setShortcutsOpen((o) => !o)} aria-label="Keyboard shortcuts">
            <Keyboard className="h-4 w-4" />
          </Button>
        </Tooltip>
        <Tooltip label={`Switch to ${ws.theme === 'dark' ? 'light' : 'dark'} theme`}>
          <Button variant="ghost" size="icon" onClick={ws.toggleTheme} aria-label="Toggle theme">
            {ws.theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </Tooltip>
        <Tooltip label="Settings">
          <Button variant="ghost" size="icon" onClick={() => ws.setSettingsOpen(true)} aria-label="Settings">
            <Settings className="h-4 w-4" />
          </Button>
        </Tooltip>
        <Tooltip label="Source on GitHub">
          <a
            href="https://github.com/NAIFDev1/api-forge"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted transition-colors hover:bg-panel hover:text-fg"
            aria-label="APIForge on GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
        </Tooltip>
      </div>

      {shortcutsOpen && (
        <div className="absolute right-2 top-11 z-40 w-64 animate-pop-in rounded-md border border-line2 bg-surface p-2 shadow-2xl">
          <div className="flex items-center justify-between px-1 pb-1.5">
            <p className="text-2xs font-medium uppercase tracking-wide text-subtle">Shortcuts</p>
            <Button variant="ghost" size="icon-sm" onClick={() => setShortcutsOpen(false)} aria-label="Close shortcuts">
              <X className="h-3 w-3" />
            </Button>
          </div>
          <ul className="space-y-0.5">
            {SHORTCUTS.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-2 rounded px-1 py-1 text-sm text-muted hover:bg-panel">
                <span>{s.label}</span>
                <span className="flex shrink-0 gap-0.5">
                  {s.keys.map((k) => (
                    <kbd key={k} className="rounded border border-line2 bg-panel px-1 py-0.5 font-mono text-2xs text-fg">
                      {k}
                    </kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  )
}

export function Toaster() {
  const { toastQueue, dismissToast } = useWorkspace()

  if (toastQueue.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-8 right-3 z-[60] flex w-[min(340px,calc(100vw-1.5rem))] flex-col gap-1.5">
      {toastQueue.map((t) => {
        const Icon = t.tone === 'success' ? CheckCircle2 : t.tone === 'danger' ? AlertTriangle : t.tone === 'warn' ? AlertTriangle : Info
        const tone =
          t.tone === 'success' ? 'border-ok/40 text-ok' : t.tone === 'danger' ? 'border-err/40 text-err' : t.tone === 'warn' ? 'border-warn/40 text-warn' : 'border-line2 text-muted'
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex animate-slide-up items-start gap-2 rounded-md border bg-surface px-3 py-2 shadow-xl ${tone}`}
          >
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-fg">{t.message}</p>
              {t.detail && <p className="mt-0.5 text-2xs text-muted">{t.detail}</p>}
            </div>
            <button onClick={() => dismissToast(t.id)} aria-label="Dismiss notification" className="shrink-0 text-subtle hover:text-fg">
              <X className="h-3 w-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}