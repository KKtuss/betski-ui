import type { DataPoint, ChartTimeWindow } from '../types/chart'
import type { Market } from '../data/marketCatalog'
import { getLegacyVideos } from '../data/marketCatalog'
import type { ShareMarketPayload } from '../types/layoutShare'
import { loadDiscoveryCatalog } from '../data/discoveryStore'

export const buildShareMarket = (params: {
  selectedMarket: Market
  liveChartDataByWindow: Partial<Record<ChartTimeWindow, DataPoint[]>>
  marketChartDataByWindow: Partial<Record<ChartTimeWindow, DataPoint[]>>
  livePrice: number
}): ShareMarketPayload => {
  const { selectedMarket, liveChartDataByWindow, marketChartDataByWindow, livePrice } = params
  const live1D = liveChartDataByWindow['1D'] ?? marketChartDataByWindow['1D']
  const legacyId = getLegacyVideos().find((_, i) => selectedMarket.id === `legacy-${i + 1}`)
  const chart =
    selectedMarket.chart.length > 0
      ? selectedMarket.chart
      : (live1D ?? [])
  const batch = loadDiscoveryCatalog().batches.find((b) => b.id === selectedMarket.id)
  return {
    marketId: selectedMarket.id,
    videoId: legacyId ? getLegacyVideos().indexOf(legacyId) + 1 : 1,
    title: selectedMarket.name,
    yesOdds: chart.length > 0 ? chart[chart.length - 1].value : (live1D?.[live1D.length - 1]?.value ?? livePrice),
    chart,
    timeLeftLabel: selectedMarket.timeLeftLabel,
    thumbnailVideoUrl: selectedMarket.previews[0]?.videoUrl ?? selectedMarket.legacyVideoUrl,
    thumbnailFallbackSrc: selectedMarket.previews[0]?.thumbnailUrl ?? '/Stems/BetskiPEFFPEE.png',
    thumbnailUrls: selectedMarket.previews
      .slice(0, 3)
      .map((preview) => preview.thumbnailUrl ?? '/Stems/BetskiPEFFPEE.png'),
    volume24h: selectedMarket.volume24h,
    holders: selectedMarket.holders,
    winRate: batch?.top10WinRate ?? 76,
    priceChange: batch?.priceChange ?? 0
  }
}
