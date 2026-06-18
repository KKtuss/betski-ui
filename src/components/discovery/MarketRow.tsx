import { motion } from 'framer-motion'
import type { Batch } from '../../types/discovery'
import { capitalizeFirst, formatHoldDuration } from '../../utils/discoveryFormat'
import { formatCompactUsd } from '../../utils/formatCompact'
import { BatchPreviewCards } from './BatchPreviewCards'
import { DiscoverySparkline } from './DiscoverySparkline'
import { FriendBuysChip } from './FriendBuysChip'
import { TradeActions, type OnExecuteTrade } from './TradeActions'

const ROW_ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } }
}

/** -------------------------------------------------------------------------
 * Market (Batch) row — extracted so it can be reused both in the dedicated
 * Markets table and interleaved with Wagers in the "Both" view.
 * --------------------------------------------------------------------- */
const MarketRow = ({
  batch,
  quickBuyUsd,
  onOpenMarket,
  onExecuteTrade,
  onViewProfile
}: {
  batch: Batch
  quickBuyUsd: number
  onOpenMarket?: (marketId: string) => void
  onExecuteTrade?: OnExecuteTrade
  onViewProfile?: (handle: string) => void
}) => (
  <motion.div
    className="discovery-row discovery-row--grid discovery-row--clickable"
    variants={ROW_ITEM_VARIANTS}
    role="row"
    tabIndex={0}
    onClick={() => onOpenMarket?.(batch.id)}
    onKeyDown={(e) => {
      if (e.key === 'Enter') onOpenMarket?.(batch.id)
    }}
  >
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
            {Math.max(7, 6 + Math.floor(batch.volume / 2500))} related markets
          </span>
        </div>
        <FriendBuysChip buys={batch.friendBuys} onViewProfile={onViewProfile} />
      </div>
    </div>

    <div className="discovery-td discovery-td--spark" role="cell">
      <DiscoverySparkline data={batch.chart} />
    </div>

    <div className="discovery-td discovery-td--price" role="cell">
      <div className="discovery-price-block">
        <motion.div
          key={`price-${batch.id}-${batch.yesOdds.toFixed(1)}`}
          className="discovery-price-main"
          initial={{ opacity: 0.55, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {batch.yesOdds.toFixed(1)}¢
        </motion.div>
        <motion.div
          key={`pc-${batch.id}-${batch.priceChange.toFixed(1)}`}
          className={`discovery-price-change ${batch.priceChange >= 0 ? 'positive' : 'negative'}`}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          {batch.priceChange >= 0 ? '+' : ''}{batch.priceChange.toFixed(1)}¢
        </motion.div>
        <div className="discovery-price-line">
          <motion.div
            className="discovery-price-fill"
            animate={{ width: `${batch.yesOdds}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
    </div>

    <div className="discovery-td discovery-td--vol" role="cell">
      <motion.div
        key={`vol-${batch.id}-${batch.volume24h}`}
        className="discovery-td-main"
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {formatCompactUsd(batch.volume24h)}
      </motion.div>
      <div className="discovery-td-sub">{formatCompactUsd(batch.volume)} total</div>
    </div>

    <div className="discovery-td discovery-td--holders" role="cell">
      <motion.div
        key={`hol-${batch.id}-${batch.holders}`}
        className="discovery-td-main"
        initial={{ opacity: 0.6, y: -2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {batch.holders.toLocaleString()}
      </motion.div>
      <div className="discovery-td-sub">holders</div>
    </div>

    <div className="discovery-td discovery-td--top10" role="cell">
      <div className="discovery-td-main">{batch.top10WinRate}%</div>
      <div className="discovery-td-sub">win rate</div>
    </div>

    <div className="discovery-td discovery-td--hold" role="cell">
      <div className="discovery-td-main">{formatHoldDuration(batch.avgHoldMinutes)}</div>
      <div className="discovery-td-sub">avg hold</div>
    </div>

    <div className="discovery-td discovery-td--expires" role="cell">
      <div className="discovery-td-main">{batch.resolutionDateLabel}</div>
      <div className="discovery-td-sub">5:00 AM</div>
    </div>

    <div className="discovery-td discovery-td--action" role="cell" onClick={(e) => e.stopPropagation()}>
      <TradeActions
        yesPrice={batch.yesOdds}
        noPrice={batch.noOdds}
        amountUsd={quickBuyUsd}
        marketId={batch.id}
        marketName={batch.name}
        onExecuteTrade={onExecuteTrade}
      />
    </div>
  </motion.div>
)

export default MarketRow
