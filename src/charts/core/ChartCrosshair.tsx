import { chartTheme } from '../theme/chartTheme'
import type { ChartViewport } from '../data/types'

type ChartCrosshairProps = {
  viewport: ChartViewport
  x: number
  y: number
  color?: string
}

export const ChartCrosshair = ({
  viewport,
  x,
  y,
  color = chartTheme.crosshair
}: ChartCrosshairProps) => (
  <g pointerEvents="none">
    <line
      x1={x}
      x2={x}
      y1={viewport.paddingTop}
      y2={viewport.paddingTop + viewport.plotHeight}
      stroke={color}
      strokeWidth="1"
      strokeDasharray="4 3"
    />
    <circle
      cx={x}
      cy={y}
      r="4.5"
      fill="var(--chart-surface, #080809)"
      stroke={color}
      strokeWidth="2.5"
    />
  </g>
)
