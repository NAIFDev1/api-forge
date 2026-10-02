import { useEffect, useRef } from 'react'

/**
 * Global keyboard shortcuts. Uses a ref map so re-registers are cheap and the
 * handlers always see the latest callbacks.
 *
 * Ignores keystrokes typed into text inputs for single-key shortcuts, but
 * keeps modifier combos (Ctrl/Cmd + …) working everywhere.
 */
export function useHotkeys(map, { enabled = true } = {}) {
  const mapRef = useRef(map)
  mapRef.current = map

  useEffect(() => {
    if (!enabled) return

    function onKeyDown(event) {
      const target = event.target
      const tag = target?.tagName
      const isEditable =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable

      const mod = event.ctrlKey || event.metaKey
      const parts = []
      if (mod) parts.push('mod')
      if (event.shiftKey) parts.push('shift')
      if (event.altKey) parts.push('alt')
      parts.push(event.key.toLowerCase())
      const combo = parts.join('+')

      const handler = mapRef.current[combo]
      if (!handler) return

      // single-key shortcuts must not fire while typing
      if (isEditable && !mod) return

      event.preventDefault()
      handler(event)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}

/** Focus trap + Escape handling shared by the dialogs. */
export function useDialog(open, onClose, containerRef) {
  useEffect(() => {
    if (!open) return

    const previous = document.activeElement

    function onKey(event) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const root = containerRef.current
      if (!root) return
      const focusables = root.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey, true)
    const t = setTimeout(() => {
      const root = containerRef.current
      const target = root?.querySelector('[data-autofocus]') ?? root
      target?.focus?.()
    }, 20)

    return () => {
      document.removeEventListener('keydown', onKey, true)
      clearTimeout(t)
      previous?.focus?.()
    }
  }, [open, onClose, containerRef])
}