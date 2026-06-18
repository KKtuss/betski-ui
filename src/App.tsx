import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import DiscoveryStemsPanel from './components/DiscoveryStemsPanel'
import DiscoveryAdminPanel from './components/DiscoveryAdminPanel'
import './App.css'

/**
 * Internal: append `?stems=1` (or `?stems=discovery`) to the URL to render a
 * standalone, hardcoded Discovery page used purely for capturing presentation
 * stems. Removing the query string returns to the normal app.
 */
const useStemsMode = () => {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    const v = new URLSearchParams(window.location.search).get('stems')
    return v === '1' || v === 'discovery'
  })
  useEffect(() => {
    const onPop = () => {
      const v = new URLSearchParams(window.location.search).get('stems')
      setEnabled(v === '1' || v === 'discovery')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  return enabled
}

const useAdminMode = () => {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    const v = new URLSearchParams(window.location.search).get('admin')
    return v === '1' || v === 'discovery'
  })
  useEffect(() => {
    const onPop = () => {
      const v = new URLSearchParams(window.location.search).get('admin')
      setEnabled(v === '1' || v === 'discovery')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  return enabled
}

function App() {
  const stemsMode = useStemsMode()
  const adminMode = useAdminMode()

  if (adminMode) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100dvh',
          overflow: 'hidden',
          background: '#050505',
          padding: 'clamp(8px, 1vw, 12px)',
          boxSizing: 'border-box'
        }}
      >
        <DiscoveryAdminPanel
          onBack={() => {
            const url = new URL(window.location.href)
            url.searchParams.delete('admin')
            window.location.href = url.pathname + (url.search ? url.search : '')
          }}
        />
      </div>
    )
  }

  if (stemsMode) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100dvh',
          overflow: 'hidden',
          background: '#050505',
          padding: 'clamp(8px, 1vw, 12px)',
          boxSizing: 'border-box'
        }}
      >
        <DiscoveryStemsPanel
          onBack={() => {
            const url = new URL(window.location.href)
            url.searchParams.delete('stems')
            window.location.href = url.pathname + (url.search ? url.search : '')
          }}
        />
      </div>
    )
  }

  return <Layout />
}

export default App
