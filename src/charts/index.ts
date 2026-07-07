export { chartTheme, trendColor, trendFromValues } from './theme/chartTheme'

export type {
  ChartDataState,
  ChartViewport,
  ChartSeriesPaths,
  SparklinePaths,
  MarketChartData,
  ProfileEquityChartData,
  SparklineChartData,
  ChartProvider,
  ChartProviderResult
} from './data/types'

export {
  computeViewport,
  downsampleDataPoints,
  downsampleValues,
  getXAxisTickCount,
  formatXAxisTick,
  seriesToPath,
  buildLinePath,
  buildAreaPath,
  buildMarketSeriesPaths,
  buildSparklineFromValues,
  buildSparklineFromDataPoints,
  nearestPointIndex,
  resolveChartDataState,
  DEFAULT_CHART_PADDING
} from './data/transformChartData'

export { useChartData, useChartDataFromState } from './data/useChartData'

export { createMarketChartProvider, getMarketSeriesForWindow } from './data/providers/marketChartProvider'
export {
  buildProfileEquityChartData,
  createProfileEquityProvider
} from './data/providers/profileEquityProvider'
export {
  createSparklineProviderFromValues,
  createSparklineProviderFromDataPoints,
  createTradeSparklineProvider,
  dataPointsToValues
} from './data/providers/sparklineProvider'
export { createShareChartProvider } from './data/providers/shareChartProvider'

export { ChartShell } from './core/ChartShell'
export { ChartContainer } from './core/ChartContainer'
export { ChartSvg } from './core/ChartSvg'
export { ChartGrid } from './core/ChartGrid'
export { ChartAxis } from './core/ChartAxis'
export { ChartCrosshair } from './core/ChartCrosshair'
export { ChartTooltip, ChartTooltipRow } from './core/ChartTooltip'
export { ChartLegend } from './core/ChartLegend'
export { ChartStateView } from './core/ChartStateView'

export { EngineSparkline } from './components/EngineSparkline'
export { EngineMiniSparkline } from './components/EngineMiniSparkline'
export { EngineTradeSparkline } from './components/EngineTradeSparkline'
