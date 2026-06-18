import type { DataPoint } from './chart'

export type BatchPreviewItem = {
  id: string
  /** Original TikTok / Reels / Shorts URL — used to resolve thumbnails in admin. */
  sourceUrl?: string
  thumbnailUrl: string
  volume: number
}

export type FriendBuy = {
  handle: string
  avatar: string
  side: 'YES' | 'NO'
  amountUsd: number
  /** Price (in cents) at which the friend bought their side. */
  oddsAt: number
  ago: string
}

export type Batch = {
  id: string
  name: string
  yesOdds: number
  noOdds: number
  resolutionTimestamp: number
  resolutionDateLabel: string
  volume: number
  volume24h: number
  top10WinRate: number
  avgHoldMinutes: number
  holders: number
  chart: DataPoint[]
  previews: BatchPreviewItem[]
  priceChange: number
  timeLeftLabel: string
  friendBuys: FriendBuy[]
  /** When true, hidden from the discovery page (admin-controlled). */
  hidden?: boolean
}

/**
 * A "Wager" is a fixed-odds bet — but rather than a single price, it has
 * a heatmap of price tiers buyers can take. Each tier is a YES/NO odds
 * pair with its own accumulated volume. The volume distribution across
 * tiers is what creates the heatmap effect: hotter tiers = where the
 * money is sitting. Once total pool >= promotionThreshold, the wager is
 * promoted into a Market (Batch) with a chart + variable odds.
 */
/** An open bet sitting at exact odds, waiting to be filled or matched. */
export type OpenBet = {
  /** YES odds in cents (1-99). NO odds = 100 - yesOdds. */
  yesOdds: number
  /** Total volume (USD) placed at this exact odds point. */
  volume: number
}

export type WagerFill = {
  id: string
  handle: string
  avatar?: string
  side: 'YES' | 'NO'
  yesOdds: number
  usdAmount: number
  timestamp: number
}

export type SelectedLineFill = {
  id: string
  side: 'YES' | 'NO'
  counterpartyName: string
  counterpartyType: 'friend' | 'market' | 'user'
  availableSize: number
  partialFillAllowed: boolean
  yesOdds: number
  noOdds: number
}

export type Wager = {
  id: string
  name: string
  question: string
  /** Open bets across the full 1-99 spectrum. Sparse — only populated odds. */
  openBets: OpenBet[]
  pool: number
  promotionThreshold: number
  createdAtTimestamp: number
  resolutionTimestamp: number
  resolutionDateLabel: string
  timeLeftLabel: string
  previews: BatchPreviewItem[]
  friendBuys: FriendBuy[]
  creatorHandle: string
  fills?: WagerFill[]
  /** When true, hidden from the discovery page (admin-controlled). */
  hidden?: boolean
}

export type WagerSortKey = 'active' | 'promotion' | 'newest' | 'expiring'

export type MarketSortKey = 'trending' | 'expiring' | 'newest'
