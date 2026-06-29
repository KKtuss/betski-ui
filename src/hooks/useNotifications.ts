import { useSyncExternalStore } from 'react'
import { loadNotificationState, subscribeNotifications } from '../data/notificationStore'

export const useNotifications = () =>
  useSyncExternalStore(subscribeNotifications, loadNotificationState, loadNotificationState)
