import { useState } from 'react'
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
  title: string
  yesOdds: number
  chart: DataPoint[]
  priceChange?: number
  volume24h?: number
  holders?: number
  winRate?: number
  onViewMarket: () => void
}

const isPlayableVideoUrl = (url?: string) =>
  Boolean(url && (/\.mp4(\?|$)/i.test(url) || url.includes('/api/video-proxy') || url.startsWith('/cache/')))

const formatOddsDelta = (delta: number) => `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}¢`

const MarketShareCard = ({
  thumbnailVideoUrl,
  thumbnailFallbackSrc,
  title,
  yesOdds,
  chart,
  priceChange = 0,
  volume24h = 32800,
  holders = 4693,
  winRate = 76,
  onViewMarket
}: MarketShareCardProps) => {
  const [thumbSrc, setThumbSrc] = useState(() =>
    getDisplayThumbnailUrl(thumbnailFallbackSrc ?? '/Stems/betskuu.png')
  )
  const [useVideo, setUseVideo] = useState(() => isPlayableVideoUrl(thumbnailVideoUrl))

  const noOdds = Math.round((100 - yesOdds) * 100) / 100
  const yesDelta = formatOddsDelta(priceChange)
  const noDelta = formatOddsDelta(-priceChange)

  const cleanTitle = title.replace(/#[A-Za-z0-9_]+/g, '').replace(/\s{2,}/g, ' ').trim()

  const handleThumbError = () => {
    setThumbSrc('/Stems/betskuu.png')
    setUseVideo(false)
  }

  return (
    <div className="market-share-card">
      <div className="market-share-head">
        <BarChart3 size={14} className="market-share-head-icon" aria-hidden="true" />
        <div className="market-share-title">{cleanTitle}</div>
      </div>

      <div className="market-share-main">
        <div className="market-share-thumb-wrap">
          {useVideo && thumbnailVideoUrl ? (
            <video
              className="market-share-thumb"
              src={thumbnailVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              onError={() => setUseVideo(false)}
            />
          ) : (
            <img
              className="market-share-thumb"
              src={thumbSrc}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={handleThumbError}
            />
          )}
        </div>

        <div className="market-share-trade-row">
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
        </div>
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

      <button type="button" className="market-share-cta" onClick={onViewMarket}>
        View Market
      </button>
    </div>
  )
}

export default MarketShareCard
