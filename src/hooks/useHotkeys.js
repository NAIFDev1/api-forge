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
      // The browser already encodes shift into non-alphanumeric keys ("?" is
      // Shift+/), but letters arrive as their unshifted character, so Shift+P
      // still needs the explicit prefix to match "shift+p".
      const keyIsAlnum = /^[a-z0-9]$/i.test(event.key)
      if (event.shiftKey && keyIsAlnum) parts.push('shift')
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