import { CURRENT_USER_HANDLE } from '../data/appStore'
import { addNotification, hasMarketBeenResolved, markMarketResolved } from '../data/notificationStore'
import type { NotificationTarget } from '../types/notifications'
import type { Batch } from '../types/discovery'

export const emitMessageNotification = (params: {
  chatId: string
  chatTitle: string
  preview: string
  senderHandle?: string
  avatarUrl?: string
}): void => {
  addNotification({
    category: 'messages',
    title: params.chatTitle,
    body: params.preview,
    target: { kind: 'socials', chatId: params.chatId },
    actorHandle: params.senderHandle,
    imageUrl: params.avatarUrl
  })
}

export const emitTrackedTradeNotification = (params: {
  id?: string
  handle: string
  marketName: string
  side: 'YES' | 'NO'
  usdAmount: number
  price: number
  avatarUrl?: string
}): void => {
  if (params.handle === CURRENT_USER_HANDLE) return
  const priceLabel = `${Math.round(params.price * 100)}¢`
  const sizeLabel =
    params.usdAmount >= 1000 ? `$${(params.usdAmount / 1000).toFixed(1)}K` : `$${Math.round(params.usdAmount)}`
  addNotification({
    id: params.id,
    category: 'tracked_trades',
    title: `${params.handle} bought ${params.side}`,
    body: `${params.marketName} — ${sizeLabel} @ ${priceLabel}`,
    target: { kind: 'profile', handle: params.handle },
    actorHandle: params.handle,
    imageUrl: params.avatarUrl
  })
}

export const emitWagerFillNotification = (params: {
  wagerId: string
  wagerName: string
  side: 'YES' | 'NO'
  usdAmount: number
  price: number
}): void => {
  const priceLabel = `${Math.round(params.price)}%`
  addNotification({
    category: 'wager_fills',
    title: 'Wager filled',
    body: `${params.side} on "${params.wagerName}" — $${Math.round(params.usdAmount)} @ ${priceLabel}`,
    target: { kind: 'market', marketId: params.wagerId }
  })
}

export const emitWagerPromotionNotification = (params: {
  wagerId: string
  wagerName: string
  newBatchId: string
}): void => {
  addNotification({
    category: 'wager_promotions',
    title: 'Wager promoted',
    body: `"${params.wagerName}" hit the pool threshold — now a live market.`,
    target: { kind: 'market', marketId: params.newBatchId }
  })
}

export const emitMarketResolutionNotification = (params: {
  marketId: string
  marketName: string
  outcome: 'YES' | 'NO'
  pnlUsd?: number
}): void => {
  if (hasMarketBeenResolved(params.marketId)) return
  markMarketResolved(params.marketId)
  const pnlPart =
    params.pnlUsd !== undefined
      ? ` Your P&L: ${params.pnlUsd >= 0 ? '+' : ''}$${Math.round(params.pnlUsd)}.`
      : ''
  addNotification({
    category: 'market_resolution',
    title: 'Market resolved',
    body: `"${params.marketName}" resolved ${params.outcome}.${pnlPart}`,
    target: { kind: 'market', marketId: params.marketId }
  })
}

export const emitWatchlistNotification = (params: {
  id?: string
  count: number
  preview: string
  marketId?: string
}): void => {
  addNotification({
    id: params.id,
    category: 'watchlist',
    title: params.count === 1 ? 'Watchlist alert' : `${params.count} watchlist alerts`,
    body: params.preview,
    target: params.marketId
      ? { kind: 'market', marketId: params.marketId }
      : { kind: 'socials', chatId: 'sys-2' }
  })
}

export const emitNewsNotification = (params: { title: string; body: string; marketId?: string }): void => {
  addNotification({
    category: 'news',
    title: params.title,
    body: params.body,
    target: params.marketId
      ? { kind: 'market', marketId: params.marketId }
      : { kind: 'socials', chatId: 'sys-1' }
  })
}

/** Check batches for newly passed resolution timestamps (after last-seen watermark). */
export const scanMarketResolutions = (
  batches: Batch[],
  positions: Record<string, { marketId: string; marketName: string; side: 'long' | 'short'; shares: number; avgEntry: number }>,
  options?: { now?: number; sinceMs?: number }
): void => {
  const now = options?.now ?? Date.now()
  const sinceMs = options?.sinceMs ?? 0
  for (const batch of batches) {
    if (batch.resolutionTimestamp > now) continue
    // Already resolved before the user was last caught up — skip historical noise
    if (batch.resolutionTimestamp <= sinceMs) continue
    if (hasMarketBeenResolved(batch.id)) continue
    const pos = positions[batch.id]
    if (!pos) continue
    const lastYes = batch.yesOdds
    const resolvedYes = lastYes >= 50
    const outcome: 'YES' | 'NO' = resolvedYes ? 'YES' : 'NO'
    const exitPrice = resolvedYes ? 1 : 0
    const pnlUsd =
      pos.side === 'long'
        ? (exitPrice - pos.avgEntry) * pos.shares
        : (pos.avgEntry - exitPrice) * pos.shares
    emitMarketResolutionNotification({
      marketId: batch.id,
      marketName: batch.name,
      outcome,
      pnlUsd
    })
  }
}

/** Notify when a wager the user created gets a fill from someone else — use stable ids via addNotification dedupe. */
export const notifyWagerFillFromOther = (params: {
  wagerId: string
  wagerName: string
  fillId: string
  handle: string
  side: 'YES' | 'NO'
  usdAmount: number
  avatarUrl?: string
}): void => {
  addNotification({
    id: `wager-fill-other-${params.wagerId}-${params.fillId}`,
    category: 'wager_fills',
    title: 'Someone filled your wager',
    body: `${params.handle} took ${params.side} on "${params.wagerName}" — $${Math.round(params.usdAmount)}`,
    target: { kind: 'market', marketId: params.wagerId },
    actorHandle: params.handle,
    imageUrl: params.avatarUrl
  })
}

export const parseNotificationTargetRoute = (
  target: NotificationTarget
): { tab: 'main' | 'socials' | 'discovery' | 'profile' | 'notifications'; marketId?: string; handle?: string; chatId?: string } => {
  switch (target.kind) {
    case 'market':
      return { tab: 'main', marketId: target.marketId }
    case 'profile':
      return { tab: 'profile', handle: target.handle }
    case 'socials':
      return { tab: 'socials', chatId: target.chatId }
    case 'discovery':
      return { tab: 'discovery' }
    case 'trade':
      return { tab: 'main', marketId: target.marketId }
    case 'notifications':
      return { tab: 'notifications' }
  }
}
