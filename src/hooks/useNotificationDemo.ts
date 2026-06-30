import { useEffect } from 'react'
import { isDemoAlertsEnabled } from '../data/notificationStore'
import { fireDemoNotification } from '../utils/notificationDemo'
import { useNotifications } from './useNotifications'

const INITIAL_DELAY_MS = 12_000
const INTERVAL_MS = 35_000

/**
 * Periodically emits demo notifications while the app is open.
 * Controlled by Profile → Push & alerts → Live demo alerts.
 */
export const useNotificationDemo = () => {
  const { demoAlertsEnabled } = useNotifications()

  useEffect(() => {
    if (!isDemoAlertsEnabled()) return

    const initial = window.setTimeout(() => {
      if (isDemoAlertsEnabled()) fireDemoNotification()
    }, INITIAL_DELAY_MS)

    const interval = window.setInterval(() => {
      if (isDemoAlertsEnabled()) fireDemoNotification()
    }, INTERVAL_MS)

    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
    }
  }, [demoAlertsEnabled])
}
