import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  MessageSquare,
  Newspaper,
  TrendingUp,
  Trophy,
  Zap
} from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import {
  clearNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead
} from '../data/notificationStore'
import type { AppNotification, NotificationCategory } from '../types/notifications'
import { NOTIFICATION_CATEGORY_LABELS } from '../types/notifications'
import './Panel.css'
import './NotificationCenterPanel.css'

const categoryIcon = (category: NotificationCategory) => {
  switch (category) {
    case 'messages':
      return MessageSquare
    case 'tracked_trades':
      return TrendingUp
    case 'market_resolution':
      return Trophy
    case 'wager_fills':
    case 'wager_promotions':
      return Zap
    case 'watchlist':
      return Bell
    case 'news':
      return Newspaper
  }
}

const formatTime = (ts: number) => {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

type NotificationCenterPanelProps = {
  onBack: () => void
  onOpenNotification: (notification: AppNotification) => void
}

const NotificationCenterPanel = ({ onBack, onOpenNotification }: NotificationCenterPanelProps) => {
  const state = useNotifications()
  const unread = useMemo(() => getUnreadCount(), [state.notifications])

  const grouped = useMemo(() => {
    const today: AppNotification[] = []
    const earlier: AppNotification[] = []
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    for (const n of state.notifications) {
      if (n.createdAt >= dayStart.getTime()) today.push(n)
      else earlier.push(n)
    }
    return { today, earlier }
  }, [state.notifications])

  const renderItem = (n: AppNotification) => {
    const Icon = categoryIcon(n.category)
    return (
      <button
        key={n.id}
        type="button"
        className={`notif-item${n.read ? '' : ' notif-item--unread'}`}
        onClick={() => {
          markNotificationRead(n.id)
          onOpenNotification(n)
        }}
      >
        <div className="notif-item-icon" aria-hidden>
          {n.imageUrl ? (
            <img src={n.imageUrl} alt="" className="notif-item-avatar" />
          ) : (
            <Icon size={18} strokeWidth={2} />
          )}
        </div>
        <div className="notif-item-body">
          <div className="notif-item-top">
            <span className="notif-item-title">{n.title}</span>
            <span className="notif-item-time">{formatTime(n.createdAt)}</span>
          </div>
          <p className="notif-item-text">{n.body}</p>
          <span className="notif-item-category">{NOTIFICATION_CATEGORY_LABELS[n.category]}</span>
        </div>
        {!n.read && <span className="notif-item-dot" aria-label="Unread" />}
      </button>
    )
  }

  return (
    <motion.div
      className="panel notification-center"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="panel-header notification-center-header">
        <button type="button" className="notification-back-btn" onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} strokeWidth={2.25} />
        </button>
        <div className="notification-center-title">
          <span className="notification-center-wordmark">NOTIFICATIONS</span>
          {unread > 0 && (
            <span className="notification-center-count" aria-label={`${unread} unread`}>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
        <div className="notification-center-actions">
          {state.notifications.length > 0 && (
            <>
              <button
                type="button"
                className="notification-action-btn"
                onClick={() => markAllNotificationsRead()}
                title="Mark all read"
                aria-label="Mark all read"
              >
                <CheckCheck size={18} />
              </button>
              <button
                type="button"
                className="notification-action-btn"
                onClick={() => clearNotifications()}
                title="Clear all"
                aria-label="Clear all"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      <div className="panel-content notification-center-content">
        {state.notifications.length === 0 ? (
          <div className="notification-empty">
            <Bell size={32} strokeWidth={1.5} />
            <p>You're all caught up</p>
            <span>New alerts for messages, fills, and resolutions will show up here.</span>
          </div>
        ) : (
          <div className="notification-list">
            {grouped.today.length > 0 && (
              <section>
                <h3 className="notification-section-label">Today</h3>
                {grouped.today.map(renderItem)}
              </section>
            )}
            {grouped.earlier.length > 0 && (
              <section>
                <h3 className="notification-section-label">Earlier</h3>
                {grouped.earlier.map(renderItem)}
              </section>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default NotificationCenterPanel
