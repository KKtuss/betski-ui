/** Semantic chart tokens — CSS vars in chartTheme.css are source of truth for styling. */
export const chartTheme = {
  profit: 'var(--chart-profit, #2DD56E)',
  loss: 'var(--chart-loss, #FF4D4D)',
  neutral: 'var(--chart-neutral, rgba(255,255,255,0.55))',
  grid: 'var(--chart-grid, rgba(255,255,255,0.06))',
  axis: 'var(--chart-axis, #8a8a8a)',
  crosshair: 'var(--chart-crosshair, rgba(255,255,255,0.22))',
  surface: 'var(--chart-surface, #080809)',
  tooltipBg: 'var(--chart-tooltip-bg, rgba(14,14,16,0.96))',
  tooltipBorder: 'var(--chart-tooltip-border, rgba(255,255,255,0.10))',
  series: {
    trading: 'rgba(255, 106, 0, 0.7)',
    lp: 'rgba(255, 94, 98, 0.65)',
    marketCreating: 'rgba(255, 255, 255, 0.35)',
    brand: 'var(--color-orange, #ff9966)'
  },
  padding: {
    left: 8,
    right: 44,
    top: 18,
    bottom: 30
  },
  sparkline: {
    maxPoints: 80,
    strokeWidth: 2,
    areaOpacity: 0.12
  }
} as const

export const trendColor = (isPositive: boolean) =>
  isPositive ? chartTheme.profit : chartTheme.loss

export const trendFromValues = (first: number, last: number) =>
  trendColor(last - first >= 0)
