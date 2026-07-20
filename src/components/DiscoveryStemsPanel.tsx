import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Flame, TrendingUp, Clock, Sparkles, Banknote } from 'lucide-react'
import type { Batch } from '../types/discovery'
import { buildMarketHistory } from '../utils/marketHistory'
import { TradeActions } from './discovery/TradeActions'
import { formatCompactUsd } from '../utils/formatCompact'
import { capitalizeFirst } from '../utils/discoveryFormat'
import { BatchPreviewCards } from './discovery/BatchPreviewCards'
import { DiscoverySparkline } from './discovery/DiscoverySparkline'
import './Panel.css'
import './DiscoveryPanel.css'
import './DiscoveryStemsPanel.css'

/**
 * Internal-only "stems capture" variant of the Discovery page. Visually identical
 * to the production DiscoveryPanel, but the rows are hardcoded so screenshots stay
 * stable for slide decks. Reached via `?stems=1` (see `App.tsx`).
 */

const buildStemsChart = (seed: number, targetOdds: number, resolutionTimestamp: number) => {
  const now = Date.now()
  return buildMarketHistory({
    seed,
    now,
    anchorValue: targetOdds,
    resolutionTimestamp,
    createdAtTimestamp: now - 30 * 24 * 60 * 60 * 1000
  })
}

const buildPreviews = (
  prefix: string,
  baseVolume: number,
  thumbnailUrls?: string[]
) => Array.from({ length: 5 }, (_, i) => ({
  id: `${prefix}-${i + 1}`,
  thumbnailUrl: thumbnailUrls?.[i] ?? `https://picsum.photos/seed/${prefix}-${i + 1}/360/640`,
  volume: Math.round(baseVolume * (0.6 + i * 0.18))
}))

const speedThumbnails = [
  '/Stems/Thumbnails/Speed/speed-5.jpg',
  '/Stems/Thumbnails/Speed/speed-4.jpg',
  '/Stems/Thumbnails/Speed/speed-3.jpg',
  '/Stems/Thumbnails/Speed/speed-2.jpg',
  '/Stems/Thumbnails/Speed/speed-1.jpg'
]

const clavicularThumbnails = [
  '/Stems/Thumbnails/Clav/clav-1.jpg',
  '/Stems/Thumbnails/Clav/clav-2.jpg',
  '/Stems/Thumbnails/Clav/clav-3.jpg',
  '/Stems/Thumbnails/Clav/clav-4.jpg',
  '/Stems/Thumbnails/Clav/clav-5.jpg'
]

const coachellaThumbnails = [
  '/Stems/Thumbnails/Coachella/coachella-1.jpg',
  '/Stems/Thumbnails/Coachella/coachella-2.jpg',
  '/Stems/Thumbnails/Coachella/coachella-3.jpg',
  '/Stems/Thumbnails/Coachella/coachella-4.jpg',
  '/Stems/Thumbnails/Coachella/coachella-5.jpg'
]

const stemsBatches: Batch[] = [
  {
    id: 'stems-speed',
    name: '"W Speed" trend reaches 100M total views before june ?',
    yesOdds: 67,
    noOdds: 33,
    resolutionTimestamp: new Date('2026-05-31T05:00:00').getTime(),
    resolutionDateLabel: 'May 31, 2026',
    timeLeftLabel: '25d',
    volume: 112400,
    volume24h: 24300,
    holders: 1840,
    top10WinRate: 64,
    avgHoldMinutes: 192,
    chart: buildStemsChart(11, 67, new Date('2026-05-31T05:00:00').getTime()),
    previews: buildPreviews('speed', 480, speedThumbnails),
    priceChange: 5.2,
    friendBuys: []
  },
  {
    id: 'stems-clavicular',
    name: 'Clavicular becoming top-1 creator of the week ?',
    yesOdds: 41,
    noOdds: 59,
    resolutionTimestamp: new Date('2026-05-10T05:00:00').getTime(),
    resolutionDateLabel: 'May 10, 2026',
    timeLeftLabel: '4d',
    volume: 36500,
    volume24h: 8400,
    holders: 920,
    top10WinRate: 52,
    avgHoldMinutes: 108,
    chart: buildStemsChart(22, 41, new Date('2026-05-10T05:00:00').getTime()),
    previews: buildPreviews('clavicular', 220, clavicularThumbnails),
    priceChange: -2.1,
    friendBuys: []
  },
  {
    id: 'stems-coachella',
    name: 'Coachella vids totalling 100m views this week ?',
    yesOdds: 92,
    noOdds: 8,
    resolutionTimestamp: new Date('2026-05-10T05:00:00').getTime(),
    resolutionDateLabel: 'May 10, 2026',
    timeLeftLabel: '4d',
    volume: 204700,
    volume24h: 58200,
    holders: 3210,
    top10WinRate: 71,
    avgHoldMinutes: 155,
    chart: buildStemsChart(33, 92, new Date('2026-05-10T05:00:00').getTime()),
    previews: buildPreviews('coachella', 820, coachellaThumbnails),
    priceChange: 57.0,
    friendBuys: []
  }
]

interface DiscoveryStemsPanelProps {
  onBack?: () => void
}

const DiscoveryStemsPanel = ({ onBack }: DiscoveryStemsPanelProps) => {
  const batches = useMemo(() => stemsBatches, [])
  const [activeTab, setActiveTab] = useState('trending')
  const [quickBuyUsd, setQuickBuyUsd] = useState(25)

  const tabs = [
    { id: 'trending', label: 'Trending', icon: Flame },
    { id: 'hot', label: 'Hot Movers', icon: TrendingUp },
    { id: 'expiring', label: 'Expiring Soon', icon: Clock },
    { id: 'new', label: 'New Markets', icon: Sparkles },
    { id: 'bonds', label: 'Bonds', icon: Banknote }
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut'
      }
    }
  }

  return (
    <motion.div
      className="panel discovery-panel discovery-panel--stems"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ scale: 1 }}
    >
      <div className="panel-header discovery-header">
        <div className="discovery-left">
          {onBack && (
            <button type="button" className="betski-back discovery-back" onClick={onBack} aria-label="Back">
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
          )}
          <div className="discovery-title discovery-title--gradient">DISCOVERY</div>
        </div>
        <div className="discovery-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`discovery-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <div className="discovery-tab-content">
                <tab.icon size={14} className="discovery-tab-icon" />
                <span>{tab.label}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="discovery-quickbuy">
          <div className="discovery-quickbuy-label">Quick buy</div>
          <div className="discovery-quickbuy-pills" role="group" aria-label="Quick buy amount">
            {[10, 25, 50, 100].map(v => (
              <button
                key={v}
                type="button"
                className={`discovery-quickbuy-pill ${quickBuyUsd === v ? 'active' : ''}`}
                onClick={() => setQuickBuyUsd(v)}
              >
                ${v}
              </button>
            ))}
            <input
              className="discovery-quickbuy-input"
              value={String(quickBuyUsd)}
              onChange={(e) => {
                const n = Math.max(1, Math.min(10_000, Number(e.target.value.replace(/[^\d]/g, '')) || 0))
                setQuickBuyUsd(n)
              }}
              inputMode="numeric"
              aria-label="Custom quick buy amount"
            />
          </div>
        </div>
      </div>

      <div className="panel-content discovery-content">
        <motion.div
          className="discovery-list"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <div className="discovery-table-head" role="row" aria-label="Discovery table header">
            <div className="discovery-th discovery-th--market" role="columnheader">Market</div>
            <div className="discovery-th discovery-th--spark" role="columnheader">Trend</div>
            <div className="discovery-th discovery-th--price" role="columnheader">Price</div>
            <div className="discovery-th discovery-th--vol" role="columnheader">Vol 24h</div>
            <div className="discovery-th discovery-th--action" role="columnheader">Action</div>
          </div>
          <div className="discovery-list-inner">
            {batches.map(batch => (
              <motion.div key={batch.id} className="discovery-row discovery-row--grid" variants={item} role="row">
                <div className="discovery-td discovery-td--market" role="cell">
                  <BatchPreviewCards items={batch.previews} />
                  <div className="discovery-info">
                    <div className="discovery-title-row">
                      <div className="discovery-batch-name">{capitalizeFirst(batch.name)}</div>
                    </div>
                    <div className="discovery-subtext">
                      <span className="discovery-time-left">{batch.timeLeftLabel}</span>
                      <span className="discovery-dot">•</span>
                      <span className="discovery-related">
                        {Math.min(10, Math.max(6, 5 + Math.floor(batch.volume / 30000)))} related markets
                      </span>
                    </div>
                  </div>
                </div>

                <div className="discovery-td discovery-td--spark" role="cell">
                  <DiscoverySparkline data={batch.chart} />
                </div>

                <div className="discovery-td discovery-td--price" role="cell">
                  <div className="discovery-price-block">
                    <div className="discovery-price-main">{batch.yesOdds.toFixed(1)}¢</div>
                    <div className={`discovery-price-change ${batch.priceChange >= 0 ? 'positive' : 'negative'}`}>
                      {batch.priceChange >= 0 ? '+' : ''}{batch.priceChange.toFixed(1)}¢
                    </div>
                    <div className="discovery-price-line">
                      <div className="discovery-price-fill" style={{ width: `${batch.yesOdds}%` }} />
                    </div>
                  </div>
                </div>

                <div className="discovery-td discovery-td--vol" role="cell">
                  <div className="discovery-td-main">{formatCompactUsd(batch.volume24h)}</div>
                  <div className="discovery-td-sub">{formatCompactUsd(batch.volume)} total</div>
                </div>

                <div className="discovery-td discovery-td--action" role="cell">
                  <TradeActions
                    yesPrice={batch.yesOdds}
                    noPrice={batch.noOdds}
                    amountUsd={quickBuyUsd}
                    thumbnailUrls={batch.previews.map((p) => p.thumbnailUrl).filter(Boolean)}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default DiscoveryStemsPanel
