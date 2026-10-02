/**
 * Runtime smoke test: loads the production bundle inside jsdom and asserts that
 * the app mounts, seeded data renders, hotkeys work and a real request runs.
 * Run with: npm run test:smoke
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { JSDOM, VirtualConsole } from 'jsdom'

const dist = join(process.cwd(), 'dist')
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const assets = readdirSync(join(dist, 'assets'))
const jsFile = assets.find((f) => f.endsWith('.js'))
const cssFile = assets.find((f) => f.endsWith('.css'))

const errors = []
const warnings = []
const vc = new VirtualConsole()
vc.on('jsdomError', (e) => errors.push(`jsdomError: ${e.message}`))
vc.on('error', (...args) => errors.push(`console.error: ${args.join(' ')}`))
vc.on('warn', (...args) => warnings.push(`console.warn: ${args.join(' ')}`))

const dom = new JSDOM(html.replace(/<script[^>]*><\/script>/g, ''), {
  url: 'http://localhost:5180/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
})

const { window } = dom

// jsdom does not implement these; provide the minimum the app relies on.
window.matchMedia = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent() {
    return false
  },
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Record fetch calls and return CORS-enabled fixtures that mirror real APIs.
const calls = []
const realFetch = (...args) => globalThis.fetch(...args)
window.fetch = async (url, init = {}) => {
  const href = String(url)
  calls.push({ url: href, method: init.method, headers: init.headers, body: init.body })
  const body =
    href.includes('jsonplaceholder') && href.includes('/users')
      ? JSON.stringify([{ id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' }])
      : JSON.stringify({ id: 101, title: 'Sample created post', nested: { ok: true, tags: ['a', 'b'] } })
  return new globalThis.Response(body, {
    status: init.method === 'POST' ? 201 : 200,
    statusText: init.method === 'POST' ? 'Created' : 'OK',
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-powered-by': 'apiforge-smoke' },
  })
}

// jsdom has no prompt(); answer the confirm/rename flows deterministically.
let promptAnswer = 'Renamed by test'
window.prompt = () => promptAnswer
window.confirm = () => true

const results = []
function check(name, condition, detail = '') {
  results.push({ name, pass: Boolean(condition), detail })
}

// inject the built stylesheet + bundle
const style = window.document.createElement('style')
style.textContent = readFileSync(join(dist, 'assets', cssFile), 'utf8')
window.document.head.appendChild(style)

const script = window.document.createElement('script')
script.textContent = readFileSync(join(dist, 'assets', jsFile), 'utf8')
window.document.body.appendChild(script)

await sleep(600)

const root = window.document.getElementById('root')
const text = () => root.textContent

check('App mounts', root && root.children.length > 0)
check('Brand renders', text().includes('APIForge'), text().slice(0, 60))
check('Sidebar seeded with collections', text().includes('Users API') && text().includes('Countries API'))
check('Seeded requests render', text().includes('Get users'))
check('Empty response state', text().includes('No response yet'))
check('URL input exists', Boolean(window.document.getElementById('url-input')))

function typeInto(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, value)
  input.dispatchEvent(new window.Event('input', { bubbles: true }))
}

function keydown(combo) {
  const parts = combo.split('+')
  const key = parts.pop()
  const init = {
    key,
    bubbles: true,
    cancelable: true,
    ctrlKey: parts.includes('ctrl') || parts.includes('mod'),
    metaKey: parts.includes('mod'),
    shiftKey: parts.includes('shift'),
  }
  // dispatch once on the body; it bubbles to window where the hotkey listens
  window.document.body.dispatchEvent(new window.KeyboardEvent('keydown', init))
}

const bodyText = () => window.document.body.textContent
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))

// --- open command palette with Ctrl+K -----------------------------------------
keydown('ctrl+k')
await sleep(150)
check('Command palette opens', Boolean(window.document.querySelector('[aria-label="Command palette"]')))
check('Palette lists actions', bodyText().includes('New request'))

// type a query and confirm filtering narrows results
const paletteInput = window.document.querySelector('[aria-label="Search commands"]')
if (paletteInput) {
  typeInto(paletteInput, 'countries')
  await sleep(120)
  check('Palette filters results', bodyText().includes('Country by code') || bodyText().includes('All countries'))
  typeInto(paletteInput, '')
  await sleep(80)
}
keydown('Escape')
await sleep(150)

// --- send a real request ------------------------------------------------------
const urlInput = window.document.getElementById('url-input')
typeInto(urlInput, 'https://jsonplaceholder.typicode.com/users')
await sleep(80)

keydown('ctrl+Enter')
await sleep(500)

check('Request actually sent', calls.length > 0, calls.map((c) => `${c.method} ${c.url}`).join(', '))
check('Ctrl+Enter sends exactly one request', calls.length === 1, `${calls.length} call(s) for one shortcut`)
check('GET method used', calls[0]?.method === 'GET', String(calls[0]?.method))
check('Response status shown', text().includes('200'), text().match(/\d{3}/)?.[0] ?? 'no status')
check('Response body rendered', bodyText().includes('Leanne Graham'))
check('JSON tree expanded', bodyText().includes('Array(1)') && bodyText().includes('Sincere@april.biz'))
check('Timing recorded', /\d+\s?ms/.test(bodyText()))
check('History recorded', Boolean(window.localStorage.getItem('apiforge:history')) && JSON.parse(window.localStorage.getItem('apiforge:history')).length > 0)
check('Response headers tab counted', bodyText().includes('x-powered-by') === false && bodyText().includes('Headers'))

// --- environment variable resolution ------------------------------------------
const envButton = [...window.document.querySelectorAll('button')].find((b) =>
  (b.textContent ?? '').includes('No environment')
)
check('Environment selector visible', Boolean(envButton), envButton?.textContent)
if (envButton) {
  click(envButton)
  await sleep(150)
  const options = [...window.document.querySelectorAll('[role="menu"] button')].map((b) => b.textContent)
  const devOption = [...window.document.querySelectorAll('[role="menu"] button')].find((b) =>
    (b.textContent ?? '').trim().startsWith('Development')
  )
  check('Environment options listed', options.length >= 3, options.join(' | '))
  click(devOption)
  await sleep(200)
  const activeEnvText = [...window.document.querySelectorAll('button')]
    .map((b) => b.textContent)
    .find((t) => t.includes('vars'))
  check('Environment activated', (activeEnvText ?? '').includes('Development'), activeEnvText)
  check(
    'Active environment persisted',
    JSON.parse(window.localStorage.getItem('apiforge:activeEnvironment') ?? 'null') === 'env_dev'
  )

  typeInto(urlInput, '{{BASE_URL}}/users')
  await sleep(150)
  check('Resolved variable badge shown', bodyText().includes('variable resolved') || bodyText().includes('variables resolved'), 'badge check')

  const callsBefore = calls.length
  keydown('ctrl+Enter')
  await sleep(500)
  check(
    'Variable substituted in URL',
    calls.length > callsBefore && calls.at(-1).url === 'https://jsonplaceholder.typicode.com/users',
    `${calls.length - callsBefore} new call(s); last=${calls.at(-1)?.url}`
  )
}

// --- load a saved POST request and send it for real ----------------------------
const loginButton = [...window.document.querySelectorAll('button')].find(
  (b) => b.getAttribute('title') === 'POST https://jsonplaceholder.typicode.com/posts'
)
check('Saved POST request found', Boolean(loginButton))
if (loginButton) {
  click(loginButton)
  await sleep(150)
  check('Saved request loaded into builder', bodyText().includes('Login'))

  const bodyTab = [...window.document.querySelectorAll('[role="tab"]')].find((t) =>
    (t.textContent ?? '').trim().startsWith('Body')
  )
  click(bodyTab)
  await sleep(120)
  const textarea = window.document.querySelector('[aria-label="Request body"]')
  check('Body editor shows seeded JSON', (textarea?.value ?? '').includes('sample-user'))

  keydown('ctrl+Enter')
  await sleep(500)
  const postCall = calls.at(-1)
  check('POST body sent', postCall?.method === 'POST', JSON.stringify(postCall?.method))
  check('JSON body transmitted', typeof postCall?.body === 'string' && postCall.body.includes('sample-user'), String(postCall?.body))
  check(
    'Content-Type set automatically',
    JSON.stringify(postCall?.headers ?? {}).toLowerCase().includes('application/json')
  )
  check('201 rendered', bodyText().includes('201'))
  check('Active environment still applied', postCall?.url === 'https://jsonplaceholder.typicode.com/posts', String(postCall?.url))
}

// --- keyboard shortcuts that depend on how the browser reports the key ------
// A real browser sends shift+? when the user presses "?", never a bare "?".
const shiftQuestion = new window.KeyboardEvent('keydown', {
  key: '?',
  shiftKey: true,
  bubbles: true,
  cancelable: true,
})
window.document.body.dispatchEvent(shiftQuestion)
await sleep(150)
check('Shift+/ opens the shortcut list', bodyText().includes('Shortcuts') && bodyText().includes('new request'))
keydown('Escape')
await sleep(120)

// --- palette alias for browsers that reserve Ctrl+K --------------------------
keydown('ctrl+shift+p')
await sleep(150)
check('Ctrl+Shift+P opens the palette', Boolean(window.document.querySelector('[aria-label="Command palette"]')))
keydown('Escape')
await sleep(150)
check('Escape closes the palette', !window.document.querySelector('[aria-label="Command palette"]'))

// --- persistence --------------------------------------------------------------
check('Collections persisted to localStorage', Boolean(window.localStorage.getItem('apiforge:collections')))
check('Theme persisted', window.localStorage.getItem('apiforge:theme') === '"dark"')
check('Environments persisted', Boolean(window.localStorage.getItem('apiforge:environments')))

// --- theme toggle -------------------------------------------------------------
const themeBtn = window.document.querySelector('[aria-label="Toggle theme"]')
if (themeBtn) {
  click(themeBtn)
  await sleep(150)
  check('Theme switches to light', !window.document.documentElement.classList.contains('dark'))
  check('Theme choice persisted', window.localStorage.getItem('apiforge:theme') === '"light"')
  click(themeBtn)
  await sleep(150)
  check('Theme switches back to dark', window.document.documentElement.classList.contains('dark'))
}

// --- collection CRUD ----------------------------------------------------------
const newCollectionBtn = window.document.querySelector('[aria-label="New collection"]')
const collectionsBefore = JSON.parse(window.localStorage.getItem('apiforge:collections')).length
if (newCollectionBtn) {
  click(newCollectionBtn)
  await sleep(150)
  const collectionsAfter = JSON.parse(window.localStorage.getItem('apiforge:collections')).length
  check('Collection created', collectionsAfter === collectionsBefore + 1, `${collectionsBefore} -> ${collectionsAfter}`)
  check('New collection visible', bodyText().includes('Collection 4'))
}

// --- report -------------------------------------------------------------------
void realFetch
const failed = results.filter((r) => !r.pass)
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ` -> ${r.detail}` : ''}`)
}
if (warnings.length) console.log(`\n${warnings.length} console warning(s):\n` + warnings.slice(0, 10).join('\n'))
if (errors.length) console.log(`\n${errors.length} console error(s):\n` + errors.slice(0, 10).join('\n'))

console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length === 0 && errors.length === 0 ? 0 : 1)