import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import { loadNotificationState, markNotificationRead, subscribeNotifications } from '../data/notificationStore'
import type { AppNotification } from '../types/notifications'
import { NOTIFICATION_CATEGORY_LABELS } from '../types/notifications'
import { useToastClickOutsideDismiss } from '../hooks/useToastClickOutsideDismiss'
import { useToastInteractionMode } from '../hooks/useToastInteractionMode'
import {
  dismissToast,
  enqueueToasts,
  getVisibleToasts,
  subscribeToastQueue
} from '../utils/notificationToastQueue'
import {
  shouldDismissToastSwipe,
  shouldSuppressToastTap
} from '../utils/notificationToastInteractions'
import './NotificationToastStack.css'

type ToastItem = AppNotification & { toastKey: string }

type NotificationToastStackProps = {
  onOpenNotification: (notification: AppNotification) => void
}

const NotificationToastStack = ({ onOpenNotification }: NotificationToastStackProps) => {
  const interactionMode = useToastInteractionMode()
  const isMobile = interactionMode === 'mobile'
  const stackRef = useRef<HTMLDivElement>(null)
  const swipeDismissedRef = useRef<Set<string>>(new Set())
  const dragMovedRef = useRef(false)

  const [toasts, setToasts] = useState<ToastItem[]>(() =>
    getVisibleToasts().map((n) => ({ ...n, toastKey: n.id }))
  )
  const seenIdsRef = useRef<Set<string>>(new Set(loadNotificationState().notifications.map((n) => n.id)))

  const syncVisibleToasts = useCallback(() => {
    setToasts(getVisibleToasts().map((n) => ({ ...n, toastKey: n.id })))
  }, [])

  const dismiss = useCallback((id: string) => {
    dismissToast(id)
  }, [])

  const dismissAllVisible = useCallback(() => {
    getVisibleToasts().forEach((toast) => dismissToast(toast.id))
  }, [])

  const openToast = useCallback(
    (notification: AppNotification) => {
      markNotificationRead(notification.id)
      dismiss(notification.id)
      onOpenNotification(notification)
    },
    [dismiss, onOpenNotification]
  )

  useEffect(() => subscribeToastQueue(syncVisibleToasts), [syncVisibleToasts])

  useEffect(() => {
    return subscribeNotifications(() => {
      const { notifications } = loadNotificationState()
      const fresh = notifications
        .filter((n) => !seenIdsRef.current.has(n.id))
        .sort((a, b) => a.createdAt - b.createdAt)

      if (fresh.length === 0) return

      fresh.forEach((n) => seenIdsRef.current.add(n.id))
      enqueueToasts(fresh)
    })
  }, [])

  useToastClickOutsideDismiss({
    enabled: !isMobile,
    stackRef,
    hasToasts: toasts.length > 0,
    onDismissAll: dismissAllVisible
  })

  const handleSwipeEnd = useCallback(
    (toastId: string, info: PanInfo) => {
      if (!isMobile) return
      if (!shouldDismissToastSwipe(info)) return
      swipeDismissedRef.current.add(toastId)
      dismiss(toastId)
      window.setTimeout(() => swipeDismissedRef.current.delete(toastId), 0)
    },
    [dismiss, isMobile]
  )

  const handleToastClick = useCallback(
    (toast: AppNotification) => {
      if (dragMovedRef.current) {
        dragMovedRef.current = false
        return
      }
      if (shouldSuppressToastTap(swipeDismissedRef.current.has(toast.id))) return
      openToast(toast)
    },
    [openToast]
  )

  return (
    <div ref={stackRef} className="notif-toast-stack" aria-live="polite" aria-relevant="additions">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.button
            key={toast.toastKey}
            type="button"
            className="notif-toast"
            layout
            drag={isMobile ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            dragMomentum={false}
            onDrag={(_, info) => {
              if (Math.abs(info.offset.x) > 6) dragMovedRef.current = true
            }}
            onDragEnd={(_, info) => handleSwipeEnd(toast.id, info)}
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, x: isMobile ? 120 : 0, y: isMobile ? 0 : -8, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={() => handleToastClick(toast)}
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
                dismiss(toast.id)
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
