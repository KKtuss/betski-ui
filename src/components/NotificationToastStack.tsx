import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import { loadNotificationState, markNotificationRead, subscribeNotifications } from '../data/notificationStore'
import type { AppNotification } from '../types/notifications'
import { NOTIFICATION_CATEGORY_LABELS } from '../types/notifications'
import './NotificationToastStack.css'

type ToastItem = AppNotification & { toastKey: string }

type NotificationToastStackProps = {
  onOpenNotification: (notification: AppNotification) => void
}

const TOAST_TTL_MS = 6000
const MAX_VISIBLE = 3

const NotificationToastStack = ({ onOpenNotification }: NotificationToastStackProps) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const seenIdsRef = useRef<Set<string>>(new Set(loadNotificationState().notifications.map((n) => n.id)))

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const openToast = useCallback(
    (notification: AppNotification) => {
      markNotificationRead(notification.id)
      dismissToast(notification.id)
      onOpenNotification(notification)
    },
    [dismissToast, onOpenNotification]
  )

  useEffect(() => {
    return subscribeNotifications(() => {
      const { notifications } = loadNotificationState()
      const fresh = notifications.filter((n) => !seenIdsRef.current.has(n.id))
      if (fresh.length === 0) return

      fresh.forEach((n) => seenIdsRef.current.add(n.id))

      setToasts((prev) => {
        const next = [...fresh.map((n) => ({ ...n, toastKey: n.id })), ...prev]
        return next.slice(0, MAX_VISIBLE)
      })

      fresh.forEach((n) => {
        window.setTimeout(() => dismissToast(n.id), TOAST_TTL_MS)
      })
    })
  }, [dismissToast])

  return (
    <div className="notif-toast-stack" aria-live="polite" aria-relevant="additions">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.button
            key={toast.toastKey}
            type="button"
            className="notif-toast"
            layout
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={() => openToast(toast)}
          >
            <span className="notif-toast-icon" aria-hidden>
              {toast.imageUrl ? (
                <img src={toast.imageUrl} alt="" />
              ) : (
                <Bell size={16} strokeWidth={2} />
              )}
            </span>
            <span className="notif-toast-copy">
              <span className="notif-toast-kicker">{NOTIFICATION_CATEGORY_LABELS[toast.category]}</span>
              <span className="notif-toast-title">{toast.title}</span>
              <span className="notif-toast-body">{toast.body}</span>
            </span>
            <span
              className="notif-toast-close"
              role="presentation"
              onClick={(e) => {
                e.stopPropagation()
                dismissToast(toast.id)
              }}
            >
              <X size={14} />
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default NotificationToastStack
