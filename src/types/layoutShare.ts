export type ShareMarketPayload = {
  videoId: number
  title: string
  yesOdds: number
  chart: { value: number; timestamp: number }[]
  timeLeftLabel: string
  thumbnailVideoUrl?: string
  thumbnailFallbackSrc?: string
}

export type ShareTradePayload = {
  title: string
  side: 'YES' | 'NO'
  entry: number
  exit: number
  pnlUsd: number
  pnlPct: number
  chart: { value: number; timestamp: number }[]
  thumbnailSrc?: string
  thumbnailFallbackSrc?: string
}

export type PendingShare = {
  key: string
  chatId: string
  market: ShareMarketPayload
}

export type PendingShareText = {
  key: string
  chatId: string
  text: string
}

export type PendingShareTrade = {
  key: string
  chatId: string
  trade: ShareTradePayload
}
