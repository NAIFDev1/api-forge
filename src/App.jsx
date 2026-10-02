import { useCallback, useMemo, useState } from 'react'
import { useWorkspace } from './context/WorkspaceContext'
import { useRequestRunner } from './hooks/useRequestRunner'
import { useHotkeys } from './hooks/useHotkeys'
import { Toaster, Topbar } from './components/Chrome'
import { Sidebar } from './components/Sidebar'
import { RequestBuilder } from './components/RequestBuilder'
import { ResponsePanel } from './components/ResponsePanel'
import { StatusBar } from './components/RequestParts'
import { CommandPalette } from './components/CommandPalette'
import { EnvironmentsManager, SettingsDialog } from './components/Dialogs'
import { Button } from './components/ui/button'
import { validateJson } from './utils/format'

const MIN_PANEL = 22

export default function App() {
  const ws = useWorkspace()
  const { send, copyResponse } = useRequestRunner()
  const [split, setSplit] = useState(52)
  const [dragging, setDragging] = useState(false)

  // An unresolved {{VAR}} is allowed: the builder warns about it and the
  // response panel reports whatever the endpoint made of the placeholder.
  const urlEmpty = !ws.request.url.trim()
  const bodyInvalid =
    ws.request.body?.type === 'json' && !validateJson(ws.request.body.text).valid
  const canSend = !urlEmpty && !bodyInvalid && ws.status !== 'loading'

  const openPalette = useCallback(() => {
    ws.setPaletteOpen(!ws.paletteOpen)
  }, [ws])

  const shortcuts = useMemo(
    () => ({
      // Chrome and Edge reserve Ctrl+K for the omnibox and ignore
      // preventDefault, so the palette also answers to these aliases.
      'mod+k': openPalette,
      'mod+shift+p': openPalette,
      'mod+shift+f': openPalette,
      'mod+enter': () => canSend && send(),
      'mod+b': () => ws.toggleNavigation(),
      'mod+j': () => ws.resetRequest(),
      'mod+e': () => ws.setEnvManagerOpen(true),
      'mod+/': () => ws.setSettingsOpen(true),
      '?': () => ws.setShortcutsOpen(!ws.shortcutsOpen),
      escape: () => {
        ws.setPaletteOpen(false)
        ws.setSettingsOpen(false)
        ws.setEnvManagerOpen(false)
        ws.setShortcutsOpen(false)
      },
    }),
    [ws, canSend, send, openPalette]
  )

  useHotkeys(shortcuts)

  /* splitter drag */
  const onPointerDown = useCallback(
    (e) => {
      e.preventDefault()
      setDragging(true)
      const container = e.currentTarget.parentElement

      const move = (ev) => {
        const rect = container.getBoundingClientRect()
        const pct = ((ev.clientY - rect.top) / rect.height) * 100
        setSplit(Math.min(100 - MIN_PANEL, Math.max(MIN_PANEL, pct)))
      }
      const up = () => {
        setDragging(false)
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    },
    []
  )

  const onSplitterKey = useCallback(
    (e) => {
      if (e.key === 'ArrowUp') setSplit((s) => Math.min(100 - MIN_PANEL, s + 3))
      if (e.key === 'ArrowDown') setSplit((s) => Math.max(MIN_PANEL, s - 3))
    },
    []
  )

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      <Topbar />

      <div className="flex min-h-0 flex-1">
        <div
          className={`${ws.sidebarCollapsed ? 'w-[52px]' : 'w-[272px]'} hidden shrink-0 lg:block`}
        >
          <Sidebar onSend={send} canSend={canSend} />
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            {/* Request side */}
            <div
              className="flex min-h-[240px] flex-col border-b border-line bg-bg lg:border-b-0 lg:border-r"
              style={{ flexBasis: dragging ? 'auto' : `${split}%`, flexGrow: 0, flexShrink: 0 }}
            >
              <RequestBuilder />
            </div>

            {/* Splitter */}
            <div
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize panels"
              tabIndex={0}
              onPointerDown={onPointerDown}
              onKeyDown={onSplitterKey}
              className={`hidden h-1 shrink-0 cursor-row-resize bg-transparent transition-colors hover:bg-accent/40 lg:block lg:w-1 lg:cursor-col-resize ${
                dragging ? 'bg-accent/60' : ''
              }`}
              style={{ marginLeft: '-2px' }}
            />

            {/* Response side */}
            <div className="flex min-h-[200px] min-w-0 flex-1 flex-col bg-surface">
              <ResponsePanel copyResponse={copyResponse} />
            </div>
          </div>

          <StatusBar />
        </main>
      </div>

      {/* Mobile sidebar drawer */}
      {ws.mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => ws.setMobileNavOpen(false)} aria-hidden="true" />
          <div className="relative h-full w-[280px] max-w-[85vw] animate-slide-in border-r border-line bg-bg">
            <Sidebar onSend={send} canSend={canSend} />
          </div>
        </div>
      )}

      <MobileNav onSend={send} canSend={canSend} />

      <CommandPalette />
      <EnvironmentsManager />
      <SettingsDialog />
      <Toaster />
    </div>
  )
}

function MobileNav({ onSend, canSend }) {
  const ws = useWorkspace()
  const { status } = ws

  return (
    <div className="flex h-12 shrink-0 items-center gap-1.5 border-t border-line bg-panel px-2 lg:hidden">
      <Button size="sm" variant="outline" onClick={() => ws.setMobileNavOpen(true)}>
        Workspace
      </Button>
      <Button size="sm" variant="primary" className="ml-auto" disabled={!canSend} onClick={onSend}>
        {status === 'loading' ? 'Sending…' : 'Send'}
      </Button>
    </div>
  )
}