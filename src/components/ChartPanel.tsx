import { motion } from 'framer-motion'
import { useId, useMemo, useState, useEffect, useRef } from 'react'
import type { DataPoint, ChartTimeWindow } from '../types/chart'
import { ChartAxis } from '../charts/core/ChartAxis'
import { ChartContainer } from '../charts/core/ChartContainer'
import { ChartCrosshair } from '../charts/core/ChartCrosshair'
import { ChartGrid } from '../charts/core/ChartGrid'
import { ChartStateView } from '../charts/core/ChartStateView'
import { ChartSvg } from '../charts/core/ChartSvg'
import { ChartTooltip } from '../charts/core/ChartTooltip'
import {
  buildMarketSeriesPaths,
  formatXAxisTick,
  getXAxisTickCount,
  nearestPointIndex
} from '../charts/data/transformChartData'
import { createMarketChartProvider } from '../charts/data/providers/marketChartProvider'
import { trendFromValues } from '../charts/theme/chartTheme'
import { formatTime } from '../utils/chartFormat'
import { formatCompactUsd } from '../utils/formatCompact'
import './Panel.css'

interface ChartPanelProps {
  data?: DataPoint[]
  dataByWindow?: Partial<Record<ChartTimeWindow, DataPoint[]>>
  timeLeftLabel?: string
  resolutionTimestamp?: number
  volume24h?: number
}

const formatCountdown = (targetTimestamp: number, now: number) => {
  const diffMs = Math.max(0, targetTimestamp - now)
  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) {
    return `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const ChartPanel = ({
  data: externalData,
  dataByWindow,
  timeLeftLabel,
  resolutionTimestamp,
  volume24h
}: ChartPanelProps) => {
  const gradientUid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const hasMountedRef = useRef(false)
  const [countdownNow, setCountdownNow] = useState(() => Date.now())
  const [timeWindow, setTimeWindow] = useState<ChartTimeWindow>('1D')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const series = dataByWindow?.[timeWindow] ?? externalData ?? []

  const provider = useMemo(
    () =>
      createMarketChartProvider(
        series.length > 0
          ? {
              chartDataByWindow: (dataByWindow ?? { [timeWindow]: series }) as Record<
                ChartTimeWindow,
                DataPoint[]
              >,
              rules: [],
              topHolders: [],
              lpPositions: [],
              recentTrades: [],
              basePrice: series[series.length - 1]?.value ?? 50
            }
          : null,
        timeWindow
      ),
    [dataByWindow, series, timeWindow]
  )
  const chartState = provider()

  useEffect(() => {
    hasMountedRef.current = true
  }, [])

  useEffect(() => {
    if (!resolutionTimestamp) return
    const interval = window.setInterval(() => setCountdownNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [resolutionTimestamp])

  const countdownLabel = resolutionTimestamp
    ? formatCountdown(resolutionTimestamp, countdownNow)
    : timeLeftLabel

  const volumeLabel = useMemo(() => {
    if (volume24h == null || volume24h <= 0) return 'â€”'
    const windowScale: Record<ChartTimeWindow, number> = {
      '1H': 0.06,
      '1D': 0.25,
      '1W': 0.55,
      '1M': 0.85,
      MAX: 1
    }
    return formatCompactUsd(Math.round(volume24h * windowScale[timeWindow]))
  }, [volume24h, timeWindow])

  const headerStats = useMemo(() => {
    if (series.length < 2) return null
    const lastPoint = series[series.length - 1]
    const firstPoint = series[0]
    const change = lastPoint.value - firstPoint.value
    const isPositive = change >= 0
    const buyTxs = series.reduce(
      (acc, point, index) => (index > 0 && point.value > series[index - 1].value ? acc + 1 : acc),
      0
    )
    const sellTxs = series.reduce(
      (acc, point, index) => (index > 0 && point.value < series[index - 1].value ? acc + 1 : acc),
      0
    )
    return { lastPoint, change, isPositive, buyTxs, sellTxs, color: trendFromValues(firstPoint.value, lastPoint.value) }
  }, [series])

  return (
    <motion.div
      className="panel chart-panel"
      initial={hasMountedRef.current ? false : { opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      whileHover={{ scale: 1, boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)' }}
    >
      <motion.div
        className="chart-header"
        initial={hasMountedRef.current ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <div className="chart-header-top">
          <span className="chart-eyebrow">MARKET OVERVIEW</span>
          {countdownLabel && (
            <div className="chart-resolution-pill">
              <span className="chart-pill-dot" aria-hidden />
              <span>{countdownLabel}</span>
            </div>
          )}
        </div>
        <div className="chart-header-main">
          {headerStats && (
            <div className="chart-price-row">
              <span className="chart-main-value" style={{ color: headerStats.color }}>
                {Math.round(headerStats.lastPoint.value)}%
              </span>
              <span className="chart-change-chip" style={{ color: headerStats.color }}>
                {headerStats.isPositive ? 'â–²' : 'â–¼'} {Math.abs(headerStats.change).toFixed(1)}%
              </span>
            </div>
          )}
          <div className="time-selector chart-time-selector" role="tablist" aria-label="Chart time window">
            {(['1H', '1D', '1W', '1M', 'MAX'] as const).map((tw) => (
              <button
                key={tw}
                type="button"
                role="tab"
                aria-selected={timeWindow === tw}
                onClick={() => setTimeWindow(tw)}
                className={`time-btn ${timeWindow === tw ? 'active' : ''}`}
              >
                {tw}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="chart-frame">
        <div className="panel-content chart-content" style={{ width: '100%', flex: 1, minHeight: 0 }}>
          <ChartStateView state={chartState} emptyLabel="No chart data">
            {({ series: chartSeries }) => (
              <ChartContainer>
                {(viewport) => {
                  const paths = buildMarketSeriesPaths(chartSeries, viewport)
                  const firstPoint = chartSeries[0]
                  const lastPoint = chartSeries[chartSeries.length - 1]
                  const color = trendFromValues(firstPoint.value, lastPoint.value)
                  const gradientId = `chartGradient-${gradientUid}-${timeWindow}`
                  const glowId = `chartGlow-${gradientUid}-${timeWindow}`
                  const isCompact = viewport.plotWidth < 420
                  const tickCount = getXAxisTickCount(timeWindow, viewport.plotWidth)
                  const xTicks = Array.from({ length: tickCount }, (_, i) => {
                    const ratio = i / Math.max(1, tickCount - 1)
                    const timestamp =
                      firstPoint.timestamp + (lastPoint.timestamp - firstPoint.timestamp) * ratio
                    return {
                      key: `${timeWindow}-${i}-${Math.round(timestamp)}`,
                      label: formatXAxisTick(timestamp, timeWindow),
                      x: viewport.paddingLeft + ratio * viewport.plotWidth,
                      textAnchor:
                        i === 0 ? ('start' as const) : i === tickCount - 1 ? ('end' as const) : ('middle' as const)
                    }
                  })
                  const hoverPoint =
                    hoveredIndex != null && paths.points[hoveredIndex]
                      ? {
                          ...paths.points[hoveredIndex],
                          value: chartSeries[hoveredIndex].value,
                          time: formatTime(hoveredIndex, chartSeries, timeWindow)
                        }
                      : null

                  return (
                    <motion.div className="chart-container" style={{ width: '100%', height: '100%' }}>
                      <ChartSvg
                        viewportWidth={viewport.width}
                        viewportHeight={viewport.height}
                        className="chart-svg"
                        style={{ overflow: 'visible' }}
                      >
                        <defs>
                          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.12" />
                            <stop offset="100%" stopColor={color} stopOpacity="0" />
                          </linearGradient>
                          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                              <feMergeNode in="coloredBlur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>

                        <ChartGrid viewport={viewport} />
                        <ChartAxis xTicks={xTicks} height={viewport.height} fontSize={isCompact ? 10 : 11} />

                        {paths.areaPath && (
                          <motion.path
                            key={`area-${timeWindow}`}
                            d={paths.areaPath}
                            fill={`url(#${gradientId})`}
                            stroke="none"
                            initial={{ d: paths.areaPath }}
                            animate={{ d: paths.areaPath }}
                            transition={{ duration: 0.4, ease: 'easeInOut' }}
                          />
                        )}

                        {paths.linePath && (
                          <motion.path
                            key={`line-${timeWindow}`}
                            d={paths.linePath}
                            fill="none"
                            stroke={color}
                            strokeWidth="2.3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter={`url(#${glowId})`}
                            initial={{ d: paths.linePath, pathLength: 0 }}
                            animate={{ d: paths.linePath, pathLength: 1 }}
                            transition={{ duration: 0.4, ease: 'easeInOut' }}
                          />
                        )}

                        {paths.points.length > 0 && (
                          <g>
                            <circle
                              className="chart-endpoint-pulse"
                              cx={paths.points[paths.points.length - 1].x}
                              cy={paths.points[paths.points.length - 1].y}
                              r="6"
                              fill={color}
                              fillOpacity="0.2"
                            />
                            <circle
                              cx={paths.points[paths.points.length - 1].x}
                              cy={paths.points[paths.points.length - 1].y}
                              r="3"
                              fill={color}
                            />
                          </g>
                        )}

                        {/* touch-action pan-y keeps vertical sheet scrolling while horizontal drags scrub */}
                        <rect
                          x={viewport.paddingLeft}
                          y={viewport.paddingTop}
                          width={viewport.plotWidth}
                          height={viewport.plotHeight}
                          fill="transparent"
                          style={{ touchAction: 'pan-y' }}
                          onPointerMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            const pointerX = e.clientX - rect.left + viewport.paddingLeft
                            setHoveredIndex(nearestPointIndex(pointerX, viewport, chartSeries.length))
                          }}
                          onPointerDown={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            const pointerX = e.clientX - rect.left + viewport.paddingLeft
                            setHoveredIndex(nearestPointIndex(pointerX, viewport, chartSeries.length))
                          }}
                          onPointerLeave={() => setHoveredIndex(null)}
                          onPointerCancel={() => setHoveredIndex(null)}
                        />

                        {hoverPoint && (
                          <ChartCrosshair viewport={viewport} x={hoverPoint.x} y={hoverPoint.y} color={color} />
                        )}
                      </ChartSvg>

                      {/* Tooltip flips to the far side of the crosshair so it never covers the hovered point */}
                      {hoverPoint && (
                        <ChartTooltip
                          left={`${(hoverPoint.x / viewport.width) * 100}%`}
                          top="8px"
                          transform={
                            hoverPoint.x / viewport.width > 0.55
                              ? 'translateX(calc(-100% - 10px))'
                              : 'translateX(10px)'
                          }
                        >
                          <div className="chart-tooltip-label">{hoverPoint.time}</div>
                          <div className="chart-tooltip-value">{hoverPoint.value.toFixed(1)}%</div>
                        </ChartTooltip>
                      )}
                    </motion.div>
                  )
                }}
              </ChartContainer>
            )}
          </ChartStateView>
        </div>
      </div>

      {headerStats && (
        <div className="chart-stat-strip">
          <div className="chart-stat">
            <span className="chart-stat-value">{volumeLabel}</span>
            <span className="chart-stat-label">Volume</span>
          </div>
          <div className="chart-stat">
            <span className="chart-stat-value" style={{ color: headerStats.color }}>
              {headerStats.isPositive ? '+' : '-'}
              {Math.abs(headerStats.change).toFixed(1)}%
            </span>
            <span className="chart-stat-label">Change</span>
          </div>
          <div className="chart-stat">
            <span className="chart-stat-value">{headerStats.buyTxs.toLocaleString()}</span>
            <span className="chart-stat-label">Buy txs</span>
          </div>
          <div className="chart-stat">
            <span className="chart-stat-value">{headerStats.sellTxs.toLocaleString()}</span>
            <span className="chart-stat-label">Sell txs</span>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default ChartPanel
