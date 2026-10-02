import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

/**
 * Collapsible JSON tree. Values are colour-coded by type and every leaf shows
 * its type, so the structure is readable without relying on colour alone.
 */
export function JsonViewer({ data, className = '', maxInitialDepth = 3 }) {
  if (data === null || data === undefined) return null
  return (
    <div className={`font-mono text-sm leading-relaxed ${className}`}>
      <Node value={data} name={null} depth={0} maxInitialDepth={maxInitialDepth} />
    </div>
  )
}

function isExpandable(value) {
  return value !== null && typeof value === 'object'
}

function preview(value) {
  if (Array.isArray(value)) return `Array(${value.length})`
  const keys = Object.keys(value)
  return `Object(${keys.length})`
}

function Node({ value, name, depth, maxInitialDepth }) {
  const [open, setOpen] = useState(depth < maxInitialDepth)

  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value

  if (!isExpandable(value)) {
    return (
      <div className="flex items-start gap-1.5 leading-relaxed" style={{ paddingLeft: depth * 14 }}>
        {name !== null && <span className="text-key shrink-0">{name}</span>}
        {name !== null && <span className="text-subtle shrink-0">:</span>}
        <span className={`json-${type} break-all whitespace-pre-wrap`}>{formatScalar(value)}</span>
      </div>
    )
  }

  const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v]) : Object.entries(value)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group flex items-start gap-1 rounded text-left leading-relaxed hover:bg-panel"
        style={{ paddingLeft: depth * 14 }}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="mt-[3px] h-3 w-3 shrink-0 text-subtle" aria-hidden="true" />
        ) : (
          <ChevronRight className="mt-[3px] h-3 w-3 shrink-0 text-subtle" aria-hidden="true" />
        )}
        {name !== null && <span className="text-key shrink-0">{name}</span>}
        {name !== null && <span className="text-subtle shrink-0">:</span>}
        <span className="text-subtle">{preview(value)}</span>
      </button>
      {open && (
        <div>
          {entries.map(([k, v]) => (
            <Node key={k} value={v} name={k} depth={depth + 1} maxInitialDepth={maxInitialDepth} />
          ))}
          <div style={{ paddingLeft: depth * 14 }} className="text-subtle">
            {Array.isArray(value) ? ']' : '}'}
          </div>
        </div>
      )}
    </div>
  )
}

function formatScalar(value) {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return `"${value}"`
  return String(value)
}

/** Flattened JSON text used for search and copy. */
export function useFlattenJson(data) {
  return useMemo(() => {
    try {
      return JSON.stringify(data, null, 2)
    } catch {
      return ''
    }
  }, [data])
}