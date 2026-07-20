import { useEffect, useRef } from 'react'
import { useAppStore } from './useAppStore'
import { useDiscoveryCatalog } from './useDiscoveryCatalog'
import { CURRENT_USER_HANDLE } from '../data/appStore'
import {
  advanceWatcherWatermark,
  bootstrapWatcherWatermark,
  getLastWatchlistKey,
  setLastWatchlistKey
} from '../data/notificationStore'
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
 *
 * Uses a persisted last-seen watermark so opening the app does not replay
 * historical catalog/mock events as a toast flood.
 */
export const useNotificationWatcher = () => {
  const appState = useAppStore()
  const catalog = useDiscoveryCatalog()
  const lastFriendTradeRef = useRef<Record<string, number>>({})

  useEffect(() => {
    const { watermark, quietCatchUp } = bootstrapWatcherWatermark()
    const now = Date.now()

    const soon = catalog.batches.filter(
      (b) => b.resolutionTimestamp > now && b.resolutionTimestamp - now < 6 * 60 * 60 * 1000
    )
    const watchlistKey = soon
      .map((b) => b.id)
      .sort()
      .join('|')

    // First-ever catch-up: mark history as seen, seed watchlist signature, emit nothing.
    if (quietCatchUp) {
      if (watchlistKey) setLastWatchlistKey(watchlistKey)
      return
    }

    scanMarketResolutions(catalog.batches, appState.positions, { now, sinceMs: watermark })

    let newest = watermark
    for (const wager of catalog.wagers) {
      if (wager.creatorHandle !== CURRENT_USER_HANDLE) continue
      const fills = getWagerFills(wager, appState.trades)
      for (const fill of fills) {
        if (fill.handle === CURRENT_USER_HANDLE) continue
        if (fill.timestamp <= watermark) continue
        newest = Math.max(newest, fill.timestamp)
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

    for (const user of Object.values(appState.users)) {
      if (user.handle === CURRENT_USER_HANDLE) continue
      if (user.trades.length === 0) continue

      const latest = user.trades.reduce((best, trade) =>
        trade.timestampMs > best.timestampMs ? trade : best
      )
      const lastSeen = Math.max(lastFriendTradeRef.current[user.handle] ?? 0, watermark)
      if (latest.timestampMs <= lastSeen) continue
      lastFriendTradeRef.current[user.handle] = latest.timestampMs
      if (now - latest.timestampMs > 6 * 60 * 60 * 1000) continue

      newest = Math.max(newest, latest.timestampMs)
      emitTrackedTradeNotification({
        id: `tracked-trade-${user.handle}-${latest.id}`,
        handle: user.handle,
        marketName: latest.market,
        side: latest.outcome,
        usdAmount: latest.sizeUsd,
        price: latest.price,
        avatarUrl: user.avatar
      })
    }

    if (soon.length > 0) {
      const hasPosition = soon.some((b) => Boolean(appState.positions[b.id]))
      if ((hasPosition || soon.length >= 2) && watchlistKey !== getLastWatchlistKey()) {
        setLastWatchlistKey(watchlistKey)
        emitWatchlistNotification({
          id: `watchlist-${watchlistKey}`,
          count: soon.length,
          preview:
            soon.length === 1
              ? `${soon[0].name} closes in ${Math.max(1, Math.round((soon[0].resolutionTimestamp - now) / 3600000))}h.`
              : `${soon.length} markets near resolution.`,
          marketId: soon[0]?.id
        })
      }
    }

    // Mark this scan complete so the next open only sees events after now.
    advanceWatcherWatermark(Math.max(newest, now))
  }, [catalog.batches, catalog.wagers, appState.positions, appState.trades, appState.users])
}
