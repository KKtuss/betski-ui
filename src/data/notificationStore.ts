import {
  BUILTIN_NOTIFICATION_PROFILES,
  DEFAULT_ACTIVE_PROFILE_ID,
  getBuiltinProfile,
  getQuickPresetById,
  type NotificationQuickPresetId
} from './notificationProfiles'
import type {
  AppNotification,
  CategoryPreferences,
  NotificationCategory,
  NotificationProfile,
  NotificationTarget
} from '../types/notifications'

const STORAGE_KEY = 'betski-notifications-v1'
const MAX_NOTIFICATIONS = 200

export type NotificationState = {
  version: 1
  activeProfileId: string
  customProfiles: NotificationProfile[]
  notifications: AppNotification[]
  pushPermissionRequested: boolean
  resolvedMarketIds: string[]
  demoAlertsEnabled: boolean
}

type Listener = () => void
const listeners = new Set<Listener>()
const notify = () => listeners.forEach((fn) => fn())

let cachedState: NotificationState | null = null

const seedNotifications = (): AppNotification[] => {
  const now = Date.now()
  const hour = 60 * 60 * 1000
  return [
    {
      id: 'seed-watchlist-1',
      category: 'watchlist',
      title: 'Watchlist alert',
      body: '2 markets near resolution — D4vd batch closes in 4h.',
      target: { kind: 'socials', chatId: 'sys-2' },
      createdAt: now - 2 * hour,
      read: false
    },
    {
      id: 'seed-trade-1',
      category: 'tracked_trades',
      title: 'MarkDiTob bought YES',
      body: 'Triple T going 10x virality — $2.4K @ 62¢',
      target: { kind: 'profile', handle: 'MarkDiTob' },
      createdAt: now - 5 * hour,
      read: false,
      actorHandle: 'MarkDiTob',
      imageUrl: '/Stems/moggorrr transparent.png'
    },
    {
      id: 'seed-news-1',
      category: 'news',
      title: 'News flow',
      body: 'D4vd batch trending +18% in the last hour.',
      target: { kind: 'socials', chatId: 'sys-1' },
      createdAt: now - 8 * hour,
      read: true
    }
  ]
}

export const seedNotificationState = (): NotificationState => ({
  version: 1,
  activeProfileId: DEFAULT_ACTIVE_PROFILE_ID,
  customProfiles: [],
  notifications: seedNotifications(),
  pushPermissionRequested: false,
  resolvedMarketIds: [],
  demoAlertsEnabled: true
})

const hydrateFromStorage = (): NotificationState => {
  if (typeof window === 'undefined') return seedNotificationState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const state = seedNotificationState()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      return state
    }
    const parsed = JSON.parse(raw) as NotificationState
    if (parsed?.version !== 1) return seedNotificationState()
    return {
      ...seedNotificationState(),
      ...parsed,
      notifications: parsed.notifications ?? seedNotifications(),
      customProfiles: parsed.customProfiles ?? [],
      resolvedMarketIds: parsed.resolvedMarketIds ?? [],
      demoAlertsEnabled: parsed.demoAlertsEnabled ?? true
    }
  } catch {
    return seedNotificationState()
  }
}

export const subscribeNotifications = (listener: Listener): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const loadNotificationState = (): NotificationState => {
  if (!cachedState) cachedState = hydrateFromStorage()
  return cachedState
}

export const saveNotificationState = (state: NotificationState): void => {
  if (typeof window === 'undefined') return
  cachedState = state
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  notify()
}

export const updateNotificationState = (
  updater: (prev: NotificationState) => NotificationState
): NotificationState => {
  const next = updater(loadNotificationState())
  saveNotificationState(next)
  return next
}

export const getAllProfiles = (): NotificationProfile[] => [
  ...BUILTIN_NOTIFICATION_PROFILES,
  ...loadNotificationState().customProfiles
]

export const getActiveProfile = (): NotificationProfile => {
  const state = loadNotificationState()
  const profile =
    getBuiltinProfile(state.activeProfileId) ??
    state.customProfiles.find((p) => p.id === state.activeProfileId)
  return profile ?? BUILTIN_NOTIFICATION_PROFILES[0]
}

export const getCategoryPreferences = (category: NotificationCategory): CategoryPreferences =>
  getActiveProfile().preferences[category]

export const setActiveProfileId = (profileId: string): void => {
  updateNotificationState((s) => ({ ...s, activeProfileId: profileId }))
}

export const applyQuickNotificationPreset = (presetId: NotificationQuickPresetId): void => {
  const preset = getQuickPresetById(presetId)
  if (!preset) return
  setActiveProfileId(preset.profileId)
}

export const createCustomProfile = (
  name: string,
  description: string,
  baseProfileId = DEFAULT_ACTIVE_PROFILE_ID
): NotificationProfile => {
  const base = getBuiltinProfile(baseProfileId) ?? getActiveProfile()
  const profile: NotificationProfile = {
    id: `custom-${Date.now()}`,
    name,
    description,
    preferences: structuredClone(base.preferences),
    isBuiltin: false
  }
  updateNotificationState((s) => ({
    ...s,
    customProfiles: [...s.customProfiles, profile],
    activeProfileId: profile.id
  }))
  return profile
}

export const updateProfilePreferences = (
  profileId: string,
  category: NotificationCategory,
  patch: Partial<CategoryPreferences>
): void => {
  updateNotificationState((s) => {
    const builtin = getBuiltinProfile(profileId)
    if (builtin) {
      const customCopy: NotificationProfile = {
        ...structuredClone(builtin),
        id: `custom-from-${profileId}-${Date.now()}`,
        name: `${builtin.name} (custom)`,
        description: 'Customized from a preset.',
        isBuiltin: false
      }
      customCopy.preferences[category] = { ...customCopy.preferences[category], ...patch }
      return {
        ...s,
        customProfiles: [...s.customProfiles, customCopy],
        activeProfileId: customCopy.id
      }
    }
    return {
      ...s,
      customProfiles: s.customProfiles.map((p) =>
        p.id === profileId
          ? { ...p, preferences: { ...p.preferences, [category]: { ...p.preferences[category], ...patch } } }
          : p
      )
    }
  })
}

export const addNotification = (
  input: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & { id?: string }
): AppNotification | null => {
  const prefs = getCategoryPreferences(input.category)
  if (!prefs.inApp && !prefs.push) return null

  const notification: AppNotification = {
    id: input.id ?? `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    read: false,
    ...input
  }

  const state = loadNotificationState()
  if (state.notifications.some((n) => n.id === notification.id)) return null

  updateNotificationState((s) => ({
    ...s,
    notifications: [notification, ...s.notifications].slice(0, MAX_NOTIFICATIONS)
  }))

  if (prefs.push) {
    void showBrowserPush(notification)
  }

  return notification
}

export const markNotificationRead = (id: string): void => {
  updateNotificationState((s) => ({
    ...s,
    notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
  }))
}

export const markAllNotificationsRead = (): void => {
  updateNotificationState((s) => ({
    ...s,
    notifications: s.notifications.map((n) => ({ ...n, read: true }))
  }))
}

export const clearNotifications = (): void => {
  updateNotificationState((s) => ({ ...s, notifications: [] }))
}

export const getUnreadCount = (): number =>
  loadNotificationState().notifications.filter((n) => !n.read).length

export const markMarketResolved = (marketId: string): void => {
  updateNotificationState((s) => {
    if (s.resolvedMarketIds.includes(marketId)) return s
    return { ...s, resolvedMarketIds: [...s.resolvedMarketIds, marketId] }
  })
}

export const hasMarketBeenResolved = (marketId: string): boolean =>
  loadNotificationState().resolvedMarketIds.includes(marketId)

export const setPushPermissionRequested = (): void => {
  updateNotificationState((s) => ({ ...s, pushPermissionRequested: true }))
}

export const isDemoAlertsEnabled = (): boolean => loadNotificationState().demoAlertsEnabled

export const setDemoAlertsEnabled = (enabled: boolean): void => {
  updateNotificationState((s) => ({ ...s, demoAlertsEnabled: enabled }))
}

const showBrowserPush = async (notification: AppNotification): Promise<void> => {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission === 'denied') return

  if (Notification.permission === 'default') {
    setPushPermissionRequested()
    const result = await Notification.requestPermission()
    if (result !== 'granted') return
  }

  const n = new Notification(notification.title, {
    body: notification.body,
    icon: notification.imageUrl ?? '/favicon.ico',
    tag: notification.id
  })
  n.onclick = () => {
    window.focus()
    const hash = buildNotificationHash(notification.target)
    if (window.location.hash !== hash) window.location.hash = hash
    markNotificationRead(notification.id)
    n.close()
  }
}

/** Build hash route from notification target — shared with navigation hook. */
export const buildNotificationHash = (target: NotificationTarget): string => {
  switch (target.kind) {
    case 'market':
      return `#/market/${encodeURIComponent(target.marketId)}`
    case 'profile':
      return `#/profile/${encodeURIComponent(target.handle)}`
    case 'socials':
      return target.chatId ? `#/socials/${encodeURIComponent(target.chatId)}` : '#/socials'
    case 'discovery':
      return '#/discovery'
    case 'trade':
      return target.marketId
        ? `#/market/${encodeURIComponent(target.marketId)}`
        : '#/profile'
    case 'notifications':
      return '#/notifications'
  }
}
