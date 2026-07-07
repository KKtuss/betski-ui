import type { ChartTimeWindow, DataPoint } from '../../../types/chart'
import type { MarketViewData } from '../../../utils/buildMarketViewData'
import type { ChartProviderResult, MarketChartData } from '../types'

export const createMarketChartProvider = (
  marketData: MarketViewData | null,
  activeWindow: ChartTimeWindow,
  loading = false,
  error: string | null = null
): (() => ChartProviderResult<MarketChartData>) => {
  return () => {
    if (loading) return { status: 'loading' }
    if (error) return { status: 'error', message: error }
    if (!marketData) return { status: 'empty', reason: 'Market data unavailable' }

    const series = marketData.chartDataByWindow[activeWindow] ?? []
    if (series.length === 0) {
      return { status: 'empty', reason: 'No chart data for this window' }
    }

    return {
      status: 'success',
      data: {
        dataByWindow: marketData.chartDataByWindow,
        activeWindow,
        series
      }
    }
  }
}

export const getMarketSeriesForWindow = (
  dataByWindow: Partial<Record<ChartTimeWindow, DataPoint[]>>,
  window: ChartTimeWindow
) => dataByWindow[window] ?? []
