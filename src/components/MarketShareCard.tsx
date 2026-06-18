import { useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import './MarketShareCard.css'

type ChartPoint = { value: number; timestamp: number }

interface MarketShareCardProps {
  thumbnailVideoUrl?: string
  thumbnailFallbackSrc?: string
  title: string
  yesOdds: number
  chart: ChartPoint[]
  timeLeftLabel: string
  onViewMarket: () => void
}

const MarketShareCard = ({ thumbnailVideoUrl, thumbnailFallbackSrc, title, yesOdds, chart, timeLeftLabel, onViewMarket }: MarketShareCardProps) => {
  const [thumbnailFailed, setThumbnailFailed] = useState(false)
  const { linePath, deltaLabel } = useMemo(() => {
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

    const first = values[0]
    const last = values[values.length - 1]
    const delta = (first == null || last == null) ? null : (last - first)
    const deltaText = delta == null ? '—' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`
    return { linePath: path, deltaLabel: deltaText }
  }, [chart])

  const oddsLabel = `${Math.round(yesOdds)}%`

  return (
    <div className="market-share-card">
      <div className="market-share-body">
        <div className="market-share-icon">
          {thumbnailVideoUrl && !thumbnailFailed ? (
            <video
              className="market-share-thumb"
              src={thumbnailVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              onError={() => setThumbnailFailed(true)}
            />
          ) : thumbnailFallbackSrc ? (
            <img className="market-share-thumb" src={thumbnailFallbackSrc} alt="" />
          ) : (
            <TrendingUp size={16} />
          )}
        </div>

        <div className="market-share-right">
          <div className="market-share-head">
            <div className="market-share-title">{title.replace(/#[A-Za-z0-9_]+/g, '').replace(/\s{2,}/g, ' ').trim()}</div>
            <div className="market-share-odds">
              <span className="market-share-odds-label">YES</span>
              <span className="market-share-odds-value">{oddsLabel}</span>
            </div>
          </div>

          <div className="market-share-chart">
            <svg width="100%" height="100%" viewBox="0 0 220 44" preserveAspectRatio="none">
              <defs>
                <linearGradient id="mscGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2DD56E" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#2DD56E" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`M 0,44 L 0,30 L 220,30 L 220,44 Z`} fill="rgba(255,255,255,0.03)" />
              {linePath && (
                <>
                  <path d={`${linePath} L 220,44 L 0,44 Z`} fill="url(#mscGradient)" />
                  <path d={linePath} fill="none" stroke="#2DD56E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </>
              )}
            </svg>
          </div>

          <div className="market-share-sub">
            <div className="market-share-time">TIME LEFT: {timeLeftLabel}</div>
            <div className="market-share-range">24H: {deltaLabel}</div>
          </div>
        </div>
      </div>

      <button type="button" className="market-share-cta" onClick={onViewMarket}>
        VIEW MARKET
      </button>
    </div>
  )
}

export default MarketShareCard
