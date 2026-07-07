import { useEffect, useState } from 'react'
import { TOAST_MOBILE_BREAKPOINT } from '../constants/notificationToast'

export type ToastInteractionMode = 'mobile' | 'desktop'

/**
 * Separates mobile (swipe) vs desktop (click-outside) toast interaction surfaces.
 * Uses the toast stack breakpoint (640px), not the home layout breakpoint.
 */
export const useToastInteractionMode = (): ToastInteractionMode => {
  const [mode, setMode] = useState<ToastInteractionMode>(() =>
    typeof window !== 'undefined' && window.matchMedia(TOAST_MOBILE_BREAKPOINT).matches
      ? 'mobile'
      : 'desktop'
  )

  useEffect(() => {
    const mq = window.matchMedia(TOAST_MOBILE_BREAKPOINT)
    const onChange = () => setMode(mq.matches ? 'mobile' : 'desktop')
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return mode
}
