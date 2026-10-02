import { useMemo, useState } from 'react'
import { AlertTriangle, Check, ChevronDown, Copy, Eye, EyeOff, KeyRound, Lock, Save, Trash2 } from 'lucide-react'
import { useWorkspace } from '../context/WorkspaceContext'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { EmptyState } from './ui/empty-state'
import { Input } from './ui/input'
import { MenuItem, Popover } from './ui/popover'
import { Select } from './ui/select'
import { Tabs } from './ui/tabs'
import { Textarea } from './ui/textarea'
import { extractVariables } from '../utils/variables'
import { copyText, tryFormatJson, validateJson } from '../utils/format'

function newRow(overrides = {}) {
  return { id: `k_${Math.random().toString(36).slice(2, 9)}`, key: '', value: '', enabled: true, ...overrides }
}

/**
 * Editable key/value grid. Rows can be toggled, added, deleted and reordered,
 * which covers params, headers and environment variables.
 */
export function KeyValueEditor({ rows, onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value', addLabel = 'Add row', focusKey }) {
  const setRow = (id, patch) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const removeRow = (id) => onChange(rows.filter((r) => r.id !== id))
  const moveRow = (index, delta) => {
    const next = [...rows]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr className="text-left text-2xs uppercase tracking-wide text-subtle">
              <th className="w-9 border-b border-line px-2 py-1.5 font-medium" scope="col">
                <span className="sr-only">Enabled</span>
              </th>
              <th className="w-[38%] border-b border-line px-2 py-1.5 font-medium" scope="col">
                Key
              </th>
              <th className="border-b border-line px-2 py-1.5 font-medium" scope="col">
                Value
              </th>
              <th className="w-20 border-b border-line px-2 py-1.5 font-medium" scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className={`group ${row.enabled === false ? 'opacity-50' : ''}`}>
                <td className="border-b border-line px-2 py-1 align-middle">
                  <input
                    type="checkbox"
                    checked={row.enabled !== false}
                    onChange={(e) => setRow(row.id, { enabled: e.target.checked })}
                    aria-label={`Enable ${row.key || 'row'}`}
                    className="h-3.5 w-3.5 cursor-pointer accent-current text-accent"
                  />
                </td>
                <td className="border-b border-line p-1">
                  <input
                    value={row.key}
                    onChange={(e) => setRow(row.id, { key: e.target.value })}
                    placeholder={keyPlaceholder}
                    spellCheck={false}
                    autoComplete="off"
                    autoFocus={focusKey && i === 0}
                    className="h-7 w-full rounded bg-transparent px-1.5 font-mono text-sm text-fg placeholder:text-subtle focus:bg-panel focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </td>
                <td className="border-b border-line p-1">
                  <input
                    value={row.value}
                    onChange={(e) => setRow(row.id, { value: e.target.value })}
                    placeholder={valuePlaceholder}
                    spellCheck={false}
                    autoComplete="off"
                    className="h-7 w-full rounded bg-transparent px-1.5 font-mono text-sm text-fg placeholder:text-subtle focus:bg-panel focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </td>
                <td className="border-b border-line px-1 py-1">
                  <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => moveRow(i, -1)}
                      disabled={i === 0}
                      aria-label="Move row up"
                    >
                      <ChevronDown className="h-3 w-3 rotate-180" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => moveRow(i, 1)}
                      disabled={i === rows.length - 1}
                      aria-label="Move row down"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => removeRow(row.id)}
                      aria-label="Delete row"
                      className="hover:text-err"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-subtle">
                  No rows yet — add one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="shrink-0 border-t border-line px-2 py-1.5">
        <Button size="sm" variant="ghost" onClick={() => onChange([...rows, newRow()])}>
          + {addLabel}
        </Button>
      </div>
    </div>
  )
}

const BODY_MODES = [
  { id: 'none', label: 'None' },
  { id: 'json', label: 'JSON' },
  { id: 'form', label: 'Form URL-encoded' },
  { id: 'raw', label: 'Raw' },
]

function BodyEditor({ body, onChange, method }) {
  const [formatNote, setFormatNote] = useState(null)

  if (['GET', 'HEAD'].includes(method)) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="max-w-sm text-sm text-muted">
          A <span className="font-mono text-fg">{method}</span> request does not include a body. Switch the method to
          POST, PUT, PATCH or DELETE if you need to send one.
        </p>
      </div>
    )
  }

  const validation = body.type === 'json' ? validateJson(body.text) : { valid: true, error: null }

  const doFormat = () => {
    const f = tryFormatJson(body.text)
    if (f.ok) {
      onChange({ text: f.text })
      setFormatNote('Formatted')
    } else {
      setFormatNote(f.error)
    }
    setTimeout(() => setFormatNote(null), 3000)
  }

  const samples = [
    {
      label: 'JSON sample',
      value: { title: 'Sample item', price: 24.99, tags: ['demo', 'sample'], inStock: true },
    },
    {
      label: 'Login sample',
      value: { username: 'sample-user', password: 'sample-password' },
    },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-2 py-1.5">
        <Select value={body.type} onChange={(e) => onChange({ type: e.target.value })} aria-label="Body type">
          {BODY_MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
        {body.type === 'json' && (
          <Button size="sm" variant="ghost" onClick={doFormat}>
            <Check className="h-3.5 w-3.5" />
            Format
          </Button>
        )}
        <Popover
          trigger={
            <Button size="sm" variant="ghost">
              Samples <ChevronDown className="h-3 w-3" />
            </Button>
          }
        >
          {samples.map((s) => (
            <MenuItem
              key={s.label}
              onClick={() => onChange({ type: 'json', text: JSON.stringify(s.value, null, 2) })}
            >
              {s.label}
            </MenuItem>
          ))}
        </Popover>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => copyText(body.text)}
          disabled={!body.text}
          className="ml-auto"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy
        </Button>
      </div>

      <div className="relative min-h-0 flex-1">
        <Textarea
          value={body.text}
          onChange={(e) => onChange({ text: e.target.value })}
          spellCheck={false}
          placeholder={
            body.type === 'json'
              ? '{\n  "key": "value"\n}'
              : body.type === 'form'
                ? 'key=value\nanother=value'
                : 'Raw request body'
          }
          className="h-full min-h-[180px] resize-none rounded-none border-0 bg-transparent"
          aria-label="Request body"
        />
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-line px-2 py-1 text-2xs">
        {!validation.valid ? (
          <span className="inline-flex items-center gap-1 text-err">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            {validation.error}
          </span>
        ) : (
          <span className="text-subtle">{body.text ? `${body.text.length} characters` : 'Empty body'}</span>
        )}
        {formatNote && <span className="text-accent">{formatNote}</span>}
      </div>
    </div>
  )
}

function AuthEditor({ auth, onChange }) {
  const [reveal, setReveal] = useState(false)
  const types = [
    { id: 'none', label: 'No auth' },
    { id: 'bearer', label: 'Bearer token' },
    { id: 'basic', label: 'Basic' },
    { id: 'apikey', label: 'API key' },
  ]

  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label htmlFor="auth-type" className="text-sm text-muted">
          Auth type
        </label>
        <Select id="auth-type" value={auth.type} onChange={(e) => onChange({ type: e.target.value })}>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </Select>
      </div>

      {auth.type === 'bearer' && (
        <Field label="Token" hint="Sent as Authorization: Bearer <token>. Store a placeholder like {{TOKEN}} in an environment.">
          <div className="flex gap-2">
            <Input
              type={reveal ? 'text' : 'password'}
              value={auth.token}
              onChange={(e) => onChange({ token: e.target.value })}
              placeholder="{{TOKEN}}"
              className="font-mono"
            />
            <Button variant="outline" size="md" onClick={() => setReveal((r) => !r)} aria-label={reveal ? 'Hide token' : 'Show token'}>
              {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </Field>
      )}

      {auth.type === 'basic' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Username">
            <Input value={auth.username} onChange={(e) => onChange({ username: e.target.value })} placeholder="sample-user" />
          </Field>
          <Field label="Password">
            <Input
              type={reveal ? 'text' : 'password'}
              value={auth.password}
              onChange={(e) => onChange({ password: e.target.value })}
              placeholder="sample-password"
            />
          </Field>
        </div>
      )}

      {auth.type === 'apikey' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Key name" hint="Header or query parameter name.">
            <Input value={auth.key} onChange={(e) => onChange({ key: e.target.value })} placeholder="X-API-Key" className="font-mono" />
          </Field>
          <Field label="Key value">
            <Input value={auth.value} onChange={(e) => onChange({ value: e.target.value })} placeholder="{{TOKEN}}" className="font-mono" />
          </Field>
          <Field label="Add to">
            <Select value={auth.addTo} onChange={(e) => onChange({ addTo: e.target.value })}>
              <option value="header">Header</option>
              <option value="query">Query parameter</option>
            </Select>
          </Field>
        </div>
      )}

      {auth.type !== 'none' && (
        <p className="mt-4 flex items-start gap-2 rounded border border-line bg-panel px-3 py-2 text-sm text-muted">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden="true" />
          Credentials stay in this browser only. Nothing is uploaded and no server sits between you and the API.
        </p>
      )}
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-fg">{label}</label>
      {children}
      {hint && <p className="text-2xs leading-relaxed text-subtle">{hint}</p>}
    </div>
  )
}

export function RequestBuilder() {
  const { request, patchRequest, collections, saveCurrentRequest, activeEnvironment } = useWorkspace()
  const [tab, setTab] = useState('params')
  const [saveOpen, setSaveOpen] = useState(false)

  const enabledParams = request.params.filter((p) => p.enabled !== false && p.key.trim()).length
  const enabledHeaders = request.headers.filter((h) => h.enabled !== false && h.key.trim()).length
  const urlVars = useMemo(() => extractVariables(request.url), [request.url])
  const resolvedVars = urlVars.filter((v) => activeEnvironment?.variables?.some((x) => x.key === v && x.enabled !== false))
  const missingVars = urlVars.filter((v) => !resolvedVars.includes(v))

  const updateList = (key) => (rows) => patchRequest({ [key]: rows })

  const items = [
    { id: 'params', label: 'Params', count: enabledParams },
    { id: 'headers', label: 'Headers', count: enabledHeaders },
    { id: 'body', label: 'Body', icon: <span className="h-1.5 w-1.5 rounded-full bg-subtle" aria-hidden="true" /> },
    { id: 'auth', label: 'Auth', icon: <KeyRound className="h-3 w-3" aria-hidden="true" /> },
  ]

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-2 py-1.5">
        <Tabs value={tab} onChange={setTab} items={items} />

        {urlVars.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-2xs">
            {missingVars.length > 0 ? (
              <Badge tone="warn" className="gap-1">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                {missingVars.length} unresolved
              </Badge>
            ) : (
              <Badge tone="ok" className="gap-1">
                <Check className="h-3 w-3" aria-hidden="true" />
                {urlVars.length} variable{urlVars.length === 1 ? '' : 's'} resolved
              </Badge>
            )}
          </span>
        )}

        <Popover
          align="end"
          className="ml-auto"
          open={saveOpen}
          onClose={() => setSaveOpen(false)}
          trigger={
            <Button size="sm" variant="outline" onClick={() => setSaveOpen((o) => !o)}>
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          }
        >
          <p className="px-2 py-1 text-2xs uppercase tracking-wide text-subtle">Save into collection</p>
          {collections.length === 0 && (
            <p className="px-2 pb-1 text-sm text-subtle">Create a collection first.</p>
          )}
          {collections.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                saveCurrentRequest(c.id)
                setSaveOpen(false)
              }}
              className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-base text-fg hover:bg-panel"
            >
              <span className="truncate">{c.name}</span>
              <span className="text-2xs text-subtle">{c.requests.length}</span>
            </button>
          ))}
        </Popover>
      </div>

      <div className="min-h-0 flex-1">
        {tab === 'params' && (
          <KeyValueEditor
            rows={request.params}
            onChange={updateList('params')}
            keyPlaceholder="Parameter"
            valuePlaceholder="Value"
            addLabel="Add parameter"
          />
        )}

        {tab === 'headers' && (
          <KeyValueEditor
            rows={request.headers}
            onChange={updateList('headers')}
            keyPlaceholder="Header"
            valuePlaceholder="Value"
            addLabel="Add header"
          />
        )}

        {tab === 'body' && (
          <BodyEditor
            body={request.body}
            method={request.method}
            onChange={(body) => patchRequest({ body })}
          />
        )}

        {tab === 'auth' && <AuthEditor auth={request.auth} onChange={(auth) => patchRequest({ auth })} />}
      </div>
    </section>
  )
}