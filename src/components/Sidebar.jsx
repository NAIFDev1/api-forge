import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Folder,
  FolderPlus,
  History,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react'
import { useWorkspace } from '../context/WorkspaceContext'
import { Badge, MethodTag } from './ui/badge'
import { Button } from './ui/button'
import { EmptyState } from './ui/empty-state'
import { MenuItem, Popover } from './ui/popover'
import { HistoryRow, MethodSelector, UrlInput } from './RequestParts'

function matchesQuery(query, ...fields) {
  if (!query.trim()) return true
  const q = query.toLowerCase()
  return fields.some((f) => String(f ?? '').toLowerCase().includes(q))
}

export function Sidebar({ onSend, canSend }) {
  const ws = useWorkspace()
  const [query, setQuery] = useState('')
  const [view, setView] = useState('collections')
  const [expanded, setExpanded] = useState(() => new Set(ws.collections.map((c) => c.id)))

  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const filteredCollections = useMemo(
    () =>
      ws.collections
        .map((c) => ({
          ...c,
          requests: c.requests.filter((r) => matchesQuery(query, r.name, r.url, r.method)),
        }))
        .filter((c) => matchesQuery(query, c.name) || c.requests.length > 0),
    [ws.collections, query]
  )

  const filteredHistory = useMemo(
    () => ws.history.filter((h) => matchesQuery(query, h.requestUrl, h.url, h.method, h.status)),
    [ws.history, query]
  )

  const totalRequests = ws.collections.reduce((n, c) => n + c.requests.length, 0)

  return (
    <aside
      className={`flex h-full min-h-0 shrink-0 flex-col border-r border-line bg-bg ${ws.sidebarCollapsed ? 'w-[52px]' : 'w-[272px]'} transition-[width] duration-200`}
      aria-label="Workspace"
    >
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-line px-2">
        <div className="flex items-center gap-0.5" role="tablist" aria-label="Sidebar view">
          {[
            { id: 'collections', label: 'Collections', icon: <Folder className="h-3.5 w-3.5" /> },
            { id: 'history', label: 'History', icon: <History className="h-3.5 w-3.5" /> },
          ].map((v) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={view === v.id}
              onClick={() => setView(v.id)}
              title={v.label}
              className={`inline-flex h-7 items-center gap-1.5 rounded px-2 text-sm font-medium transition-colors ${
                view === v.id ? 'bg-panel text-fg' : 'text-muted hover:text-fg'
              }`}
            >
              {v.icon}
              {!ws.sidebarCollapsed && v.label}
              {v.id === 'history' && !ws.sidebarCollapsed && ws.history.length > 0 && (
                <span className="rounded bg-bg px-1 text-2xs tabular-nums text-subtle">{ws.history.length}</span>
              )}
            </button>
          ))}
        </div>

        {!ws.sidebarCollapsed && (
          <div className="ml-auto flex items-center gap-0.5">
            {view === 'collections' ? (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => {
                  const name = `Collection ${ws.collections.length + 1}`
                  const id = ws.createCollection(name)
                  setExpanded((prev) => new Set([...prev, id]))
                }}
                title="New collection"
                aria-label="New collection"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={ws.clearHistory} title="Clear history">
                Clear
              </Button>
            )}
          </div>
        )}
      </div>

      {!ws.sidebarCollapsed && (
        <div className="relative shrink-0 border-b border-line px-2 py-1.5">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={view === 'collections' ? `Search ${totalRequests} requests` : 'Search history'}
            aria-label="Search workspace"
            className="h-7 w-full rounded bg-panel pl-7 pr-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {ws.sidebarCollapsed ? (
          <div className="flex flex-col items-center gap-1 py-2">
            {ws.collections.map((c) => (
              <button
                key={c.id}
                onClick={() => ws.toast(c.name)}
                title={c.name}
                className="flex h-7 w-7 items-center justify-center rounded text-subtle hover:bg-panel hover:text-fg"
              >
                <Folder className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        ) : view === 'collections' ? (
          filteredCollections.length === 0 ? (
            <EmptyState
              icon={Folder}
              title={query ? 'No matches' : 'No collections'}
              body={query ? 'Try a different search term.' : 'Create a collection to organise saved requests.'}
              className="min-h-[140px]"
            />
          ) : (
            filteredCollections.map((col) => {
              const isOpen = expanded.has(col.id) || Boolean(query.trim())
              return (
                <div key={col.id} className="mb-0.5">
                  <div className="group flex items-center gap-1 px-1 hover:bg-panel">
                    <button
                      onClick={() => toggle(col.id)}
                      className="flex min-w-0 flex-1 items-center gap-1 py-1.5 text-left"
                      aria-expanded={isOpen}
                    >
                      {isOpen ? (
                        <ChevronDown className="h-3 w-3 shrink-0 text-subtle" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="h-3 w-3 shrink-0 text-subtle" aria-hidden="true" />
                      )}
                      <Folder className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                      <span className="truncate text-sm font-medium text-fg">{col.name}</span>
                      <span className="shrink-0 text-2xs tabular-nums text-subtle">{col.requests.length}</span>
                    </button>

                    <Popover
                      align="end"
                      trigger={
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                          aria-label={`Options for ${col.name}`}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      }
                    >
                      <MenuItem
                        icon={Pencil}
                        onClick={() => {
                          const name = window.prompt('Rename collection', col.name)
                          if (name) ws.renameCollection(col.id, name)
                        }}
                      >
                        Rename
                      </MenuItem>
                      <MenuItem
                        icon={Trash2}
                        danger
                        onClick={() => {
                          if (window.confirm(`Delete collection "${col.name}" and its ${col.requests.length} requests?`))
                            ws.deleteCollection(col.id)
                        }}
                      >
                        Delete
                      </MenuItem>
                    </Popover>
                  </div>

                  {isOpen && (
                    <ul className="ml-3 border-l border-line pl-1">
                      {col.requests.length === 0 && (
                        <li className="px-2 py-1.5 text-sm text-subtle">No saved requests</li>
                      )}
                      {col.requests.map((req) => {
                        const active =
                          ws.request.id === req.id ||
                          (ws.request.url === req.url && ws.request.method === req.method)
                        return (
                          <li key={req.id} className="group/req flex items-center">
                            <button
                              onClick={() => ws.patchRequest({ ...req, id: ws.request.id || req.id })}
                              className={`flex min-w-0 flex-1 items-center gap-1.5 rounded px-1.5 py-1.5 text-left ${
                                active ? 'bg-panel text-fg' : 'text-muted hover:bg-panel'
                              }`}
                              title={`${req.method} ${req.url}`}
                            >
                              <MethodTag method={req.method} className="w-[46px] shrink-0" />
                              <span className="min-w-0 flex-1 truncate text-sm">{req.name}</span>
                            </button>

                            <Popover
                              align="end"
                              trigger={
                                <Button
                                  size="icon-sm"
                                  variant="ghost"
                                  className="opacity-0 group-hover/req:opacity-100 focus-visible:opacity-100"
                                  aria-label={`Options for ${req.name}`}
                                >
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              }
                            >
                              <MenuItem
                                icon={Copy}
                                onClick={() => ws.duplicateRequest(col.id, req.id)}
                              >
                                Duplicate
                              </MenuItem>
                              <MenuItem
                                icon={Pencil}
                                onClick={() => {
                                  const name = window.prompt('Rename request', req.name)
                                  if (name) ws.renameRequest(col.id, req.id, name)
                                }}
                              >
                                Rename
                              </MenuItem>
                              <MenuItem
                                icon={Trash2}
                                danger
                                onClick={() => ws.deleteRequest(col.id, req.id)}
                              >
                                Delete
                              </MenuItem>
                            </Popover>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })
          )
        ) : filteredHistory.length === 0 ? (
          <EmptyState
            icon={History}
            title={query ? 'No matching history' : 'No history yet'}
            body={query ? 'Try a different search.' : 'Requests you send are listed here so you can reopen them.'}
            className="min-h-[140px]"
          />
        ) : (
          <ul>
            {filteredHistory.map((item) => (
              <HistoryRow
                key={item.id}
                item={item}
                active={item.requestUrl === ws.request.url && item.method === ws.request.method}
                onReopen={(entry) => ws.patchRequest({ ...entry.request, id: ws.request.id || entry.request.id })}
                onDelete={ws.deleteHistoryItem}
              />
            ))}
          </ul>
        )}
      </div>

      <RequestFooter onSend={onSend} canSend={canSend} />
    </aside>
  )
}

function RequestFooter({ onSend, canSend }) {
  const { request, patchRequest, METHODS, activeEnvironment, activeEnvironmentId, setActiveEnvironmentId, setEnvManagerOpen, environments } = useWorkspace()
  const [envOpen, setEnvOpen] = useState(false)

  return (
    <div className="shrink-0 space-y-1.5 border-t border-line p-2">
      <div className="flex gap-1.5">
        <MethodSelector value={request.method} onChange={(method) => patchRequest({ method })} methods={METHODS} />
        <UrlInput
          value={request.url}
          onChange={(url) => patchRequest({ url })}
          onSend={onSend}
          canSend={canSend}
          loading={false}
        />
      </div>

      <Popover
        align="start"
        open={envOpen}
        onClose={() => setEnvOpen(false)}
        className="w-full min-w-[220px]"
        trigger={
          <button
            onClick={() => setEnvOpen((o) => !o)}
            className="flex h-6 w-full items-center gap-1.5 rounded border border-line2 bg-surface px-1.5 text-left text-2xs text-muted hover:text-fg"
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: activeEnvironment ? 'var(--c-ok)' : 'var(--c-subtle)' }} />
            <span className="truncate">
              {activeEnvironment ? activeEnvironment.name : 'No environment'} ·{' '}
              {activeEnvironment?.variables?.length ?? 0} vars
            </span>
            <ChevronDown className="ml-auto h-3 w-3" aria-hidden="true" />
          </button>
        }
      >
        <p className="px-2 py-1 text-2xs uppercase tracking-wide text-subtle">Environment</p>
        <button
          type="button"
          onClick={() => {
            setActiveEnvironmentId(null)
            setEnvOpen(false)
          }}
          className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-base hover:bg-panel ${
            !activeEnvironmentId ? 'text-accent' : 'text-fg'
          }`}
        >
          None
        </button>
        {environments.map((env) => (
          <button
            key={env.id}
            type="button"
            onClick={() => {
              setActiveEnvironmentId(env.id)
              setEnvOpen(false)
            }}
            className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-base hover:bg-panel ${
              activeEnvironmentId === env.id ? 'text-accent' : 'text-fg'
            }`}
          >
            <span className="truncate">{env.name}</span>
            <span className="text-2xs text-subtle">{env.variables.length}</span>
          </button>
        ))}
        <div className="my-1 border-t border-line" />
        <MenuItem
          icon={Pencil}
          onClick={() => {
            setEnvOpen(false)
            setEnvManagerOpen(true)
          }}
        >
          Manage environments
        </MenuItem>
      </Popover>

      <div className="flex items-center justify-between text-2xs text-subtle">
        <span>Ctrl+Enter to send</span>
        {request.name && <span className="truncate pl-2">{request.name}</span>}
      </div>
    </div>
  )
}