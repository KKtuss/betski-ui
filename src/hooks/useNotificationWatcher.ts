import { useEffect, useRef } from 'react'
import { useAppStore } from './useAppStore'
import { useDiscoveryCatalog } from './useDiscoveryCatalog'
import { CURRENT_USER_HANDLE } from '../data/appStore'
import {
  emitTrackedTradeNotification,
  emitWatchlistNotification,
  notifyWagerFillFromOther,
  scanMarketResolutions
} from '../utils/notificationEmitter'
import { getWagerFills } from '../utils/wagerFills'

/**
 * Background watcher that emits notifications for market resolutions,
 * friend tracked trades, and wager fills on wagers you created.
 */
export const useNotificationWatcher = () => {
  const appState = useAppStore()
  const catalog = useDiscoveryCatalog()
  const lastFriendTradeRef = useRef<Record<string, number>>({})

  useEffect(() => {
    scanMarketResolutions(catalog.batches, appState.positions)
  }, [catalog.batches, appState.positions])

  useEffect(() => {
    for (const wager of catalog.wagers) {
      if (wager.creatorHandle !== CURRENT_USER_HANDLE) continue
      const fills = getWagerFills(wager, appState.trades)
      for (const fill of fills) {
        if (fill.handle === CURRENT_USER_HANDLE) continue
        notifyWagerFillFromOther({
          wagerId: wager.id,
          wagerName: wager.name,
          fillId: fill.id,
          handle: fill.handle,
          side: fill.side,
          usdAmount: fill.usdAmount,
          avatarUrl: fill.avatar
        })
      }
    }
  }, [catalog.wagers, appState.trades])

  useEffect(() => {
    const now = Date.now()
    for (const user of Object.values(appState.users)) {
      if (user.handle === CURRENT_USER_HANDLE) continue
      const latest = user.trades[0]
      if (!latest) continue
      const lastSeen = lastFriendTradeRef.current[user.handle] ?? 0
      if (latest.timestampMs <= lastSeen) continue
      if (now - latest.timestampMs > 6 * 60 * 60 * 1000) continue
      lastFriendTradeRef.current[user.handle] = latest.timestampMs
      if (lastSeen === 0) continue
      emitTrackedTradeNotification({
        handle: user.handle,
        marketName: latest.market,
        side: latest.outcome,
        usdAmount: latest.sizeUsd,
        price: latest.price,
        avatarUrl: user.avatar
      })
    }
  }, [appState.users])

  useEffect(() => {
    const now = Date.now()
    const soon = catalog.batches.filter(
      (b) => b.resolutionTimestamp > now && b.resolutionTimestamp - now < 6 * 60 * 60 * 1000
    )
    if (soon.length === 0) return
    const hasPosition = soon.some((b) => Boolean(appState.positions[b.id]))
    if (!hasPosition && soon.length < 2) return
    emitWatchlistNotification({
      id: `watchlist-${soon.map((b) => b.id).join('-')}`,
      count: soon.length,
      preview:
        soon.length === 1
          ? `${soon[0].name} closes in ${Math.max(1, Math.round((soon[0].resolutionTimestamp - now) / 3600000))}h.`
          : `${soon.length} markets near resolution.`,
      marketId: soon[0]?.id
    })
  }, [catalog.batches, appState.positions])
}
