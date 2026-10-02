/** Formatting helpers shared by the response panel and editors. */

export function formatBytes(bytes) {
  if (bytes === 0 || bytes == null) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** i
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}

export function formatMs(ms) {
  if (ms == null) return '—'
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`
}

export function formatTimestamp(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatClock(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatJson(value, indent = 2) {
  return JSON.stringify(value, null, indent)
}

/** Returns {ok, text, error} so the caller can surface precise feedback. */
export function tryFormatJson(text) {
  if (!text || !text.trim()) return { ok: false, text: text ?? '', error: 'Body is empty.' }
  try {
    return { ok: true, text: JSON.stringify(JSON.parse(text), null, 2), error: null }
  } catch (err) {
    return { ok: false, text, error: prettyJsonError(err, text) }
  }
}

function prettyJsonError(err, text) {
  const msg = err?.message ?? 'Invalid JSON.'
  // V8 reports position; turn it into a line/column the user can find.
  const m = msg.match(/position (\d+)/)
  if (m) {
    const pos = Number(m[1])
    const before = text.slice(0, pos)
    const line = before.split('\n').length
    const column = pos - before.lastIndexOf('\n')
    return `${msg.replace(/ in JSON at position \d+.*/, '')} — line ${line}, column ${column}.`
  }
  return msg
}

export function validateJson(text) {
  if (!text || !text.trim()) return { valid: true, error: null }
  try {
    JSON.parse(text)
    return { valid: true, error: null }
  } catch (err) {
    return { valid: false, error: prettyJsonError(err, text) }
  }
}

export function isProbablyJson(text, contentType = '') {
  if (contentType && /json/i.test(contentType)) return true
  const trimmed = (text ?? '').trim()
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))
}

export function contentTypeOf(response) {
  return (response?.contentType ?? '').split(';')[0].trim().toLowerCase()
}

export function isDisplayableContent(contentType) {
  const type = contentTypeOf({ contentType })
  if (!type) return false
  return (
    type.startsWith('image/') ||
    type.startsWith('video/') ||
    type.startsWith('audio/') ||
    type === 'text/html' ||
    type === 'application/pdf'
  )
}

export function dataUrl(response) {
  const type = contentTypeOf(response)
  const base64 = btoa(unescape(encodeURIComponent(response.body ?? '')))
  return `data:${type || 'application/octet-stream'};base64,${base64}`
}

export function truncate(text, max = 200) {
  const s = String(text ?? '')
  return s.length > max ? `${s.slice(0, max)}…` : s
}

export function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  // Fallback for insecure origins, where the async clipboard API is unavailable.
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
  } finally {
    document.body.removeChild(ta)
  }
  return Promise.resolve()
}