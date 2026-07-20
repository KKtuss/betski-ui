import type { ReactNode } from 'react'

type ChartTooltipProps = {
  left: string
  top?: string
  transform?: string
  children: ReactNode
  className?: string
}

export const ChartTooltip = ({
  left,
  top = '0',
  transform,
  children,
  className = ''
}: ChartTooltipProps) => (
  <div
    className={`chart-tooltip ${className}`.trim()}
    style={{ left, top, transform }}
  >
    {children}
  </div>
)

type ChartTooltipRowProps = {
  label: string
  value: string
  tone?: 'default' | 'profit' | 'loss' | 'muted'
  swatchColor?: string
}

export const ChartTooltipRow = ({
  label,
  value,
  tone = 'default',
  swatchColor
}: ChartTooltipRowProps) => (
  <div className="chart-tooltip-row">
    <span className="chart-tooltip-row-label">
      {swatchColor && <span className="chart-tooltip-swatch" style={{ background: swatchColor }} />}
      {label}
    </span>
    <span className={`chart-tooltip-value chart-tooltip-value--${tone}`.trim()}>{value}</span>
  </div>
)
