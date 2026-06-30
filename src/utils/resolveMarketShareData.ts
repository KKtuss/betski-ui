import { buildMarketCatalog, getMarketById } from '../data/marketCatalog'
import { loadDiscoveryCatalog } from '../data/discoveryStore'
import type { DataPoint } from '../types/chart'

export type ResolvedMarketShare = {
  marketId: string
  title: string
  yesOdds: number
  chart: DataPoint[]
  priceChange: number
  timeLeftLabel: string
  thumbnailVideoUrl?: string
  thumbnailFallbackSrc?: string
  thumbnailUrls: string[]
  volume24h: number
  holders: number
  winRate: number
}

/** Live batch/market fields for share cards — same chart source as Discovery. */
export const resolveMarketShareData = (marketId: string): ResolvedMarketShare | null => {
  const market = getMarketById(marketId)
  if (!market) return null

  const batch = loadDiscoveryCatalog().batches.find((b) => b.id === marketId)
  const chart = market.chart.length > 0 ? market.chart : batch?.chart ?? []
  const yesOdds = chart.length > 0 ? chart[chart.length - 1].value : market.yesOdds

  return {
    marketId,
    title: market.name,
    yesOdds,
    chart,
    priceChange: batch?.priceChange ?? 0,
    timeLeftLabel: market.timeLeftLabel,
    thumbnailVideoUrl: market.previews[0]?.videoUrl,
    thumbnailFallbackSrc: market.previews[0]?.thumbnailUrl ?? '/Stems/betskuu.png',
    thumbnailUrls: market.previews
      .slice(0, 3)
      .map((preview) => preview.thumbnailUrl ?? '/Stems/betskuu.png'),
    volume24h: market.volume24h,
    holders: market.holders,
    winRate: batch?.top10WinRate ?? 76
  }
}

/** Resolve stacked preview thumbs for trade PNL cards — by id or exact market title. */
export const resolveTradeShareVisuals = (params: {
  marketId?: string
  title?: string
}): Pick<ResolvedMarketShare, 'thumbnailUrls' | 'thumbnailFallbackSrc'> | null => {
  const resolveId = (marketId: string) => {
    const live = resolveMarketShareData(marketId)
    if (!live) return null
    return {
      thumbnailUrls: live.thumbnailUrls,
      thumbnailFallbackSrc: live.thumbnailFallbackSrc
    }
  }

  if (params.marketId) {
    const resolved = resolveId(params.marketId)
    if (resolved) return resolved
  }

  if (params.title) {
    const match = buildMarketCatalog().find((market) => market.name === params.title)
    if (match) return resolveId(match.id)
  }

  return null
}
