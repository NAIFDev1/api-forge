import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { storage, STORAGE_KEYS } from '../services/storage'

/**
 * Single source of truth for workspace data. Everything persisted goes through
 * this provider so components stay presentational and storage details stay here.
 */

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const WorkspaceContext = createContext(null)

export function emptyRequest(overrides = {}) {
  return {
    id: `req_${Math.random().toString(36).slice(2, 10)}`,
    name: 'Untitled request',
    method: 'GET',
    url: '',
    params: [],
    headers: [],
    body: { type: 'none', text: '' },
    auth: { type: 'none', token: '', username: '', password: '', key: '', value: '', addTo: 'header' },
    ...overrides,
  }
}

export function createSeedCollections() {
  const now = Date.now()
  const mk = (name, method, url, extra = {}) =>
    emptyRequest({
      id: `seed_${Math.random().toString(36).slice(2, 10)}`,
      name,
      method,
      url,
      ...extra,
    })

  return [
    {
      id: 'col_users',
      name: 'Users API',
      createdAt: now,
      requests: [
        mk('Get users', 'GET', 'https://jsonplaceholder.typicode.com/users', {
          params: [
            { id: 'p1', key: 'page', value: '1', enabled: true },
            { id: 'p2', key: 'limit', value: '10', enabled: true },
          ],
          headers: [
            { id: 'h1', key: 'Accept', value: 'application/json', enabled: true },
          ],
        }),
        mk('Get single user', 'GET', 'https://jsonplaceholder.typicode.com/users/1'),
        mk('Login', 'POST', 'https://jsonplaceholder.typicode.com/posts', {
          body: {
            type: 'json',
            text: JSON.stringify(
              { username: 'sample-user', password: 'sample-password' },
              null,
              2
            ),
          },
        }),
      ],
    },
    {
      id: 'col_countries',
      name: 'Countries API',
      createdAt: now,
      requests: [
        mk('All countries', 'GET', 'https://restcountries.com/v3.1/all?fields=name,cca2,region'),
        mk('Country by code', 'GET', 'https://restcountries.com/v3.1/alpha/de', {
          headers: [{ id: 'hc1', key: 'Accept', value: 'application/json', enabled: true }],
        }),
      ],
    },
    {
      id: 'col_shop',
      name: 'Shop API',
      createdAt: now,
      requests: [
        mk('List products', 'GET', 'https://dummyjson.com/products?limit=5'),
        mk('Create product', 'POST', 'https://dummyjson.com/products/add', {
          body: {
            type: 'json',
            text: JSON.stringify(
              { title: 'Wireless Keyboard', price: 49, stock: 120, brand: 'Generic' },
              null,
              2
            ),
          },
        }),
      ],
    },
  ]
}

export function createSeedEnvironments() {
  const now = Date.now()
  return [
    {
      id: 'env_dev',
      name: 'Development',
      createdAt: now,
      variables: [
        { id: 'v1', key: 'BASE_URL', value: 'https://jsonplaceholder.typicode.com', enabled: true },
        { id: 'v2', key: 'API_VERSION', value: 'v1', enabled: true },
        { id: 'v3', key: 'TOKEN', value: 'sample-development-token', enabled: true },
      ],
    },
    {
      id: 'env_staging',
      name: 'Staging',
      createdAt: now,
      variables: [
        { id: 'v4', key: 'BASE_URL', value: 'https://dummyjson.com', enabled: true },
        { id: 'v5', key: 'API_VERSION', value: 'v1', enabled: true },
        { id: 'v6', key: 'TOKEN', value: 'sample-staging-token', enabled: true },
      ],
    },
  ]
}

function load(key, fallback) {
  const value = storage.get(key, null)
  return value == null ? fallback : value
}

export function WorkspaceProvider({ children }) {
  const [collections, setCollections] = useState(() => load(STORAGE_KEYS.collections, null) ?? createSeedCollections())
  const [environments, setEnvironments] = useState(() => load(STORAGE_KEYS.environments, null) ?? createSeedEnvironments())
  const [activeEnvironmentId, setActiveEnvironmentId] = useState(() => load(STORAGE_KEYS.activeEnvironment, null))
  const [history, setHistory] = useState(() => load(STORAGE_KEYS.history, []))

  const [request, setRequest] = useState(() => load(STORAGE_KEYS.lastRequest, null) ?? emptyRequest())
  const [response, setResponse] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [error, setError] = useState(null)

  const [theme, setTheme] = useState(() => load(STORAGE_KEYS.theme, 'dark'))
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => load(STORAGE_KEYS.sidebarCollapsed, false))
  const [timeoutMs, setTimeoutMs] = useState(() => load(STORAGE_KEYS.settings, {}).timeoutMs ?? 30000)

  const [toastQueue, setToastQueue] = useState([])
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [envManagerOpen, setEnvManagerOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const abortRef = useRef(null)
  const toastId = useRef(0)

  /* ---------------- persistence ---------------- */

  useEffect(() => void storage.set(STORAGE_KEYS.collections, collections), [collections])
  useEffect(() => void storage.set(STORAGE_KEYS.environments, environments), [environments])
  useEffect(() => void storage.set(STORAGE_KEYS.activeEnvironment, activeEnvironmentId), [activeEnvironmentId])
  useEffect(() => void storage.set(STORAGE_KEYS.history, history), [history])
  useEffect(() => void storage.set(STORAGE_KEYS.theme, theme), [theme])
  useEffect(() => void storage.set(STORAGE_KEYS.sidebarCollapsed, sidebarCollapsed), [sidebarCollapsed])
  useEffect(() => void storage.set(STORAGE_KEYS.settings, { timeoutMs }), [timeoutMs])
  useEffect(() => {
    // the working request is a draft, not saved state; keep it for reloads
    const t = setTimeout(() => void storage.set(STORAGE_KEYS.lastRequest, request), 250)
    return () => clearTimeout(t)
  }, [request])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  /* ---------------- toasts ---------------- */

  const dismissToast = useCallback((id) => {
    setToastQueue((q) => q.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message, options = {}) => {
      const id = ++toastId.current
      const entry = { id, message, tone: options.tone ?? 'default', detail: options.detail }
      setToastQueue((q) => [...q.slice(-3), entry])
      setTimeout(() => dismissToast(id), options.duration ?? 2600)
    },
    [dismissToast]
  )

  /* ---------------- request editing ---------------- */

  const patchRequest = useCallback((patch) => {
    setRequest((prev) => (typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }))
  }, [])

  const resetRequest = useCallback((overrides) => {
    abortRef.current?.abort()
    abortRef.current = null
    setRequest(emptyRequest(overrides))
    setResponse(null)
    setStatus('idle')
    setError(null)
  }, [])

  /* ---------------- collections ---------------- */

  const createCollection = useCallback(
    (name = 'New collection') => {
      const col = { id: `col_${Math.random().toString(36).slice(2, 10)}`, name, createdAt: Date.now(), requests: [] }
      setCollections((prev) => [...prev, col])
      toast(`Collection "${name}" created`, { tone: 'success' })
      return col.id
    },
    [toast]
  )

  const renameCollection = useCallback((collectionId, name) => {
    setCollections((prev) => prev.map((c) => (c.id === collectionId ? { ...c, name: name.trim() || c.name } : c)))
  }, [])

  const deleteCollection = useCallback(
    (collectionId) => {
      setCollections((prev) => {
        const target = prev.find((c) => c.id === collectionId)
        if (target) toast(`Deleted "${target.name}"`, { tone: 'danger' })
        return prev.filter((c) => c.id !== collectionId)
      })
    },
    [toast]
  )

  const addRequestToCollection = useCallback(
    (collectionId, req) => {
      const saved = emptyRequest({ ...req, id: `req_${Math.random().toString(36).slice(2, 10)}` })
      setCollections((prev) =>
        prev.map((c) => (c.id === collectionId ? { ...c, requests: [...c.requests, saved] } : c))
      )
      toast(`Saved "${saved.name}"`, { tone: 'success' })
      return saved.id
    },
    [toast]
  )

  const saveCurrentRequest = useCallback(
    (collectionId) => {
      if (!collectionId) {
        toast('Pick a collection to save into', { tone: 'warn' })
        return
      }
      const saved = emptyRequest({ ...request, id: `req_${Math.random().toString(36).slice(2, 10)}` })
      setCollections((prev) =>
        prev.map((c) => (c.id === collectionId ? { ...c, requests: [...c.requests, saved] } : c))
      )
      toast(`Saved "${saved.name}"`, { tone: 'success' })
    },
    [request, toast]
  )

  const duplicateRequest = useCallback(
    (collectionId, requestId) => {
      setCollections((prev) =>
        prev.map((c) => {
          if (c.id !== collectionId) return c
          const index = c.requests.findIndex((r) => r.id === requestId)
          if (index === -1) return c
          const source = c.requests[index]
          const copy = emptyRequest({ ...source, id: `req_${Math.random().toString(36).slice(2, 10)}`, name: `${source.name} copy` })
          const requests = [...c.requests]
          requests.splice(index + 1, 0, copy)
          toast(`Duplicated "${source.name}"`, { tone: 'success' })
          return { ...c, requests }
        })
      )
    },
    [toast]
  )

  const renameRequest = useCallback((collectionId, requestId, name) => {
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId
          ? { ...c, requests: c.requests.map((r) => (r.id === requestId ? { ...r, name: name.trim() || r.name } : r)) }
          : c
      )
    )
  }, [])

  const deleteRequest = useCallback(
    (collectionId, requestId) => {
      setCollections((prev) =>
        prev.map((c) => {
          if (c.id !== collectionId) return c
          const target = c.requests.find((r) => r.id === requestId)
          if (target) toast(`Deleted "${target.name}"`, { tone: 'danger' })
          return { ...c, requests: c.requests.filter((r) => r.id !== requestId) }
        })
      )
    },
    [toast]
  )

  const moveRequest = useCallback((fromCollectionId, requestId, toCollectionId, toIndex) => {
    if (fromCollectionId === toCollectionId) return
    setCollections((prev) => {
      const from = prev.find((c) => c.id === fromCollectionId)
      const moved = from?.requests.find((r) => r.id === requestId)
      if (!moved) return prev
      return prev.map((c) => {
        if (c.id === fromCollectionId) {
          return { ...c, requests: c.requests.filter((r) => r.id !== requestId) }
        }
        if (c.id === toCollectionId) {
          const requests = [...c.requests]
          requests.splice(toIndex ?? requests.length, 0, moved)
          return { ...c, requests }
        }
        return c
      })
    })
  }, [])

  /* ---------------- environments ---------------- */

  const createEnvironment = useCallback(
    (name = 'New environment') => {
      const env = { id: `env_${Math.random().toString(36).slice(2, 10)}`, name, createdAt: Date.now(), variables: [] }
      setEnvironments((prev) => [...prev, env])
      toast(`Environment "${name}" created`, { tone: 'success' })
      return env.id
    },
    [toast]
  )

  const updateEnvironment = useCallback((envId, next) => {
    setEnvironments((prev) => prev.map((e) => (e.id === envId ? { ...e, ...next } : e)))
  }, [])

  const deleteEnvironment = useCallback(
    (envId) => {
      setEnvironments((prev) => {
        const target = prev.find((e) => e.id === envId)
        if (target) toast(`Deleted "${target.name}"`, { tone: 'danger' })
        return prev.filter((e) => e.id !== envId)
      })
      setActiveEnvironmentId((current) => (current === envId ? null : current))
    },
    [toast]
  )

  const activeEnvironment = useMemo(
    () => environments.find((e) => e.id === activeEnvironmentId) ?? null,
    [environments, activeEnvironmentId]
  )

  /* ---------------- history ---------------- */

  const pushHistory = useCallback((entry) => {
    setHistory((prev) => [{ id: `h_${Math.random().toString(36).slice(2, 10)}`, ...entry }, ...prev].slice(0, 60))
  }, [])

  const deleteHistoryItem = useCallback((id) => {
    setHistory((prev) => prev.filter((h) => h.id !== id))
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    toast('History cleared')
  }, [toast])

  /* ---------------- theme / layout ---------------- */

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      toast(`${next === 'dark' ? 'Dark' : 'Light'} theme`, { tone: 'default' })
      return next
    })
  }, [toast])

  // One control, two behaviours: a drawer on small screens, collapse on desktop.
  const toggleNavigation = useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches) {
      setSidebarCollapsed((v) => !v)
    } else {
      setMobileNavOpen(true)
    }
  }, [])

  const value = useMemo(
    () => ({
      METHODS,
      // data
      collections,
      environments,
      activeEnvironment,
      activeEnvironmentId,
      history,
      request,
      response,
      status,
      error,
      // ui
      theme,
      sidebarCollapsed,
      sidebarOpen,
      mobileNavOpen,
      timeoutMs,
      toastQueue,
      paletteOpen,
      settingsOpen,
      envManagerOpen,
      shortcutsOpen,
      // actions
      patchRequest,
      resetRequest,
      cancelRequest: () => abortRef.current?.abort(),
      setResponse,
      setStatus,
      setError,
      createCollection,
      renameCollection,
      deleteCollection,
      addRequestToCollection,
      saveCurrentRequest,
      duplicateRequest,
      renameRequest,
      deleteRequest,
      moveRequest,
      createEnvironment,
      updateEnvironment,
      deleteEnvironment,
      setActiveEnvironmentId,
      pushHistory,
      deleteHistoryItem,
      clearHistory,
      setTheme,
      toggleTheme,
      setSidebarCollapsed,
      toggleNavigation,
      setTimeoutMs,
      setSidebarOpen,
      setMobileNavOpen,
      setPaletteOpen,
      setSettingsOpen,
      setEnvManagerOpen,
      setShortcutsOpen,
      toast,
      dismissToast,
      abortRef,
    }),
    [
      collections,
      environments,
      activeEnvironment,
      activeEnvironmentId,
      history,
      request,
      response,
      status,
      error,
      theme,
      sidebarCollapsed,
      sidebarOpen,
      mobileNavOpen,
      timeoutMs,
      paletteOpen,
      settingsOpen,
      envManagerOpen,
      shortcutsOpen,
      toastQueue,
      patchRequest,
      resetRequest,
      createCollection,
      renameCollection,
      deleteCollection,
      addRequestToCollection,
      saveCurrentRequest,
      duplicateRequest,
      renameRequest,
      deleteRequest,
      moveRequest,
      createEnvironment,
      updateEnvironment,
      deleteEnvironment,
      pushHistory,
      deleteHistoryItem,
      clearHistory,
      toggleTheme,
      toggleNavigation,
      toast,
      dismissToast,
    ]
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}