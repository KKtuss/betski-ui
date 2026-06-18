import type { DataPoint, ChartTimeWindow } from '../types/chart'
import type { Market } from '../data/marketCatalog'
import { getLegacyVideos } from '../data/marketCatalog'
import type { ShareMarketPayload } from '../types/layoutShare'

export const buildShareMarket = (params: {
  selectedMarket: Market
  liveChartDataByWindow: Partial<Record<ChartTimeWindow, DataPoint[]>>
  marketChartDataByWindow: Partial<Record<ChartTimeWindow, DataPoint[]>>
  livePrice: number
}): ShareMarketPayload => {
  const { selectedMarket, liveChartDataByWindow, marketChartDataByWindow, livePrice } = params
  const live1D = liveChartDataByWindow['1D'] ?? marketChartDataByWindow['1D']
  const legacyId = getLegacyVideos().find((_, i) => selectedMarket.id === `legacy-${i + 1}`)
  return {
    videoId: legacyId ? getLegacyVideos().indexOf(legacyId) + 1 : 1,
    title: selectedMarket.name,
    yesOdds: live1D?.[live1D.length - 1]?.value ?? livePrice,
    chart: (live1D ?? []).slice(-24),
    timeLeftLabel: selectedMarket.timeLeftLabel,
    thumbnailVideoUrl: selectedMarket.legacyVideoUrl,
    thumbnailFallbackSrc: selectedMarket.previews[0]?.thumbnailUrl ?? '/Stems/betskuu.png'
  }
}
