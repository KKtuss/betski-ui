/** Categories that map to user-facing notification preferences and system channels. */
export type NotificationCategory =
  | 'messages'
  | 'tracked_trades'
  | 'market_resolution'
  | 'wager_fills'
  | 'wager_promotions'
  | 'watchlist'
  | 'news'

export type NotificationChannel = 'in_app' | 'push'

export type CategoryPreferences = {
  inApp: boolean
  push: boolean
}

/** Preset preference bundle — users pick one active profile. */
export type NotificationProfile = {
  id: string
  name: string
  description: string
  preferences: Record<NotificationCategory, CategoryPreferences>
  isBuiltin: boolean
}

/** Deep-link target parsed by navigation layer. */
export type NotificationTarget =
  | { kind: 'market'; marketId: string }
  | { kind: 'profile'; handle: string }
  | { kind: 'socials'; chatId?: string }
  | { kind: 'discovery' }
  | { kind: 'trade'; tradeId?: string; marketId?: string }
  | { kind: 'notifications' }

export type AppNotification = {
  id: string
  category: NotificationCategory
  title: string
  body: string
  target: NotificationTarget
  createdAt: number
  read: boolean
  imageUrl?: string
  actorHandle?: string
}

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  messages: 'Messages',
  tracked_trades: 'Tracked trades',
  market_resolution: 'Market resolution',
  wager_fills: 'Wager fills',
  wager_promotions: 'Wager promotions',
  watchlist: 'Watchlist alerts',
  news: 'News & trends'
}

export const NOTIFICATION_CATEGORY_ORDER: NotificationCategory[] = [
  'messages',
  'tracked_trades',
  'market_resolution',
  'wager_fills',
  'wager_promotions',
  'watchlist',
  'news'
]
