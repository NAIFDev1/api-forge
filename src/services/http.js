/**
 * HTTP client used by the request runner.
 *
 * Every request goes through the browser's fetch API so the app performs real
 * network calls. Some public endpoints do not send CORS headers, which surfaces
 * here as a TypeError — we translate that into an explicit, actionable message
 * instead of letting it bubble up as an opaque failure.
 */

export class HttpError extends Error {
  constructor(message, kind, detail) {
    super(message)
    this.name = 'HttpError'
    this.kind = kind
    this.detail = detail
  }
}

export const REQUEST_TIMEOUT_MS = 30000

export function buildUrl(rawUrl, params = []) {
  const enabled = params.filter((p) => p.enabled && p.key.trim())
  let url
  try {
    url = new URL(rawUrl.trim())
  } catch {
    throw new HttpError(
      'Enter a valid URL, including the protocol.',
      'invalid-url',
      `Could not parse "${rawUrl || '(empty)'}" as an absolute URL.`
    )
  }
  if (!/^https?:$/.test(url.protocol)) {
    throw new HttpError(
      `Unsupported protocol "${url.protocol.replace(':', '')}". Use http or https.`,
      'invalid-url'
    )
  }
  for (const p of enabled) {
    url.searchParams.append(p.key.trim(), p.value ?? '')
  }
  return url.toString()
}

function headersToObject(headers, auth) {
  const out = {}
  for (const h of headers) {
    if (h.enabled && h.key.trim()) out[h.key.trim()] = h.value ?? ''
  }
  if (auth && auth.type && auth.type !== 'none') {
    if (auth.type === 'bearer' && auth.token) {
      out['Authorization'] = `Bearer ${auth.token}`
    }
    if (auth.type === 'basic' && auth.username != null) {
      out['Authorization'] = `Basic ${btoa(`${auth.username}:${auth.password ?? ''}`)}`
    }
    if (auth.type === 'apikey') {
      if (auth.addTo === 'header' && auth.key) out[auth.key] = auth.value ?? ''
      else if (auth.addTo === 'query' && auth.key) out['__apikey_query__'] = `${auth.key}=${auth.value ?? ''}`
    }
  }
  return out
}

function parseFormData(text) {
  const fd = new FormData()
  for (const line of String(text ?? '').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    fd.append(trimmed.slice(0, idx).trim(), trimmed.slice(idx + 1).trim())
  }
  return fd
}

/**
 * @returns {Promise<{ok:boolean, status:number, statusText:string, headers:[{key,value}],
 *   body:string, json:any, size:number, timeMs:number, contentType:string, finalUrl:string}>}
 */
export async function sendRequest(request, { signal, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  const { method, url, params = [], headers = [], body, auth } = request
  const started = performance.now()

  const finalUrl = buildUrl(url, params)
  const headerObj = headersToObject(headers, auth)

  let queryApiKey = null
  const qs = new URL(finalUrl)
  if (headerObj.__apikey_query__) {
    const [k, ...rest] = headerObj.__apikey_query__.split('=')
    queryApiKey = [k, rest.join('=')]
    delete headerObj.__apikey_query__
  }

  let payload
  if (body && body.type === 'json' && body.text) {
    try {
      JSON.parse(body.text)
    } catch (err) {
      throw new HttpError('Request body is not valid JSON.', 'invalid-body', err.message)
    }
    if (!headerObj['Content-Type'] && !headerObj['content-type']) headerObj['Content-Type'] = 'application/json'
    payload = body.text
  } else if (body && body.type === 'form' && body.text) {
    payload = parseFormData(body.text)
    delete headerObj['Content-Type']
    delete headerObj['content-type']
  } else if (body && body.type === 'raw' && body.text) {
    payload = body.text
  }

  if (queryApiKey) qs.searchParams.append(queryApiKey[0], queryApiKey[1])

  const controller = new AbortController()
  const onAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onAbort, { once: true })
  }
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs)

  let res
  try {
    res = await fetch(qs.toString(), {
      method: method.toUpperCase(),
      headers: headerObj,
      body: ['GET', 'HEAD'].includes(method.toUpperCase()) ? undefined : payload,
      signal: controller.signal,
      redirect: 'follow',
    })
  } catch (err) {
    if (signal?.aborted) {
      throw new HttpError('Request cancelled.', 'cancelled')
    }
    if (err?.name === 'AbortError' || controller.signal.reason === 'timeout') {
      throw new HttpError(
        `Request timed out after ${Math.round(timeoutMs / 1000)}s.`,
        'timeout',
        'The endpoint did not respond in time. Check the URL or try a smaller timeout.'
      )
    }
    // fetch() rejects with an opaque TypeError for both DNS/TLS failures and
    // CORS rejections; the browser deliberately hides the difference.
    throw new HttpError(
      'The request was blocked before it reached the server.',
      'network',
      'This is almost always a CORS restriction: the endpoint does not allow browser requests from this origin. Try an endpoint that sends Access-Control-Allow-Origin, or test it from a server-side client.'
    )
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onAbort)
  }

  const rawBody = await res.text()
  const timeMs = Math.round(performance.now() - started)
  const contentType = res.headers.get('content-type') || ''

  let json = null
  const looksJson = /json/i.test(contentType)
  if (rawBody) {
    if (looksJson) {
      try {
        json = JSON.parse(rawBody)
      } catch {
        json = null
      }
    } else {
      try {
        json = JSON.parse(rawBody)
        if (!looksJson) {
          /* parsed anyway; the caller decides based on contentType */
        }
      } catch {
        json = null
      }
    }
  }

  return {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    headers: Array.from(res.headers.entries()).map(([key, value]) => ({ key, value })),
    body: rawBody,
    json,
    size: new Blob([rawBody]).size,
    timeMs,
    contentType,
    finalUrl: res.url || qs.toString(),
  }
}

export function statusLabel(status) {
  const map = {
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  }
  return map[status] || ''
}