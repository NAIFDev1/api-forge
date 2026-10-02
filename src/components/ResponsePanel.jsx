import { useMemo, useState } from 'react'
import { AlertCircle, Braces, Check, ClipboardCopy, FileJson, Search, WrapText } from 'lucide-react'
import { useWorkspace } from '../context/WorkspaceContext'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { EmptyState } from './ui/empty-state'
import { Tabs } from './ui/tabs'
import { JsonViewer } from './JsonViewer'
import { contentTypeOf, formatBytes, formatMs, isDisplayableContent, dataUrl, copyText, isProbablyJson, tryFormatJson } from '../utils/format'
import { statusLabel } from '../services/http'
import { extractVariables } from '../utils/variables'

export function ResponsePanel({ copyResponse }) {
  const { response, error, status } = useWorkspace()
  const [tab, setTab] = useState('body')
  const [search, setSearch] = useState('')
  const [pretty, setPretty] = useState(true)
  const [wrap, setWrap] = useState(true)
  const [copied, setCopied] = useState(false)
  const [formatError, setFormatError] = useState(null)

  const type = contentTypeOf(response ?? {})
  const displayable = isDisplayableContent(type)

  const bodyText = useMemo(() => {
    if (!response) return ''
    if (displayable) return ''
    if (pretty && response.json != null) {
      const f = tryFormatJson(response.body)
      return f.text
    }
    return response.body
  }, [response, displayable, pretty])

  if (status === 'idle' && !response && !error) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={Braces}
          title="No response yet"
          body="Send a request to see the status, headers and body here. Everything runs from your browser."
        />
      </div>
    )
  }

  if (status === 'error' && error) {
    return (
      <div className="flex h-full items-center justify-center overflow-y-auto p-6">
        <div className="w-full max-w-lg rounded-md border border-err/40 bg-err/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-err" aria-hidden="true" />
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-fg">{error.message}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {error.detail || 'The request could not be completed.'}
              </p>
              {error.kind === 'network' && (
                <ul className="mt-3 space-y-1 text-sm text-muted">
                  <li>· Public APIs without CORS headers cannot be called from a browser.</li>
                  <li>· Try JSONPlaceholder, DummyJSON or a service that returns Access-Control-Allow-Origin.</li>
                  <li>· The URL itself was valid, so the request was never rejected by the server.</li>
                </ul>
              )}
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                onClick={() => copyText(error.message)}
              >
                Copy error
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!response) return null

  const missingVars = extractVariables(response.finalUrl)
  const canPretty = response.json != null
  const items = [
    { id: 'body', label: 'Body', icon: <Braces className="h-3.5 w-3.5" aria-hidden="true" /> },
    {
      id: 'headers',
      label: 'Headers',
      icon: <FileJson className="h-3.5 w-3.5" aria-hidden="true" />,
      count: response.headers.length,
    },
  ]
  if (displayable) {
    items.push({ id: 'preview', label: 'Preview', icon: <FileJson className="h-3.5 w-3.5" aria-hidden="true" /> })
  }

  const doCopy = async () => {
    await copyResponse()
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const doFormat = () => {
    const f = tryFormatJson(response.body)
    if (f.ok) {
      copyText(f.text)
      setFormatError(null)
    } else {
      setFormatError(f.error)
    }
  }

  const matches = search.trim()
    ? bodyText.split(new RegExp(escapeRegExp(search), 'gi')).length - 1
    : null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-2 py-1.5">
        <Tabs value={tab} onChange={setTab} items={items} />

        <div className="ml-auto flex items-center gap-1">
          {tab === 'body' && !displayable && (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-subtle" aria-hidden="true" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find in response"
                  aria-label="Find in response"
                  className="h-7 w-40 rounded border border-line2 bg-surface pl-6 pr-2 text-sm placeholder:text-subtle focus:border-accent focus:outline-none"
                />
              </div>
              <Button
                size="icon"
                variant={pretty ? 'subtle' : 'ghost'}
                onClick={() => setPretty((p) => !p)}
                disabled={!canPretty}
                title={canPretty ? (pretty ? 'Pretty print on' : 'Pretty print off') : 'Response is not JSON'}
                aria-pressed={pretty}
              >
                <Braces className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant={wrap ? 'subtle' : 'ghost'}
                onClick={() => setWrap((w) => !w)}
                title={wrap ? 'Wrap lines on' : 'Wrap lines off'}
                aria-pressed={wrap}
              >
                <WrapText className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={doFormat} title="Format and copy JSON">
                <Check className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={doCopy}>
            {copied ? <Check className="h-3.5 w-3.5 text-ok" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-panel/50 px-2 py-1 text-2xs text-muted">
        <Badge tone={response.ok ? 'ok' : 'err'}>
          {response.status} {statusLabel(response.status)}
        </Badge>
        <span>{formatMs(response.timeMs)}</span>
        <span>{formatBytes(response.size)}</span>
        <span className="truncate">{type || 'unknown type'}</span>
        {matches !== null && (
          <span className={matches ? 'text-accent' : 'text-subtle'}>
            {matches} match{matches === 1 ? '' : 'es'}
          </span>
        )}
        {formatError && <span className="text-err">{formatError}</span>}
        {missingVars.length > 0 && (
          <span className="text-warn">Unresolved: {missingVars.join(', ')}</span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'body' &&
          (displayable ? (
            <div className="p-4">
              <p className="mb-3 text-sm text-muted">This content type is rendered in the Preview tab.</p>
            </div>
          ) : !response.body ? (
            <EmptyState icon={Braces} title="Empty body" body="The server returned no content for this request." />
          ) : isProbablyJson(response.body, type) && response.json != null ? (
            <JsonViewer data={response.json} className={wrap ? '' : 'overflow-x-auto whitespace-pre'} />
          ) : (
            <pre
              className={`p-3 font-mono text-sm leading-relaxed text-fg ${wrap ? 'whitespace-pre-wrap break-words' : 'overflow-x-auto'}`}
            >
              {response.body}
            </pre>
          ))}

        {tab === 'headers' && (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-panel text-left text-2xs uppercase tracking-wide text-subtle">
              <tr>
                <th className="px-3 py-1.5 font-medium">Header</th>
                <th className="px-3 py-1.5 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {response.headers.map((h) => (
                <tr key={h.key} className="border-t border-line align-top">
                  <td className="px-3 py-1 font-mono text-xs text-key">{h.key}</td>
                  <td className="px-3 py-1 font-mono text-xs text-muted">{h.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'preview' && displayable && (
          <div className="p-4">
            {type.startsWith('image/') ? (
              <img src={dataUrl(response)} alt="Response preview" className="max-h-[60vh] rounded border border-line" />
            ) : type === 'text/html' ? (
              <iframe
                title="HTML preview"
                srcDoc={response.body}
                sandbox=""
                className="h-[60vh] w-full rounded border border-line bg-white"
              />
            ) : (
              <p className="text-sm text-muted">No inline preview for {type}. Use the Body tab to read it.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}