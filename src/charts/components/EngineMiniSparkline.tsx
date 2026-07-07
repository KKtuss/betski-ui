import { useMemo } from 'react'
import { ChartStateView } from '../core/ChartStateView'
import { createSparklineProviderFromValues } from '../data/providers/sparklineProvider'
import { buildSparklineFromValues } from '../data/transformChartData'

type EngineMiniSparklineProps = {
  data: number[]
  positive?: boolean
  width?: number
  height?: number
  loading?: boolean
  error?: string | null
}

export const EngineMiniSparkline = ({
  data,
  positive,
  width = 80,
  height = 28,
  loading = false,
  error = null
}: EngineMiniSparklineProps) => {
  const provider = useMemo(
    () => createSparklineProviderFromValues(data, loading, error),
    [data, loading, error]
  )
  const state = provider()
  const isPositive = positive ?? (data.length >= 2 ? data[data.length - 1] - data[0] >= 0 : true)

  const paths = useMemo(
    () =>
      buildSparklineFromValues(data, width, height, {
        paddingX: 2,
        paddingY: 2
      }),
    [data, width, height]
  )

  const color = isPositive ? 'var(--chart-profit)' : 'var(--chart-loss)'

  return (
    <ChartStateView state={state} emptyLabel="">
      {() => (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
          {paths.linePath && (
            <path
              d={paths.linePath}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      )}
    </ChartStateView>
  )
}
