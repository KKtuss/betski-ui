import type { ChartTimeWindow, DataPoint } from '../../types/chart'
import { clamp } from '../../utils/math'
import { chartTheme, trendFromValues } from '../theme/chartTheme'
import type { ChartSeriesPaths, ChartViewport, SparklinePaths } from './types'

export const DEFAULT_CHART_PADDING = chartTheme.padding

export const computeViewport = (
  width: number,
  height: number,
  padding = DEFAULT_CHART_PADDING
): ChartViewport => ({
  width,
  height,
  paddingLeft: padding.left,
  paddingRight: padding.right,
  paddingTop: padding.top,
  paddingBottom: padding.bottom,
  plotWidth: Math.max(0, width - padding.left - padding.right),
  plotHeight: Math.max(0, height - padding.top - padding.bottom)
})

export const downsampleDataPoints = (data: DataPoint[], maxPoints = chartTheme.sparkline.maxPoints) => {
  if (data.length <= maxPoints) return data
  return Array.from({ length: maxPoints }, (_, i) =>
    data[Math.round((i / (maxPoints - 1)) * (data.length - 1))]
  )
}

export const downsampleValues = (values: number[], maxPoints = chartTheme.sparkline.maxPoints) => {
  if (values.length <= maxPoints) return values
  return Array.from({ length: maxPoints }, (_, i) =>
    values[Math.round((i / (maxPoints - 1)) * (values.length - 1))]
  )
}

export const getXAxisTickCount = (timeWindow: ChartTimeWindow, plotWidth: number) => {
  const roomyCount = timeWindow === '1D' ? 6 : 5
  const compactCount = timeWindow === '1D' ? 5 : 4
  return plotWidth < 420 ? compactCount : roomyCount
}

export const formatXAxisTick = (timestamp: number, timeWindow: ChartTimeWindow) => {
  const date = new Date(timestamp)
  if (timeWindow === '1H' || timeWindow === '1D') {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }
  return `${date.getDate()}/${date.getMonth() + 1}`
}

export const seriesToPath = (
  series: number[],
  width: number,
  height: number,
  padding: number,
  minY: number,
  maxY: number
) => {
  if (series.length < 2) return ''
  const w = width - padding * 2
  const h = height - padding * 2
  const toX = (i: number) => padding + (i / (series.length - 1)) * w
  const range = Math.max(1, maxY - minY)
  const toY = (v: number) => padding + (1 - (v - minY) / range) * h
  let d = `M ${toX(0)} ${toY(series[0])}`
  for (let i = 1; i < series.length; i++) {
    d += ` L ${toX(i)} ${toY(series[i])}`
  }
  return d
}

const mapPoints = (
  count: number,
  viewport: ChartViewport,
  valueAt: (index: number) => number,
  minY: number,
  maxY: number
) => {
  const { paddingLeft, paddingTop, plotWidth, plotHeight } = viewport
  const range = Math.max(1e-9, maxY - minY)
  return Array.from({ length: count }, (_, i) => {
    const x = paddingLeft + (i / Math.max(1, count - 1)) * plotWidth
    const normalized = (valueAt(i) - minY) / range
    const y = paddingTop + plotHeight - normalized * plotHeight
    return { x, y, index: i }
  })
}

export const buildLinePath = (
  points: { x: number; y: number }[],
  style: 'smooth' | 'step' = 'smooth'
) => {
  if (points.length === 0) return ''
  if (style === 'step') {
    let path = `M ${points[0].x},${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x},${points[i - 1].y} L ${points[i].x},${points[i].y}`
    }
    return path
  }
  let path = `M ${points[0].x},${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x},${points[i].y}`
  }
  return path
}

export const buildAreaPath = (
  linePath: string,
  viewport: ChartViewport
) => {
  if (!linePath) return ''
  const bottom = viewport.paddingTop + viewport.plotHeight
  const right = viewport.paddingLeft + viewport.plotWidth
  return `${linePath} L ${right},${bottom} L ${viewport.paddingLeft},${bottom} Z`
}

export const buildMarketSeriesPaths = (
  data: DataPoint[],
  viewport: ChartViewport,
  yMin = 0,
  yMax = 100
): ChartSeriesPaths => {
  if (data.length === 0 || viewport.plotWidth <= 0 || viewport.plotHeight <= 0) {
    return { linePath: '', areaPath: '', points: [] }
  }
  const points = mapPoints(
    data.length,
    viewport,
    (i) => data[i].value,
    yMin,
    yMax
  )
  const linePath = buildLinePath(points, 'step')
  return {
    linePath,
    areaPath: buildAreaPath(linePath, viewport),
    points
  }
}

export const buildSparklineFromValues = (
  values: number[],
  viewBoxWidth: number,
  viewBoxHeight: number,
  options?: {
    paddingX?: number
    paddingY?: number
    valueMin?: number
    valueMax?: number
    clampValues?: boolean
  }
): SparklinePaths => {
  const paddingX = options?.paddingX ?? 1
  const paddingY = options?.paddingY ?? 0
  if (values.length < 2) {
    return { linePath: '', areaPath: '', points: [], color: chartTheme.neutral, isPositive: true }
  }

  const plotted = downsampleValues(values)
  const rawValues = plotted.map((v) => (options?.clampValues ? clamp(v, 1, 99) : v))
  const minValue = options?.valueMin ?? Math.min(...rawValues)
  const maxValue = options?.valueMax ?? Math.max(...rawValues)
  const range = Math.max(4, maxValue - minValue)
  const paddedMin = options?.clampValues ? clamp(minValue - range * 0.18, 1, 99) : minValue - range * 0.18
  const paddedMax = options?.clampValues ? clamp(maxValue + range * 0.18, 1, 99) : maxValue + range * 0.18
  const paddedRange = Math.max(1, paddedMax - paddedMin)
  const chartW = viewBoxWidth - paddingX * 2
  const chartH = viewBoxHeight - paddingY * 2

  const points = plotted.map((value, i) => ({
    x: paddingX + (i / Math.max(1, plotted.length - 1)) * chartW,
    y: paddingY + chartH - ((value - paddedMin) / paddedRange) * chartH,
    index: i
  }))

  const linePath = buildLinePath(points, 'smooth')
  const bottomY = viewBoxHeight
  const areaPath = linePath
    ? `${linePath} L ${viewBoxWidth - paddingX},${bottomY} L ${paddingX},${bottomY} Z`
    : ''

  const isPositive = values[values.length - 1] - values[0] >= 0
  return {
    linePath,
    areaPath,
    points,
    color: trendFromValues(values[0], values[values.length - 1]),
    isPositive
  }
}

export const buildSparklineFromDataPoints = (
  data: DataPoint[],
  viewBoxWidth: number,
  viewBoxHeight: number
) => {
  const values = downsampleDataPoints(data).map((p) => clamp(p.value, 1, 99))
  return buildSparklineFromValues(values, viewBoxWidth, viewBoxHeight, { clampValues: true })
}

export const nearestPointIndex = (
  mouseX: number,
  viewport: ChartViewport,
  pointCount: number
) => {
  if (pointCount <= 1 || viewport.plotWidth <= 0) return 0
  const ratio = (mouseX - viewport.paddingLeft) / viewport.plotWidth
  return Math.max(0, Math.min(pointCount - 1, Math.round(ratio * (pointCount - 1))))
}

export const resolveChartDataState = <T,>(
  loading: boolean,
  error: string | null,
  data: T | null | undefined,
  isEmpty: (data: T) => boolean,
  emptyReason?: string
) => {
  if (loading) return { status: 'loading' } as const
  if (error) return { status: 'error', message: error } as const
  if (data == null || isEmpty(data)) return { status: 'empty', reason: emptyReason } as const
  return { status: 'success', data } as const
}
