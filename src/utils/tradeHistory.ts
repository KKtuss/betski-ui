import type { FriendTrade, TradeRecord } from '../data/appStore'
import type { ProfileTrade } from '../data/profileMock'

const fmtTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

type MarketLookup = { name?: string; thumbnailUrl?: string }

/** Convert persisted trade ledger → profile tape rows with FIFO realized PnL on sells. */
export const tradeRecordsToProfileTrades = (
  trades: TradeRecord[],
  marketLookup: (marketId: string) => MarketLookup | undefined
): ProfileTrade[] => {
  const sorted = [...trades].sort((a, b) => a.timestamp - b.timestamp)
  const openLots = new Map<string, { price: number; shares: number; pairId: string }[]>()
  const rows: ProfileTrade[] = []

  for (const t of sorted) {
    const m = marketLookup(t.marketId)
    const pairId = `${t.marketId}-${t.side}`
    if (t.action === 'buy') {
      const lots = openLots.get(pairId) ?? []
      lots.push({ price: t.price, shares: t.sharesAmount, pairId })
      openLots.set(pairId, lots)
      rows.push({
        id: t.id,
        timestamp: fmtTime(t.timestamp),
        timestampMs: t.timestamp,
        market: m?.name ?? t.marketName,
        marketId: t.marketId,
        thumbnailUrl: m?.thumbnailUrl,
        side: 'buy',
        price: t.price,
        sizeUsd: t.usdAmount,
        pnlUsd: 0,
        pairId,
        outcome: t.outcome
      })
      continue
    }

    const lots = openLots.get(pairId) ?? []
    let remaining = t.sharesAmount
    let costBasis = 0
    while (remaining > 0.0001 && lots.length > 0) {
      const lot = lots[0]
      const take = Math.min(remaining, lot.shares)
      costBasis += take * lot.price
      lot.shares -= take
      remaining -= take
      if (lot.shares <= 0.0001) lots.shift()
    }
    openLots.set(pairId, lots)
    const pnlUsd = t.usdAmount - costBasis

    rows.push({
      id: t.id,
      timestamp: fmtTime(t.timestamp),
      timestampMs: t.timestamp,
      market: m?.name ?? t.marketName,
      marketId: t.marketId,
      thumbnailUrl: m?.thumbnailUrl,
      side: 'sell',
      price: t.price,
      sizeUsd: t.usdAmount,
      pnlUsd: Number(pnlUsd.toFixed(0)),
      pairId,
      outcome: t.outcome
    })
  }

  return rows.sort((a, b) => b.timestampMs - a.timestampMs)
}

export const friendTradesToProfileTrades = (
  trades: FriendTrade[],
  marketLookup: (name: string) => MarketLookup | undefined
): ProfileTrade[] =>
  trades.map((t) => {
    const m = marketLookup(t.market)
    return {
      id: t.id,
      timestamp: t.timestamp,
      timestampMs: t.timestampMs,
      market: t.market,
      marketId: m ? undefined : undefined,
      thumbnailUrl: m?.thumbnailUrl,
      side: t.side,
      price: t.price,
      sizeUsd: t.sizeUsd,
      pnlUsd: t.pnlUsd,
      pairId: t.pairId,
      outcome: t.outcome
    }
  })

export const tradeRecordToFriendTrade = (t: TradeRecord, pnlUsd = 0): FriendTrade => ({
  id: t.id,
  timestamp: fmtTime(t.timestamp),
  timestampMs: t.timestamp,
  market: t.marketName,
  side: t.action,
  price: t.price,
  sizeUsd: t.usdAmount,
  pnlUsd,
  pairId: `${t.marketId}-${t.side}`,
  outcome: t.outcome
})
