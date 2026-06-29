import { clamp } from '../utils/math'
import { mulberry32 } from '../utils/random'

export interface ProfileTrade {
  id: string
  timestamp: string
  timestampMs: number
  market: string
  marketId?: string
  thumbnailUrl?: string
  side: 'buy' | 'sell'
  price: number
  sizeUsd: number
  pnlUsd: number
  pairId: string
  outcome: 'YES' | 'NO'
}

/** Lightweight market reference so seeded history points at real, app-wide markets. */
export type MarketRef = { id: string; name: string; thumbnailUrl?: string }

export const generateSeededTrades = (markets: MarketRef[]): ProfileTrade[] => {
  const baseMarkets: MarketRef[] = markets.length > 0 ? markets : [{ id: 'batch-1', name: 'Market' }]
  const rng = mulberry32(90842)
  const now = Date.now()
  const DAY_MS = 24 * 60 * 60 * 1000
  const HOUR_MS = 60 * 60 * 1000
  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const N_PAIRS = 30
  let price = 0.32
  const pairs: ProfileTrade[][] = []

  for (let i = N_PAIRS - 1; i >= 0; i--) {
    const buyMs = now - i * DAY_MS - 3 * HOUR_MS
    const sellMs = now - i * DAY_MS - 1 * HOUR_MS

    const buyPrice = clamp(price, 0.12, 0.88)
    const buySizeUsd = 700 + rng() * 3200
    const shares = buySizeUsd / Math.max(buyPrice, 0.01)

    const drift = 0.018 + (rng() - 0.36) * 0.08
    const vol = (rng() - 0.5) * 0.04
    const sellPrice = clamp(price + drift + vol, 0.12, 0.88)
    const sellSizeUsd = shares * sellPrice
    const pairPnl = sellSizeUsd - buySizeUsd

    const pairId = `pair-${i}`
    const outcome: 'YES' | 'NO' = rng() > 0.48 ? 'YES' : 'NO'
    const ref = baseMarkets[i % baseMarkets.length]
    pairs.push([
      {
        id: `t-${i}-buy`,
        timestamp: fmt(new Date(buyMs)),
        timestampMs: buyMs,
        market: ref.name,
        marketId: ref.id,
        thumbnailUrl: ref.thumbnailUrl,
        side: 'buy',
        price: Number(buyPrice.toFixed(3)),
        sizeUsd: Number(buySizeUsd.toFixed(0)),
        pnlUsd: 0,
        pairId,
        outcome
      },
      {
        id: `t-${i}-sell`,
        timestamp: fmt(new Date(sellMs)),
        timestampMs: sellMs,
        market: ref.name,
        marketId: ref.id,
        thumbnailUrl: ref.thumbnailUrl,
        side: 'sell',
        price: Number(sellPrice.toFixed(3)),
        sizeUsd: Number(sellSizeUsd.toFixed(0)),
        pnlUsd: Number(pairPnl.toFixed(0)),
        pairId,
        outcome
      }
    ])

    price = clamp(sellPrice + (rng() - 0.5) * 0.03, 0.12, 0.88)
  }

  const out: ProfileTrade[] = []
  for (let i = pairs.length - 1; i >= 0; i--) {
    const [buy, sell] = pairs[i]
    out.push(sell, buy)
  }
  return out
}
