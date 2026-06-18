import { useState, useEffect } from 'react'
import { HOME_MOBILE_BREAKPOINT } from '../constants/layout'

export const useHomeMobileLayout = () => {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(HOME_MOBILE_BREAKPOINT).matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia(HOME_MOBILE_BREAKPOINT)
    const onChange = () => setNarrow(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return narrow
}
