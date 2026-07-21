import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { OpenBet, Wager } from '../../types/discovery'
import { capitalizeFirst } from '../../utils/discoveryFormat'
import { formatCompactUsd } from '../../utils/formatCompact'
import { useHomeMobileLayout } from '../../hooks/useHomeMobileLayout'
import LiquidityStrip, {
  LiquidityFillChoicePanel,
  oddsToStripPercent,
  type LiquidityFillChoiceState
} from '../LiquidityStrip'
import { BatchPreviewCards } from './BatchPreviewCards'
import { FriendBuysChip } from './FriendBuysChip'
import { TradeActions, type OnExecuteTrade } from './TradeActions'
import { clamp } from '../../utils/math'

/** Keep a centered hint label inside the track when the thumb is near an edge. */
const clampHintLeftPct = (oddsPct: number, trackW: number, hintW: number) => {
  if (trackW <= 0 || hintW <= 0) return oddsPct
  const padPct = Math.min(49, ((hintW / 2) / trackW) * 100)
  return clamp(oddsPct, padPct, 100 - padPct)
}

/** -------------------------------------------------------------------------
 * Wager row — uses LiquidityStrip for odds selection.
 * --------------------------------------------------------------------- */
const WagerRow = ({
  wager,
  quickBuyUsd,
  onOpenMarket,
  onExecuteTrade,
  onViewProfile
}: {
  wager: Wager
  quickBuyUsd: number
  onOpenMarket?: (marketId: string) => void
  onExecuteTrade?: OnExecuteTrade
  onViewProfile?: (handle: string) => void
}) => {
  const isMobile = useHomeMobileLayout()
  // Default selected odds = the odds with the highest volume
  const initialOdds = useMemo(() => {
    if (wager.openBets.length === 0) return 50
    return wager.openBets.reduce((best, b) => b.volume > best.volume ? b : best, wager.openBets[0]).yesOdds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wager.id])
  const [selectedOdds, setSelectedOdds] = useState(initialOdds)
  const [fillTarget, setFillTarget] = useState<OpenBet | undefined>(undefined)
  const [hoverOdds, setHoverOdds] = useState<number | null>(null)
  const [fillChoice, setFillChoice] = useState<LiquidityFillChoiceState | null>(null)

  const handleOddsSelect = (odds: number, fill?: OpenBet) => {
    setSelectedOdds(odds)
    setFillTarget(fill)
  }

  const handleFillChoiceChange = useCallback((state: LiquidityFillChoiceState | null) => {
    setFillChoice(state)
  }, [])

  const isPreview = hoverOdds !== null
  const hintOdds = hoverOdds ?? (fillTarget?.yesOdds ?? selectedOdds)
  const hintTrackRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const [hintLeftPct, setHintLeftPct] = useState(() => oddsToStripPercent(hintOdds))
  const showFillInFooter = isMobile && fillChoice !== null

  useLayoutEffect(() => {
    const track = hintTrackRef.current
    const hint = hintRef.current
    if (!track || !hint) return

    const sync = () => {
      const trackW = track.clientWidth
      const hintW = hint.offsetWidth
      setHintLeftPct(clampHintLeftPct(oddsToStripPercent(hintOdds), trackW, hintW))
    }

    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(track)
    ro.observe(hint)
    return () => ro.disconnect()
  }, [hintOdds, fillTarget, isPreview, wager.id])

  const fillPct = clamp((wager.pool / wager.promotionThreshold) * 100, 0, 100)
  const closeToPromo = fillPct >= 80

  return (
    <motion.div
      layout="position"
      className={`discovery-row discovery-row--wager discovery-row--clickable${showFillInFooter ? ' is-fill-choice-open' : ''}`}
      role="row"
      tabIndex={0}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      onClick={() => onOpenMarket?.(wager.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpenMarket?.(wager.id)
      }}
    >
      <div className="discovery-td discovery-td--market" role="cell">
        <BatchPreviewCards items={wager.previews} />
        <div className="discovery-info">
          <div className="discovery-title-row discovery-title-row--wager">
            <div
              className="discovery-batch-name"
              title={`Promotes to Market at ${formatCompactUsd(wager.promotionThreshold)} volume`}
            >
              {capitalizeFirst(wager.name)}
            </div>
          </div>
          <div className="discovery-subtext">
            <span className="discovery-related">by @{wager.creatorHandle}</span>
            <span className="discovery-dot discovery-wager-time-inline" aria-hidden>
              •
            </span>
            <span className="discovery-wager-time-inline">
              {wager.timeLeftLabel} left
            </span>
          </div>
          <FriendBuysChip buys={wager.friendBuys} onViewProfile={onViewProfile} />
        </div>
      </div>

      <div className="discovery-td discovery-td--wager-heatmap" role="cell" onClick={(e) => e.stopPropagation()}>
        <LiquidityStrip
          wager={wager}
          selectedOdds={selectedOdds}
          onSelect={handleOddsSelect}
          onHoverChange={setHoverOdds}
          externalFillChoice={isMobile}
          onFillChoiceChange={handleFillChoiceChange}
        />
        {!showFillInFooter && (
          <div className="discovery-heatmap-hint-track" ref={hintTrackRef}>
            <motion.div
              ref={hintRef}
              className={`discovery-heatmap-hint ${isPreview ? 'is-preview' : ''}`}
              initial={false}
              animate={{ left: `${hintLeftPct}%` }}
              transition={{
                duration: isPreview ? 0.06 : 0.28,
                ease: [0.22, 1, 0.36, 1]
              }}
            >
              {!isPreview && fillTarget ? (
                <>
                  Filling bet at <span className="discovery-heatmap-hint-strong">{fillTarget.yesOdds}¢ YES</span>
                  <span className="discovery-heatmap-hint-sep">·</span>
                  <span className="discovery-heatmap-hint-strong">{100 - fillTarget.yesOdds}¢ NO</span>
                  <span className="discovery-heatmap-hint-fill">({formatCompactUsd(fillTarget.volume)} in pool)</span>
                </>
              ) : (
                <>
                  New bet at <span className="discovery-heatmap-hint-strong">{hintOdds}¢ YES</span>
                  <span className="discovery-heatmap-hint-sep">·</span>
                  <span className="discovery-heatmap-hint-strong">{100 - hintOdds}¢ NO</span>
                </>
              )}
            </motion.div>
          </div>
        )}
      </div>

      {showFillInFooter && fillChoice ? (
        <div
          className="discovery-td discovery-td--wager-fill-choice"
          role="cell"
          onClick={(e) => e.stopPropagation()}
        >
          <LiquidityFillChoicePanel
            odds={fillChoice.odds}
            nearbyBets={fillChoice.nearbyBets}
            selectFill={fillChoice.selectFill}
            selectCreate={fillChoice.selectCreate}
            variant="footer"
          />
        </div>
      ) : (
        <>
          <div className="discovery-td discovery-td--wager-pool" role="cell">
            <div className="discovery-pool-block">
              <div className="discovery-pool-row">
                <motion.span
                  key={`pool-${wager.id}-${wager.pool}`}
                  className="discovery-pool-main"
                  initial={{ opacity: 0.55, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {formatCompactUsd(wager.pool)}
                </motion.span>
                <span className="discovery-pool-sep">/</span>
                <span className="discovery-pool-goal">{formatCompactUsd(wager.promotionThreshold)}</span>
              </div>
              <div className="discovery-pool-bar">
                <motion.div
                  className={`discovery-pool-fill ${closeToPromo ? 'is-close' : ''}`}
                  animate={{ width: `${fillPct}%` }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="discovery-pool-hint">
                {closeToPromo ? 'Almost a market' : `${Math.round(fillPct)}% to market`}
              </div>
            </div>
          </div>

          <div className="discovery-td discovery-td--wager-expires" role="cell">
            <div className="discovery-td-main">{wager.timeLeftLabel}</div>
            <div className="discovery-td-sub">left</div>
          </div>

          <div className="discovery-td discovery-td--action" role="cell" onClick={(e) => e.stopPropagation()}>
            <TradeActions
              yesPrice={selectedOdds}
              noPrice={100 - selectedOdds}
              amountUsd={quickBuyUsd}
              marketId={wager.id}
              marketName={wager.name}
              thumbnailUrls={wager.previews.map((p) => p.thumbnailUrl).filter(Boolean)}
              onExecuteTrade={onExecuteTrade}
            />
          </div>
        </>
      )}
    </motion.div>
  )
}

export default WagerRow
