import { useId, useMemo } from 'react'
import type { DataPoint } from '../../types/chart'
import { ChartStateView } from '../core/ChartStateView'
import { createSparklineProviderFromDataPoints } from '../data/providers/sparklineProvider'
import { buildSparklineFromDataPoints } from '../data/transformChartData'

type EngineSparklineProps = {
  data: DataPoint[]
  className?: string
  viewBoxWidth?: number
  viewBoxHeight?: number
  loading?: boolean
  error?: string | null
}

export const EngineSparkline = ({
  data,
  className = 'discovery-sparkline',
  viewBoxWidth = 100,
  viewBoxHeight = 64,
  loading = false,
  error = null
}: EngineSparklineProps) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const provider = useMemo(
    () => createSparklineProviderFromDataPoints(data, loading, error),
    [data, loading, error]
  )
  const state = provider()

  const paths = useMemo(
    () => buildSparklineFromDataPoints(data, viewBoxWidth, viewBoxHeight),
    [data, viewBoxWidth, viewBoxHeight]
  )

  return (
    <ChartStateView state={state} emptyLabel="No chart history">
      {() => (
        <div className={className}>
          <svg
            className="discovery-sparkline-svg"
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient
                id={`sparklineGradient-${uid}-${paths.isPositive ? 'pos' : 'neg'}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={paths.color} stopOpacity="0.12" />
                <stop offset="100%" stopColor={paths.color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {paths.areaPath && (
              <path
                d={paths.areaPath}
                fill={`url(#sparklineGradient-${uid}-${paths.isPositive ? 'pos' : 'neg'})`}
              />
            )}
            {paths.linePath && (
              <path
                d={paths.linePath}
                fill="none"
                stroke={paths.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </div>
      )}
    </ChartStateView>
  )
}
