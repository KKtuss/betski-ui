import type { AppNotification } from '../types/notifications'

/** Max toasts rendered at once (plan: 1–2). */
export const TOAST_MAX_VISIBLE = 2

/** Delay between successive toast reveals. */
export const TOAST_INTER_DELAY_MS_MIN = 300
export const TOAST_INTER_DELAY_MS_MAX = 600

/** Suppress duplicate toast payloads inside this window. */
export const TOAST_DEDUPE_WINDOW_MS = 10_000

export const TOAST_TTL_MS_DEFAULT = 6000

export type ToastQueueConfig = {
  /** Auto-dismiss delay in ms. Set `null` or `0` to disable. */
  autoDismissMs: number | null
}

let queueConfig: ToastQueueConfig = {
  autoDismissMs: TOAST_TTL_MS_DEFAULT
}

export const getToastQueueConfig = (): ToastQueueConfig => ({ ...queueConfig })

export const setToastQueueConfig = (patch: Partial<ToastQueueConfig>): ToastQueueConfig => {
  queueConfig = { ...queueConfig, ...patch }
  return getToastQueueConfig()
}

type QueueListener = () => void

const listeners = new Set<QueueListener>()

const pendingQueue: AppNotification[] = []
const visibleToasts: AppNotification[] = []

/** Recent toast fingerprints for short-window deduplication. */
const recentFingerprints: { key: string; at: number }[] = []

let lastRevealAt = 0
let revealTimer: ReturnType<typeof setTimeout> | null = null
let ttlTimers = new Map<string, ReturnType<typeof setTimeout>>()

const notify = () => listeners.forEach((fn) => fn())

const randomInterDelay = () =>
  TOAST_INTER_DELAY_MS_MIN +
  Math.floor(Math.random() * (TOAST_INTER_DELAY_MS_MAX - TOAST_INTER_DELAY_MS_MIN + 1))

export const toastFingerprint = (notification: AppNotification): string =>
  `${notification.category}|${notification.title}|${notification.body}`

const pruneFingerprints = (now: number) => {
  while (recentFingerprints.length > 0 && now - recentFingerprints[0].at > TOAST_DEDUPE_WINDOW_MS) {
    recentFingerprints.shift()
  }
}

const isDuplicateToast = (notification: AppNotification, now: number): boolean => {
  pruneFingerprints(now)
  const key = toastFingerprint(notification)
  return recentFingerprints.some((entry) => entry.key === key)
}

const rememberFingerprint = (notification: AppNotification, now: number) => {
  pruneFingerprints(now)
  recentFingerprints.push({ key: toastFingerprint(notification), at: now })
}

const clearRevealTimer = () => {
  if (revealTimer != null) {
    clearTimeout(revealTimer)
    revealTimer = null
  }
}

const msUntilNextReveal = (now: number): number => {
  const elapsed = now - lastRevealAt
  const requiredGap = randomInterDelay()
  return Math.max(0, requiredGap - elapsed)
}

const scheduleReveal = (delayMs = 0) => {
  clearRevealTimer()
  revealTimer = setTimeout(() => {
    revealTimer = null
    revealNext()
  }, delayMs)
}

const startToastTtl = (notification: AppNotification) => {
  const ttlMs = queueConfig.autoDismissMs
  if (ttlMs == null || ttlMs <= 0) return

  const existing = ttlTimers.get(notification.id)
  if (existing) clearTimeout(existing)

  ttlTimers.set(
    notification.id,
    setTimeout(() => {
      ttlTimers.delete(notification.id)
      dismissToast(notification.id)
    }, ttlMs)
  )
}

const revealNext = () => {
  if (visibleToasts.length >= TOAST_MAX_VISIBLE) return
  if (pendingQueue.length === 0) return

  const now = Date.now()
  const wait = msUntilNextReveal(now)
  if (wait > 0) {
    scheduleReveal(wait)
    return
  }

  const next = pendingQueue.shift()
  if (!next) return

  visibleToasts.push(next)
  lastRevealAt = Date.now()
  startToastTtl(next)
  notify()

  if (pendingQueue.length > 0 && visibleToasts.length < TOAST_MAX_VISIBLE) {
    scheduleReveal(msUntilNextReveal(Date.now()))
  }
}

const pumpQueue = () => {
  if (visibleToasts.length >= TOAST_MAX_VISIBLE) return
  if (pendingQueue.length === 0) return

  const now = Date.now()
  scheduleReveal(msUntilNextReveal(now))
}

/**
 * Add notifications to the FIFO toast queue. Duplicates (same category/title/body
 * within TOAST_DEDUPE_WINDOW_MS) are dropped from the toast layer only.
 */
export const enqueueToasts = (notifications: AppNotification[]): void => {
  if (notifications.length === 0) return

  const now = Date.now()
  let enqueued = false

  for (const notification of notifications) {
    if (isDuplicateToast(notification, now)) continue
    rememberFingerprint(notification, now)
    pendingQueue.push(notification)
    enqueued = true
  }

  if (enqueued) pumpQueue()
}

export const dismissToast = (id: string): void => {
  const ttl = ttlTimers.get(id)
  if (ttl) {
    clearTimeout(ttl)
    ttlTimers.delete(id)
  }

  const before = visibleToasts.length
  const idx = visibleToasts.findIndex((toast) => toast.id === id)
  if (idx === -1) return

  visibleToasts.splice(idx, 1)
  if (visibleToasts.length !== before) {
    notify()
    pumpQueue()
  }
}

export const getVisibleToasts = (): AppNotification[] => [...visibleToasts]

export const getPendingToastCount = (): number => pendingQueue.length

export const subscribeToastQueue = (listener: QueueListener): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Test-only reset — not used in production UI. */
export const resetToastQueueForTests = (): void => {
  clearRevealTimer()
  ttlTimers.forEach((timer) => clearTimeout(timer))
  ttlTimers.clear()
  pendingQueue.length = 0
  visibleToasts.length = 0
  recentFingerprints.length = 0
  lastRevealAt = 0
}
