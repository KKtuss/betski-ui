import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import { DiscoverySparkline } from './discovery/DiscoverySparkline'
import { formatCompactNumber, formatCompactUsd } from '../utils/formatCompact'
import { getDisplayThumbnailUrl } from '../utils/thumbnailProxy'
import type { DataPoint } from '../types/chart'
import './MarketShareCard.css'
import './discovery/DiscoverySparkline.css'

interface MarketShareCardProps {
  thumbnailVideoUrl?: string
  thumbnailFallbackSrc?: string
  thumbnailUrls?: string[]
  title: string
  yesOdds: number
  chart: DataPoint[]
  priceChange?: number
  volume24h?: number
  holders?: number
  winRate?: number
  onViewMarket: () => void
}

const formatOddsDelta = (delta: number) => `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}¢`

const MarketShareCard = ({
  thumbnailFallbackSrc,
  thumbnailUrls,
  title,
  yesOdds,
  chart,
  priceChange = 0,
  volume24h = 32800,
  holders = 4693,
  winRate = 76,
  onViewMarket
}: MarketShareCardProps) => {
  const noOdds = Math.round((100 - yesOdds) * 100) / 100
  const yesDelta = formatOddsDelta(priceChange)
  const noDelta = formatOddsDelta(-priceChange)

  const cleanTitle = title.replace(/#[A-Za-z0-9_]+/g, '').replace(/\s{2,}/g, ' ').trim()

  const displayThumbs = useMemo(() => {
    const urls =
      thumbnailUrls?.filter(Boolean) ??
      (thumbnailFallbackSrc ? [thumbnailFallbackSrc] : ['/Stems/betskuu.png'])
    const picked = urls.slice(0, 3)
    while (picked.length < 3) {
      picked.push(picked[picked.length - 1] ?? '/Stems/betskuu.png')
    }
    return picked.map((url) => getDisplayThumbnailUrl(url))
  }, [thumbnailUrls, thumbnailFallbackSrc])

  return (
    <div className="market-share-card">
      <div className="market-share-head">
        <BarChart3 size={14} className="market-share-head-icon" aria-hidden="true" />
        <div className="market-share-title">{cleanTitle}</div>
      </div>

      <div className="market-share-main">
        <div className="market-share-thumbs" aria-hidden="true">
          {displayThumbs.map((src, index) => (
            <img
              key={`${src}-${index}`}
              className={`market-share-thumb-item market-share-thumb-item--${index + 1}`}
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

        <div className="market-share-content">
          <div className="market-share-chart-band">
            <div className="market-share-side market-share-side--yes">
              <span className="market-share-side-label">YES</span>
              <strong className="market-share-side-price">{yesOdds.toFixed(1)}¢</strong>
              <em className="market-share-side-delta">{yesDelta}</em>
            </div>

            <div className="market-share-chart" aria-hidden="true">
              <DiscoverySparkline data={chart} />
            </div>

            <div className="market-share-side market-share-side--no">
              <span className="market-share-side-label">NO</span>
              <strong className="market-share-side-price">{noOdds.toFixed(1)}¢</strong>
              <em className="market-share-side-delta">{noDelta}</em>
            </div>

            <div className="market-share-stats">
              <div className="market-share-stat">
                <span className="market-share-stat-label">Vol</span>
                <span className="market-share-stat-value">{formatCompactUsd(volume24h)}</span>
              </div>
              <div className="market-share-stat">
                <span className="market-share-stat-label">Traders</span>
                <span className="market-share-stat-value">{formatCompactNumber(holders)}</span>
              </div>
              <div className="market-share-stat">
                <span className="market-share-stat-label">Win rate</span>
                <span className="market-share-stat-value">{winRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button type="button" className="market-share-cta" onClick={onViewMarket}>
        View Market
      </button>
    </div>
  )
}

export default MarketShareCard
