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
  fontSize?: number
}

export const ChartAxis = ({ xTicks, height, fontSize = 11 }: ChartAxisProps) => (
  <>
    {xTicks.map((tick) => (
      <text
        key={tick.key}
        x={tick.x}
        y={height - 6}
        textAnchor={tick.textAnchor}
        fill={chartTheme.axis}
        fontSize={fontSize}
        fontWeight="600"
        style={{ userSelect: 'none', fontFamily: 'var(--font-mono, monospace)' }}
      >
        {tick.label}
      </text>
    ))}
  </>
)
