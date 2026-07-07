import type { ChartTimeWindow, DataPoint } from '../../types/chart'

export type ChartDataState<T> =
  | { status: 'loading' }
  | { status: 'empty'; reason?: string }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T }

export type ChartViewport = {
  width: number
  height: number
  plotWidth: number
  plotHeight: number
  paddingLeft: number
  paddingRight: number
  paddingTop: number
  paddingBottom: number
}

export type ChartSeriesPaths = {
  linePath: string
  areaPath: string
  points: { x: number; y: number; index: number }[]
}

export type SparklinePaths = ChartSeriesPaths & {
  color: string
  isPositive: boolean
}

export type MarketChartData = {
  dataByWindow: Partial<Record<ChartTimeWindow, DataPoint[]>>
  activeWindow: ChartTimeWindow
  series: DataPoint[]
}

export type ProfileEquityChartData = {
  width: number
  height: number
  padding: number
  minY: number
  maxY: number
  y0: number
  tradingSeries: number[]
  lpSeries: number[]
  marketSeries: number[]
  labels: string[]
  paths: {
    trading: string
    lp: string
    marketCreating: string
  }
}

export type SparklineChartData = {
  series: number[]
  buyIdx?: number
  sellIdx?: number
  isPositive: boolean
}

export type ChartProviderResult<T> = ChartDataState<T>

export type ChartProvider<T> = () => ChartProviderResult<T>
