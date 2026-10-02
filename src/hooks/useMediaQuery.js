import { useEffect, useState } from 'react'

const QUERIES = [
  '(prefers-reduced-motion: reduce)',
  '(min-width: 640px)',
  '(max-width: 640px)',
  '(min-width: 768px)',
  '(max-width: 768px)',
  '(max-width: 1024px)',
  '(min-width: 1280px)',
].join(', ')

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false
  )

  useEffect(() => {
    if (!window.matchMedia) return
    const mql = window.matchMedia(query)
    const onChange = (e) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1023px)')

export function useMediaQueryList() {
  return {
    reducedMotion: useMediaQuery('(prefers-reduced-motion: reduce)'),
    isDesktop: useIsDesktop(),
    isTablet: useIsTablet(),
  }
}