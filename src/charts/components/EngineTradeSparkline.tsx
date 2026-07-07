import { useId, useMemo } from 'react'
import { ChartStateView } from '../core/ChartStateView'
import { buildSparklineFromValues } from '../data/transformChartData'
import type { SparklineChartData } from '../data/types'

type EngineTradeSparklineProps = {
  series: number[]
  buyIdx: number
  sellIdx: number
  width: number
  height: number
  padX?: number
  padY?: number
  isPositive: boolean
}

export const EngineTradeSparkline = ({
  series,
  buyIdx,
  sellIdx,
  width,
  height,
  padX = 12,
  padY = 4,
  isPositive
}: EngineTradeSparklineProps) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const state = useMemo(() => {
    if (series.length < 2) return { status: 'empty' as const, reason: 'Not enough data' }
    return {
      status: 'success' as const,
      data: { series, buyIdx, sellIdx, isPositive } satisfies SparklineChartData
    }
  }, [series, buyIdx, sellIdx, isPositive])

  const paths = useMemo(
    () => buildSparklineFromValues(series, width, height, { paddingX: padX, paddingY: padY }),
    [series, width, height, padX, padY]
  )
  const color = isPositive ? 'var(--chart-profit)' : 'var(--chart-loss)'
  const bx = paths.points[buyIdx]?.x ?? padX
  const by = paths.points[buyIdx]?.y ?? height / 2
  const sx = paths.points[sellIdx]?.x ?? width - padX
  const sy = paths.points[sellIdx]?.y ?? height / 2

  return (
    <ChartStateView state={state} emptyLabel="">
      {() => (
        <svg
          className="profile-highlight-chart-svg"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id={`tradeSparkline-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <line
            x1={padX}
            x2={width - padX}
            y1={height - padY}
            y2={height - padY}
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="1"
          />
          {paths.areaPath && <path d={paths.areaPath} fill={`url(#tradeSparkline-${uid})`} />}
          {paths.linePath && (
            <path
              d={paths.linePath}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          <circle cx={bx} cy={by} r="3.5" fill={isPositive ? 'var(--chart-profit)' : 'rgba(255,255,255,0.7)'} />
          <text className="profile-highlight-marker-label" x={bx - 5} y={by + 3.5} textAnchor="end">
            B
          </text>
          <circle cx={sx} cy={sy} r="3.5" fill={isPositive ? 'rgba(255,255,255,0.7)' : 'var(--chart-loss)'} />
          <text className="profile-highlight-marker-label" x={sx + 5} y={sy + 3.5} textAnchor="start">
            S
          </text>
        </svg>
      )}
    </ChartStateView>
  )
}
