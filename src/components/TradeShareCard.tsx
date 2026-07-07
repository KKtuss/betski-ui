import { useMemo } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { DiscoverySparkline } from './discovery/DiscoverySparkline'
import { resolveTradeShareVisuals } from '../utils/resolveMarketShareData'
import { getDisplayThumbnailUrl } from '../utils/thumbnailProxy'
import type { DataPoint } from '../types/chart'
import './TradeShareCard.css'
import './discovery/DiscoverySparkline.css'

interface TradeShareCardProps {
  title: string
  side: 'YES' | 'NO'
  entry: number
  exit: number
  pnlUsd: number
  pnlPct: number
  chart: DataPoint[]
  marketId?: string
  thumbnailUrls?: string[]
  thumbnailSrc?: string
  thumbnailFallbackSrc?: string
}

const formatPrice = (value: number) => `${value.toFixed(1)}¢`

const formatPnlUsd = (pnlUsd: number) => {
  const abs = Math.abs(pnlUsd)
  const sign = pnlUsd >= 0 ? '+' : '-'
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}K`
  return `${sign}$${abs.toFixed(0)}`
}

const formatPnlPct = (pnlPct: number) => `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`

const TradeShareCard = ({
  title,
  side,
  entry,
  exit,
  pnlUsd,
  pnlPct,
  chart,
  marketId,
  thumbnailUrls,
  thumbnailSrc,
  thumbnailFallbackSrc
}: TradeShareCardProps) => {
  const isWin = pnlUsd >= 0
  const sideKey = side === 'YES' ? 'yes' : 'no'
  const cleanTitle = title.replace(/#[A-Za-z0-9_]+/g, '').replace(/\s{2,}/g, ' ').trim()

  const displayThumbs = useMemo(() => {
    const live = resolveTradeShareVisuals({ marketId, title })
    const rawUrls =
      live?.thumbnailUrls.filter(Boolean) ??
      thumbnailUrls?.filter(Boolean) ??
      (thumbnailSrc ? [thumbnailSrc] : [])

    const fallback =
      live?.thumbnailFallbackSrc ?? thumbnailFallbackSrc ?? thumbnailSrc ?? '/Stems/betskuu.png'
    const picked = rawUrls.length > 0 ? rawUrls.slice(0, 3) : [fallback]
    while (picked.length < 3) {
      picked.push(picked[picked.length - 1] ?? fallback)
    }

    return picked.map((url) => getDisplayThumbnailUrl(url))
  }, [marketId, title, thumbnailUrls, thumbnailSrc, thumbnailFallbackSrc])

  const sparkData = chart

  const priceMove = exit - entry
  const moveLabel = `${priceMove >= 0 ? '+' : ''}${priceMove.toFixed(1)}¢`

  return (
    <div className={`trade-share-card trade-share-card--${isWin ? 'win' : 'loss'}`}>
      <div className="trade-share-head">
        {isWin ? (
          <TrendingUp size={14} className="trade-share-head-icon" aria-hidden="true" />
        ) : (
          <TrendingDown size={14} className="trade-share-head-icon" aria-hidden="true" />
        )}
        <div className="trade-share-title">{cleanTitle}</div>
        <span className={`trade-share-side-badge trade-share-side-badge--${sideKey}`}>{side}</span>
      </div>

      <div className="trade-share-main">
        <div className="trade-share-thumbs" aria-hidden="true">
          {displayThumbs.map((src, index) => (
            <img
              key={`${src}-${index}`}
              className={`trade-share-thumb-item trade-share-thumb-item--${index + 1}`}
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = '/Stems/betskuu.png'
              }}
            />
          ))}
        </div>

        <div className="trade-share-content">
          <div className="share-chart-band share-chart-band--with-stats trade-share-chart-band">
            <div className="trade-share-edge trade-share-edge--entry">
              <span className="trade-share-edge-label">Entry</span>
              <strong className="trade-share-edge-price">{formatPrice(entry)}</strong>
            </div>

            <div className="share-chart-band__chart trade-share-chart" aria-hidden="true">
              <DiscoverySparkline data={sparkData} />
            </div>

            <div className="trade-share-edge trade-share-edge--exit">
              <span className="trade-share-edge-label">Exit</span>
              <strong className="trade-share-edge-price">{formatPrice(exit)}</strong>
            </div>

            <div className="trade-share-stats">
              <div className="trade-share-stat">
                <span className="trade-share-stat-label">PNL</span>
                <span className={`trade-share-stat-value trade-share-stat-value--${isWin ? 'pos' : 'neg'}`}>
                  {formatPnlUsd(pnlUsd)}
                </span>
              </div>
              <div className="trade-share-stat">
                <span className="trade-share-stat-label">Return</span>
                <span className={`trade-share-stat-value trade-share-stat-value--${isWin ? 'pos' : 'neg'}`}>
                  {formatPnlPct(pnlPct)}
                </span>
              </div>
              <div className="trade-share-stat">
                <span className="trade-share-stat-label">Move</span>
                <span
                  className={`trade-share-stat-value trade-share-stat-value--${
                    priceMove >= 0 ? 'pos' : 'neg'
                  }`}
                >
                  {moveLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TradeShareCard
