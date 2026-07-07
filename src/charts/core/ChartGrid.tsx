import { chartTheme } from '../theme/chartTheme'
import type { ChartViewport } from '../data/types'

type ChartGridProps = {
  viewport: ChartViewport
  values?: number[]
  minY?: number
  maxY?: number
  formatLabel?: (value: number) => string
}

export const ChartGrid = ({
  viewport,
  values = [0, 25, 50, 75, 100],
  minY = 0,
  maxY = 100,
  formatLabel = (v) => `${v}%`
}: ChartGridProps) => {
  const range = maxY - minY || 1
  const yAxisLabelX = viewport.paddingLeft + viewport.plotWidth + 10

  return (
    <>
      <rect
        x={viewport.paddingLeft}
        y={viewport.paddingTop}
        width={viewport.plotWidth}
        height={viewport.plotHeight}
        fill="var(--chart-surface, #080809)"
        stroke={chartTheme.grid}
        strokeWidth="1"
        rx="4"
      />
      {values.map((value) => {
        const ratio = (value - minY) / range
        const yPos = viewport.paddingTop + viewport.plotHeight - ratio * viewport.plotHeight
        return (
          <g key={`grid-${value}`}>
            <line
              x1={viewport.paddingLeft}
              y1={yPos}
              x2={viewport.paddingLeft + viewport.plotWidth}
              y2={yPos}
              stroke={chartTheme.grid}
              strokeWidth="1"
              strokeDasharray="2 4"
            />
            <text
              x={yAxisLabelX}
              y={yPos + 3}
              textAnchor="start"
              fill={chartTheme.axis}
              fontSize="11"
              fontFamily="Roboto Mono, monospace"
              fontWeight="650"
              style={{ userSelect: 'none' }}
            >
              {formatLabel(value)}
            </text>
          </g>
        )
      })}
    </>
  )
}
