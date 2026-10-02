import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRight,
  Clock,
  CornerDownLeft,
  FileJson,
  Folder,
  Globe,
  History,
  Layers,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
} from 'lucide-react'
import { useWorkspace } from '../context/WorkspaceContext'
import { EmptyState } from './ui/empty-state'

/** Global search + action launcher. Opened with Ctrl/Cmd+K. */
export function CommandPalette() {
  const ws = useWorkspace()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    setOpen(ws.paletteOpen)
  }, [ws.paletteOpen])

  useEffect(() => {
    if (!ws.paletteOpen) return
    setQuery('')
    setIndex(0)
    const t = setTimeout(() => inputRef.current?.focus(), 20)
    return () => clearTimeout(t)
  }, [ws.paletteOpen])

  const commands = useMemo(() => {
    const actions = [
      { id: 'new', group: 'Actions', label: 'New request', icon: <Plus className="h-3.5 w-3.5" />, run: () => ws.resetRequest() },
      { id: 'theme', group: 'Actions', label: `Switch to ${ws.theme === 'dark' ? 'light' : 'dark'} theme`, icon: ws.theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />, run: () => ws.toggleTheme() },
      { id: 'sidebar', group: 'Actions', label: `${ws.sidebarCollapsed ? 'Expand' : 'Collapse'} sidebar`, icon: <Layers className="h-3.5 w-3.5" />, run: () => ws.setSidebarCollapsed(!ws.sidebarCollapsed) },
      { id: 'envs', group: 'Actions', label: 'Manage environments', icon: <Globe className="h-3.5 w-3.5" />, run: () => ws.setEnvManagerOpen(true) },
      { id: 'history', group: 'Actions', label: 'Clear history', icon: <History className="h-3.5 w-3.5" />, run: () => ws.clearHistory() },
      { id: 'settings', group: 'Actions', label: 'Open settings', icon: <Settings className="h-3.5 w-3.5" />, run: () => ws.setSettingsOpen(true) },
    ]

    const requests = ws.collections.flatMap((c) =>
      c.requests.map((r) => ({
        id: `req_${r.id}`,
        group: c.name,
        label: r.name,
        icon: <FileJson className="h-3.5 w-3.5" />,
        hint: `${r.method} ${r.url}`,
        run: () => ws.patchRequest({ ...r, id: ws.request.id || r.id }),
      }))
    )

    const envs = ws.environments.map((e) => ({
      id: `env_${e.id}`,
      group: 'Environments',
      label: e.name,
      icon: <Globe className="h-3.5 w-3.5" />,
      hint: `${e.variables.length} variables`,
      run: () => ws.setActiveEnvironmentId(e.id),
    }))

    const history = ws.history.slice(0, 20).map((h) => ({
      id: `hist_${h.id}`,
      group: 'History',
      label: `${h.method} ${h.requestUrl || h.url}`,
      icon: <Clock className="h-3.5 w-3.5" />,
      hint: h.status ? `${h.status}` : 'failed',
      run: () => ws.patchRequest({ ...h.request, id: ws.request.id || h.request.id }),
    }))

    const all = [...actions, ...requests, ...envs, ...history]
    const q = query.trim().toLowerCase()
    if (!q) return all.slice(0, 40)
    return all
      .filter((c) => `${c.label} ${c.group} ${c.hint ?? ''}`.toLowerCase().includes(q))
      .slice(0, 40)
  }, [query, ws])

  useEffect(() => setIndex(0), [query])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        ws.setPaletteOpen(false)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIndex((i) => Math.min(i + 1, commands.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = commands[index]
        if (cmd) {
          cmd.run()
          ws.setPaletteOpen(false)
        }
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open, commands, index, ws])

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [index])

  if (!open) return null

  let lastGroup = null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]">
      <div className="absolute inset-0 bg-black/55 animate-fade-in" onClick={() => ws.setPaletteOpen(false)} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-xl animate-pop-in overflow-hidden rounded-md border border-line2 bg-surface shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search className="h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search requests, history, environments or actions…"
            aria-label="Search commands"
            className="h-11 flex-1 bg-transparent text-base text-fg placeholder:text-subtle focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded border border-line2 px-1 py-0.5 font-mono text-2xs text-subtle sm:block">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1">
          {commands.length === 0 ? (
            <EmptyState icon={Search} title="No results" body={`Nothing matches "${query}".`} />
          ) : (
            commands.map((cmd, i) => {
              const header = cmd.group !== lastGroup ? cmd.group : null
              lastGroup = cmd.group
              return (
                <div key={cmd.id}>
                  {header && (
                    <p className="px-2 pb-0.5 pt-2 text-2xs font-medium uppercase tracking-wide text-subtle">{header}</p>
                  )}
                  <button
                    data-active={i === index}
                    onMouseEnter={() => setIndex(i)}
                    onClick={() => {
                      cmd.run()
                      ws.setPaletteOpen(false)
                    }}
                    className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left ${
                      i === index ? 'bg-panel text-fg' : 'text-muted'
                    }`}
                  >
                    <span className="shrink-0 text-subtle">{cmd.icon}</span>
                    <span className="min-w-0 flex-1 truncate text-base">{cmd.label}</span>
                    {cmd.hint && <span className="max-w-[45%] shrink-0 truncate font-mono text-2xs text-subtle">{cmd.hint}</span>}
                    {i === index && <CornerDownLeft className="h-3 w-3 shrink-0 text-subtle" aria-hidden="true" />}
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-line bg-panel px-3 py-1.5 text-2xs text-subtle">
          <span className="inline-flex items-center gap-1">
            <ArrowRight className="h-3 w-3 rotate-180" aria-hidden="true" /> navigate
          </span>
          <span>Enter run</span>
          <span className="ml-auto">{commands.length} results</span>
        </div>
      </div>
    </div>,
    document.body
  )
}