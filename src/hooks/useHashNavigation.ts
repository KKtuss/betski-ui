import { useEffect, useState } from 'react'

export type HashRoute =
  | { type: 'main'; marketId?: string }
  | { type: 'discovery' }
  | { type: 'socials' }
  | { type: 'profile'; handle?: string }

export const parseHash = (hash: string): HashRoute => {
  const raw = hash.replace(/^#/, '')
  if (!raw || raw === 'main') return { type: 'main' }
  if (raw === 'discovery') return { type: 'discovery' }
  if (raw === 'socials') return { type: 'socials' }
  if (raw.startsWith('market/')) return { type: 'main', marketId: decodeURIComponent(raw.slice(7)) }
  if (raw.startsWith('profile/')) return { type: 'profile', handle: decodeURIComponent(raw.slice(8)) }
  if (raw === 'profile') return { type: 'profile' }
  return { type: 'main' }
}

export const buildHash = (route: HashRoute): string => {
  switch (route.type) {
    case 'discovery':
      return '#/discovery'
    case 'socials':
      return '#/socials'
    case 'profile':
      return route.handle ? `#/profile/${encodeURIComponent(route.handle)}` : '#/profile'
    case 'main':
      return route.marketId ? `#/market/${encodeURIComponent(route.marketId)}` : '#/main'
  }
}

export const useHashNavigation = () => {
  const [route, setRoute] = useState<HashRoute>(() =>
    typeof window !== 'undefined' ? parseHash(window.location.hash) : { type: 'main' }
  )

  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const navigate = (next: HashRoute) => {
    const hash = buildHash(next)
    if (window.location.hash !== hash) {
      window.location.hash = hash
    } else {
      setRoute(next)
    }
  }

  return { route, navigate }
}
