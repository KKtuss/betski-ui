import { useMemo } from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import './TradeShareCard.css'

type ChartPoint = { value: number; timestamp: number }

interface TradeShareCardProps {
  title: string
  side: 'YES' | 'NO'
  entry: number
  exit: number
  pnlUsd: number
  pnlPct: number
  chart: ChartPoint[]
  thumbnailSrc?: string
  thumbnailFallbackSrc?: string
}

const TradeShareCard = ({ title, side, entry, exit, pnlUsd, pnlPct, chart, thumbnailSrc, thumbnailFallbackSrc }: TradeShareCardProps) => {
  const isPositive = pnlUsd >= 0
  const color = isPositive ? '#2DD56E' : '#FF4D4D'

  const { linePath, areaPath } = useMemo(() => {
    const width = 220
    const height = 44
    const padding = 4
    const values = chart.map(p => p.value)
    const localMin = Math.min(...values, 0)
    const localMax = Math.max(...values, 100)
    const range = Math.max(1, localMax - localMin)

    const points = chart.map((p, i) => {
      const x = padding + (i / Math.max(1, chart.length - 1)) * (width - padding * 2)
      const y = padding + (height - padding * 2) - ((p.value - localMin) / range) * (height - padding * 2)
      return { x, y }
    })

    const path = points.length === 0
      ? ''
      : points.reduce((acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`), '')

    const area = path ? `${path} L ${width},${height} L 0,${height} Z` : ''
    return { linePath: path, areaPath: area }
  }, [chart])

  const pnlUsdAbs = Math.abs(pnlUsd)
  const pnlUsdLabel = `${pnlUsd >= 0 ? '+' : '-'}$${pnlUsdAbs.toFixed(0)}`
  const pnlPctLabel = `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`

  return (
    <div className="trade-share-card">
      <div className="trade-share-body">
        <div className="trade-share-icon">
          {thumbnailSrc ? (
            <img className="trade-share-thumb" src={thumbnailSrc} alt="" />
          ) : thumbnailFallbackSrc ? (
            <img className="trade-share-thumb" src={thumbnailFallbackSrc} alt="" />
          ) : (
            <div className="trade-share-thumb trade-share-thumb--empty" />
          )}
        </div>

        <div className="trade-share-right">
          <div className="trade-share-head">
            <div className="trade-share-title">{title}</div>
            <div className={`trade-share-side ${side === 'YES' ? 'yes' : 'no'}`}>{side}</div>
          </div>

          <div className="trade-share-metrics">
            <div className="trade-share-pnl" style={{ color }}>
              {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span className="trade-share-pnl-usd">{pnlUsdLabel}</span>
              <span className="trade-share-pnl-pct">{pnlPctLabel}</span>
            </div>
            <div className="trade-share-entryexit">
              <span className="k">Entry</span>
              <span className="v">{entry.toFixed(3)}</span>
              <span className="arrow">→</span>
              <span className="k">Exit</span>
              <span className="v">{exit.toFixed(3)}</span>
            </div>
          </div>

          <div className="trade-share-chart">
            <svg width="100%" height="100%" viewBox="0 0 220 44" preserveAspectRatio="none">
              <defs>
                <linearGradient id="tscGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.18" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`M 0,44 L 0,30 L 220,30 L 220,44 Z`} fill="rgba(255,255,255,0.03)" />
              {linePath && (
                <>
                  <path d={areaPath} fill="url(#tscGradient)" />
                  <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </>
              )}
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TradeShareCard

