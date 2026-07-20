import { chartTheme } from '../theme/chartTheme'
import type { ChartViewport } from '../data/types'

type ChartGridProps = {
  viewport: ChartViewport
  values?: number[]
  minY?: number
  maxY?: number
  formatLabel?: (value: number) => string
}

/** Shorter plots drop to 3 (then 2) ticks so labels never crowd or overlap. */
const adaptiveValues = (plotHeight: number) => {
  if (plotHeight < 70) return [0, 100]
  if (plotHeight < 150) return [0, 50, 100]
  return [0, 25, 50, 75, 100]
}

export const ChartGrid = ({
  viewport,
  values,
  minY = 0,
  maxY = 100,
  formatLabel = (v) => `${v}%`
}: ChartGridProps) => {
  const range = maxY - minY || 1
  const tickValues = values ?? adaptiveValues(viewport.plotHeight)
  const yAxisLabelX = viewport.paddingLeft + viewport.plotWidth + 10
  const labelFontSize = viewport.plotWidth < 420 ? 10 : 11

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
      {tickValues.map((value) => {
        const ratio = (value - minY) / range
        const yPos = viewport.paddingTop + viewport.plotHeight - ratio * viewport.plotHeight
        const isEdge = value === minY || value === maxY
        return (
          <g key={`grid-${value}`}>
            {/* Edge lines coincide with the plot frame — draw interior lines only */}
            {!isEdge && (
              <line
                x1={viewport.paddingLeft}
                y1={yPos}
                x2={viewport.paddingLeft + viewport.plotWidth}
                y2={yPos}
                stroke={chartTheme.gridSoft}
                strokeWidth="1"
              />
            )}
            <text
              x={yAxisLabelX}
              y={yPos + 3}
              textAnchor="start"
              fill={chartTheme.axis}
              fontSize={labelFontSize}
              fontWeight="600"
              style={{ userSelect: 'none', fontFamily: 'var(--font-mono, monospace)' }}
            >
              {formatLabel(value)}
            </text>
          </g>
        )
      })}
    </>
  )
}
