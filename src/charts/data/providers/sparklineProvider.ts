import type { DataPoint } from '../../../types/chart'
import { buildTradeSparkline } from '../../../utils/profileChart'
import type { ChartProviderResult, SparklineChartData } from '../types'

export const createSparklineProviderFromValues = (
  values: number[] | undefined,
  loading = false,
  error: string | null = null
): (() => ChartProviderResult<SparklineChartData>) => {
  return () => {
    if (loading) return { status: 'loading' }
    if (error) return { status: 'error', message: error }
    if (!values || values.length < 2) {
      return { status: 'empty', reason: 'Not enough data points' }
    }
    return {
      status: 'success',
      data: {
        series: values,
        isPositive: values[values.length - 1] - values[0] >= 0
      }
    }
  }
}

export const createSparklineProviderFromDataPoints = (
  data: DataPoint[] | undefined,
  loading = false,
  error: string | null = null
): (() => ChartProviderResult<SparklineChartData>) => {
  return () => {
    if (loading) return { status: 'loading' }
    if (error) return { status: 'error', message: error }
    if (!data || data.length < 2) {
      return { status: 'empty', reason: 'Not enough chart history' }
    }
    const values = data.map((p) => p.value)
    return {
      status: 'success',
      data: {
        series: values,
        isPositive: values[values.length - 1] - values[0] >= 0
      }
    }
  }
}

export const createTradeSparklineProvider = (
  buyPrice: number,
  sellPrice: number,
  seed: number
): (() => ChartProviderResult<SparklineChartData>) => {
  return () => {
    const { series, buyIdx, sellIdx } = buildTradeSparkline(buyPrice, sellPrice, seed)
    return {
      status: 'success',
      data: {
        series,
        buyIdx,
        sellIdx,
        isPositive: sellPrice >= buyPrice
      }
    }
  }
}

export const dataPointsToValues = (data: DataPoint[]) => data.map((p) => p.value)
