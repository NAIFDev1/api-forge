/**
 * Resolves {{VAR}} placeholders in URLs, headers and bodies against the
 * active environment. Missing variables are reported rather than silently
 * replaced, so a typo does not turn into a confusing 404.
 */

const TOKEN = /\{\{\s*([\w.-]+)\s*\}\}/g

export function extractVariables(text) {
  if (!text) return []
  const found = new Set()
  for (const m of String(text).matchAll(TOKEN)) found.add(m[1])
  return [...found]
}

export function resolveTemplate(text, envVars, { keepMissing = false } = {}) {
  if (!text) return { text: text ?? '', missing: [] }
  const missing = []
  const out = String(text).replace(TOKEN, (match, name) => {
    const value = envVars?.[name]
    if (value === undefined || value === null || value === '') {
      missing.push(name)
      return keepMissing ? match : ''
    }
    return String(value)
  })
  return { text: out, missing: [...new Set(missing)] }
}

export function collectEnvironmentVars(env) {
  if (!env) return {}
  const vars = {}
  for (const v of env.variables ?? []) {
    if (v && v.enabled !== false && v.key && !v.key.trim().startsWith('#')) {
      vars[v.key.trim()] = v.value ?? ''
    }
  }
  return vars
}

/** Resolves a request in place, returning the resolved copy plus any missing vars. */
export function resolveRequest(request, env) {
  const vars = collectEnvironmentVars(env)
  const missing = new Set()

  const url = resolveTemplate(request.url, vars, { keepMissing: true })
  url.missing.forEach((m) => missing.add(m))

  const headers = (request.headers ?? []).map((h) => {
    const r = resolveTemplate(h.value, vars, { keepMissing: true })
    r.missing.forEach((m) => missing.add(m))
    return { ...h, value: r.text }
  })

  let body = request.body
  if (body?.text) {
    const r = resolveTemplate(body.text, vars, { keepMissing: true })
    r.missing.forEach((m) => missing.add(m))
    body = { ...body, text: r.text }
  }

  return {
    request: { ...request, url: url.text, headers, body },
    missing: [...missing],
  }
}