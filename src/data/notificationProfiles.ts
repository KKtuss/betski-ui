import type { NotificationCategory, NotificationProfile } from '../types/notifications'

const allOn = (inApp = true, push = true): Record<NotificationCategory, { inApp: boolean; push: boolean }> => ({
  messages: { inApp, push },
  tracked_trades: { inApp, push },
  market_resolution: { inApp, push },
  wager_fills: { inApp, push },
  wager_promotions: { inApp, push },
  watchlist: { inApp, push },
  news: { inApp, push }
})

const only = (
  enabled: NotificationCategory[],
  pushCategories: NotificationCategory[] = enabled
): Record<NotificationCategory, { inApp: boolean; push: boolean }> => {
  const set = new Set(enabled)
  const pushSet = new Set(pushCategories)
  return {
    messages: { inApp: set.has('messages'), push: pushSet.has('messages') },
    tracked_trades: { inApp: set.has('tracked_trades'), push: pushSet.has('tracked_trades') },
    market_resolution: { inApp: set.has('market_resolution'), push: pushSet.has('market_resolution') },
    wager_fills: { inApp: set.has('wager_fills'), push: pushSet.has('wager_fills') },
    wager_promotions: { inApp: set.has('wager_promotions'), push: pushSet.has('wager_promotions') },
    watchlist: { inApp: set.has('watchlist'), push: pushSet.has('watchlist') },
    news: { inApp: set.has('news'), push: pushSet.has('news') }
  }
}

export const BUILTIN_NOTIFICATION_PROFILES: NotificationProfile[] = [
  {
    id: 'all',
    name: 'Everything',
    description: 'All alerts in-app and as push notifications.',
    preferences: allOn(true, true),
    isBuiltin: true
  },
  {
    id: 'trading',
    name: 'Trading focus',
    description: 'Fills, resolutions, and watchlist — no social noise.',
    preferences: only(
      ['tracked_trades', 'market_resolution', 'wager_fills', 'wager_promotions', 'watchlist'],
      ['market_resolution', 'wager_fills', 'watchlist']
    ),
    isBuiltin: true
  },
  {
    id: 'social',
    name: 'Social',
    description: 'Messages and friend activity only.',
    preferences: only(['messages', 'tracked_trades'], ['messages']),
    isBuiltin: true
  },
  {
    id: 'quiet',
    name: 'Quiet hours',
    description: 'Critical market events in-app only — no push.',
    preferences: only(['market_resolution', 'wager_fills'], []),
    isBuiltin: true
  },
  {
    id: 'off',
    name: 'Muted',
    description: 'In-app history only — no push notifications.',
    preferences: allOn(true, false),
    isBuiltin: true
  }
]

export const getBuiltinProfile = (id: string): NotificationProfile | undefined =>
  BUILTIN_NOTIFICATION_PROFILES.find((p) => p.id === id)

export const DEFAULT_ACTIVE_PROFILE_ID = 'all'
