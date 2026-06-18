const sparklineToSvg = (series: number[], w: number, h: number, padX = 3, padY = 3) => {
  const min = Math.min(...series)
  const max = Math.max(...series)
  const r = max - min || 1
  const pts = series.map((v, i) => ({
    x: padX + (i / Math.max(1, series.length - 1)) * (w - padX * 2),
    y: padY + (1 - (v - min) / r) * (h - padY * 2)
  }))
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x} ${pts[i].y}`
  return { d, pts }
}

interface SparklineProps {
  series: number[]
  buyIdx: number
  sellIdx: number
  width: number
  height: number
  padX: number
  padY: number
  isPositive: boolean
  gradientId: string
}

export const Sparkline = ({ series, buyIdx, sellIdx, width, height, padX, padY, isPositive, gradientId }: SparklineProps) => {
  const { d, pts } = sparklineToSvg(series, width, height, padX, padY)
  const color = isPositive ? '#2DD56E' : '#FF4D4D'
  const areaPath = d ? `${d} L ${width - padX},${height} L ${padX},${height} Z` : ''
  const bx = pts[buyIdx]?.x ?? 0
  const by = pts[buyIdx]?.y ?? 0
  const sx = pts[sellIdx]?.x ?? 0
  const sy = pts[sellIdx]?.y ?? 0

  return (
    <svg
      className="profile-highlight-chart-svg"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
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
      {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={bx} cy={by} r="3.5" fill={isPositive ? '#2DD56E' : 'rgba(255,255,255,0.7)'} stroke="none" />
      <text
        className="profile-highlight-marker-label"
        x={bx - 5}
        y={by + 3.5}
        textAnchor="end"
      >
        B
      </text>
      <circle cx={sx} cy={sy} r="3.5" fill={isPositive ? 'rgba(255,255,255,0.7)' : '#FF4D4D'} stroke="none" />
      <text
        className="profile-highlight-marker-label"
        x={sx + 5}
        y={sy + 3.5}
        textAnchor="start"
      >
        S
      </text>
    </svg>
  )
}
