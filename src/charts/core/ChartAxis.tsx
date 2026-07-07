import { chartTheme } from '../theme/chartTheme'

type XTick = {
  key: string
  label: string
  x: number
  textAnchor: 'start' | 'middle' | 'end'
}

type ChartAxisProps = {
  xTicks: XTick[]
  height: number
}

export const ChartAxis = ({ xTicks, height }: ChartAxisProps) => (
  <>
    {xTicks.map((tick) => (
      <text
        key={tick.key}
        x={tick.x}
        y={height - 6}
        textAnchor={tick.textAnchor}
        fill={chartTheme.axis}
        fontSize="11"
        fontFamily="Roboto Mono, monospace"
        fontWeight="650"
      >
        {tick.label}
      </text>
    ))}
  </>
)
