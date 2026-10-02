/**
 * Thin wrapper over localStorage with namespacing, JSON handling and
 * graceful degradation when storage is unavailable (private mode, quota).
 * Components never touch localStorage directly.
 */

const PREFIX = 'apiforge:'

let memoryFallback = new Map()

function backend() {
  try {
    const probe = PREFIX + '__probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}

export const storage = {
  available() {
    return backend() !== null
  },

  get(key, fallback = null) {
    const full = PREFIX + key
    const store = backend()
    if (!store) {
      return memoryFallback.has(full) ? memoryFallback.get(full) : fallback
    }
    const raw = store.getItem(full)
    if (raw === null) return fallback
    try {
      return JSON.parse(raw)
    } catch {
      return fallback
    }
  },

  set(key, value) {
    const full = PREFIX + key
    const raw = JSON.stringify(value)
    const store = backend()
    if (!store) {
      memoryFallback.set(full, raw)
      return false
    }
    try {
      store.setItem(full, raw)
      return true
    } catch {
      memoryFallback.set(full, raw)
      return false
    }
  },

  remove(key) {
    const full = PREFIX + key
    memoryFallback.delete(full)
    const store = backend()
    if (store) store.removeItem(full)
  },

  keys() {
    const store = backend()
    const all = store ? Array.from({ length: store.length }, (_, i) => store.key(i)) : [...memoryFallback.keys()]
    return all.filter((k) => k && k.startsWith(PREFIX)).map((k) => k.slice(PREFIX.length))
  },
}

export const STORAGE_KEYS = {
  collections: 'collections',
  environments: 'environments',
  activeEnvironment: 'activeEnvironment',
  history: 'history',
  theme: 'theme',
  sidebarCollapsed: 'sidebarCollapsed',
  settings: 'settings',
  lastRequest: 'lastRequest',
}