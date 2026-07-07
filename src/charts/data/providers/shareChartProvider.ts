import type { DataPoint } from '../../../types/chart'
import type { ChartProviderResult } from '../types'

export const createShareChartProvider = (
  chart: DataPoint[] | undefined,
  loading = false,
  error: string | null = null
): (() => ChartProviderResult<DataPoint[]>) => {
  return () => {
    if (loading) return { status: 'loading' }
    if (error) return { status: 'error', message: error }
    if (!chart || chart.length < 2) {
      return { status: 'empty', reason: 'Chart unavailable' }
    }
    return { status: 'success', data: chart }
  }
}
