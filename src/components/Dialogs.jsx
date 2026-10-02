import { useState } from 'react'
import { FolderPlus, Globe, Layers, Plus, Trash2 } from 'lucide-react'
import { useWorkspace } from '../context/WorkspaceContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Modal } from './ui/modal'
import { Select } from './ui/select'
import { KeyValueEditor } from './RequestBuilder'

/**
 * Environment CRUD. Variables are plain key/value pairs; a resolved variable
 * is substituted into the URL, headers and body before the request is sent.
 */
export function EnvironmentsManager() {
  const ws = useWorkspace()
  const { envManagerOpen, setEnvManagerOpen } = ws
  const [editingId, setEditingId] = useState(ws.environments[0]?.id ?? null)
  const [newName, setNewName] = useState('')

  const env = ws.environments.find((e) => e.id === editingId) ?? ws.environments[0] ?? null

  const close = () => setEnvManagerOpen(false)

  const create = () => {
    const name = newName.trim() || `Environment ${ws.environments.length + 1}`
    const id = ws.createEnvironment(name)
    setEditingId(id)
    setNewName('')
  }

  const duplicate = () => {
    if (!env) return
    const id = ws.createEnvironment(`${env.name} copy`)
    ws.updateEnvironment(id, {
      variables: env.variables.map((v) => ({ ...v, id: `v_${Math.random().toString(36).slice(2, 9)}` })),
    })
    setEditingId(id)
  }

  return (
    <Modal
      open={envManagerOpen}
      onClose={close}
      title="Environments"
      description="Variables are written as {{NAME}} in the URL, headers or body."
      className="max-w-3xl"
      footer={
        <Button variant="outline" onClick={close}>
          Done
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[190px_1fr]">
        <div className="space-y-2">
          <div className="flex gap-1">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder="New name"
              aria-label="New environment name"
              className="h-7 text-sm"
            />
            <Button size="sm" variant="outline" onClick={create} aria-label="Create environment">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          <ul className="max-h-[240px] space-y-0.5 overflow-y-auto">
            {ws.environments.map((e) => (
              <li key={e.id}>
                <div
                  className={`group flex items-center gap-1 rounded pr-1 ${
                    e.id === env?.id ? 'bg-panel text-fg' : 'text-muted hover:bg-panel'
                  }`}
                >
                  <button onClick={() => setEditingId(e.id)} className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-left text-sm">
                    <Globe className="h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden="true" />
                    <span className="truncate">{e.name}</span>
                    <span className="text-2xs text-subtle">{e.variables.length}</span>
                  </button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100"
                    aria-label={`Delete ${e.name}`}
                    onClick={() => {
                      if (window.confirm(`Delete environment "${e.name}"?`)) {
                        ws.deleteEnvironment(e.id)
                        setEditingId(null)
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </li>
            ))}
            {ws.environments.length === 0 && (
              <li className="px-2 py-3 text-center text-sm text-subtle">No environments</li>
            )}
          </ul>
        </div>

        <div className="flex min-h-[260px] flex-col rounded border border-line">
          {!env ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-subtle">
              Create an environment to store reusable values.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-line px-2 py-1.5">
                <Input
                  value={env.name}
                  onChange={(e) => ws.updateEnvironment(env.id, { name: e.target.value })}
                  aria-label="Environment name"
                  className="h-7 w-40 text-sm font-medium"
                />
                <Select
                  value={env.id}
                  onChange={(e) => setEditingId(e.target.value)}
                  aria-label="Select environment"
                >
                  {ws.environments.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </Select>
                <Button size="sm" variant="ghost" onClick={duplicate}>
                  Duplicate
                </Button>
                <Button
                  size="sm"
                  variant={ws.activeEnvironmentId === env.id ? 'primary' : 'outline'}
                  onClick={() =>
                    ws.setActiveEnvironmentId(ws.activeEnvironmentId === env.id ? null : env.id)
                  }
                >
                  {ws.activeEnvironmentId === env.id ? 'Active' : 'Activate'}
                </Button>
              </div>

              <div className="min-h-0 flex-1">
                <KeyValueEditor
                  rows={env.variables}
                  onChange={(variables) => ws.updateEnvironment(env.id, { variables })}
                  keyPlaceholder="VARIABLE"
                  valuePlaceholder="value"
                  addLabel="Add variable"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

export function SettingsDialog() {
  const ws = useWorkspace()
  const { settingsOpen, setSettingsOpen, theme, sidebarCollapsed } = ws
  const timeouts = [
    { ms: 15000, label: '15 seconds' },
    { ms: 30000, label: '30 seconds' },
    { ms: 60000, label: '60 seconds' },
  ]

  return (
    <Modal
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      title="Settings"
      description="Preferences are stored in this browser only."
      footer={
        <Button variant="outline" onClick={() => setSettingsOpen(false)}>
          Close
        </Button>
      }
    >
      <div className="space-y-5">
        <Row icon={<Layers className="h-3.5 w-3.5" />} title="Appearance" hint="Dark is the default look.">
          <Select value={theme} onChange={(e) => ws.setTheme(e.target.value)} aria-label="Theme">
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </Select>
        </Row>

        <Row icon={<Layers className="h-3.5 w-3.5" />} title="Sidebar" hint="Collapse to keep more room for the response.">
          <Select
            value={sidebarCollapsed ? 'collapsed' : 'expanded'}
            onChange={(e) => ws.setSidebarCollapsed(e.target.value === 'collapsed')}
            aria-label="Sidebar state"
          >
            <option value="expanded">Expanded</option>
            <option value="collapsed">Collapsed</option>
          </Select>
        </Row>

        <Row icon={<Globe className="h-3.5 w-3.5" />} title="Timeout" hint="Applies to every request.">
          <Select
            value={String(ws.timeoutMs)}
            onChange={(e) => ws.setTimeoutMs(Number(e.target.value))}
            aria-label="Request timeout"
          >
            {timeouts.map((t) => (
              <option key={t.ms} value={t.ms}>
                {t.label}
              </option>
            ))}
          </Select>
        </Row>

        <div className="rounded border border-line bg-panel p-3">
          <p className="text-sm font-medium text-fg">Stored locally</p>
          <ul className="mt-1.5 space-y-0.5 text-2xs text-muted">
            <li>· {ws.collections.length} collections</li>
            <li>· {ws.collections.reduce((n, c) => n + c.requests.length, 0)} saved requests</li>
            <li>· {ws.environments.length} environments</li>
            <li>· {ws.history.length} history entries</li>
          </ul>
          <Button
            className="mt-2"
            size="sm"
            variant="danger"
            onClick={() => {
              if (window.confirm('Remove all collections, environments and history from this browser?')) {
                ws.collections.forEach((c) => ws.deleteCollection(c.id))
                ws.environments.forEach((e) => ws.deleteEnvironment(e.id))
                ws.clearHistory()
              }
            }}
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Clear workspace data
          </Button>
        </div>

        <div className="rounded border border-line bg-panel p-3 text-2xs leading-relaxed text-muted">
          <p className="font-medium text-fg">Keyboard shortcuts</p>
          <ul className="mt-1 space-y-0.5">
            <li>Ctrl/Cmd + K — search everything</li>
            <li>Ctrl/Cmd + Enter — send request</li>
            <li>Ctrl/Cmd + B — toggle sidebar</li>
            <li>Ctrl/Cmd + J — new request</li>
            <li>Ctrl/Cmd + E — environments</li>
            <li>? — show shortcuts</li>
          </ul>
        </div>
      </div>
    </Modal>
  )
}

function Row({ icon, title, hint, children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-subtle">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-fg">{title}</p>
        <p className="text-2xs text-subtle">{hint}</p>
      </div>
      {children}
    </div>
  )
}