import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { OpenBet, Wager, WagerFill } from '../types/discovery'
import LiquidityStrip from './LiquidityStrip'
import { formatCompactUsd } from '../utils/formatCompact'
import { consensusYesFromOpenBets, getSelectedLineFills } from '../utils/wagerFills'
import './WagerHeatmapPanel.css'
import './Panel.css'

const QUICK_FILL_AMOUNTS = [25, 50, 100, 250]

type WagerHeatmapPanelProps = {
  wager: Wager
  selectedOdds: number
  fillTarget?: OpenBet
  fills: WagerFill[]
  onSelectOdds: (odds: number, fillTarget?: OpenBet) => void
  onFillSide?: (side: 'YES' | 'NO') => void
}

const WagerHeatmapPanel = ({
  wager,
  selectedOdds,
  fillTarget,
  fills,
  onSelectOdds,
  onFillSide
}: WagerHeatmapPanelProps) => {
  const interactiveRef = useRef<HTMLDivElement>(null)
  const [stripHoverOdds, setStripHoverOdds] = useState<number | null>(null)
  const [displayHoverOdds, setDisplayHoverOdds] = useState<number | null>(null)
  const [quickAmount, setQuickAmount] = useState(50)
  const fillPct = Math.min(100, (wager.pool / Math.max(1, wager.promotionThreshold)) * 100)
  const consensus = consensusYesFromOpenBets(wager.openBets)
  const closeToPromo = fillPct >= 80

  useEffect(() => {
    setDisplayHoverOdds(null)
  }, [wager.id])

  useEffect(() => {
    if (stripHoverOdds !== null) setDisplayHoverOdds(stripHoverOdds)
  }, [stripHoverOdds])

  const activeLineOdds = displayHoverOdds ?? selectedOdds
  const isHovering = displayHoverOdds !== null

  const handleSelectOdds = (odds: number, target?: OpenBet) => {
    setDisplayHoverOdds(odds)
    onSelectOdds(odds, target)
  }

  const lineFills = useMemo(
    () => getSelectedLineFills(wager, fills, activeLineOdds),
    [wager, fills, activeLineOdds]
  )

  const yesAvailable = useMemo(
    () => lineFills.filter((fill) => fill.side === 'YES').reduce((sum, fill) => sum + fill.availableSize, 0),
    [lineFills]
  )

  const noAvailable = useMemo(
    () => lineFills.filter((fill) => fill.side === 'NO').reduce((sum, fill) => sum + fill.availableSize, 0),
    [lineFills]
  )

  const friendCountAtLine = useMemo(
    () => lineFills.filter((fill) => fill.counterpartyType === 'friend').length,
    [lineFills]
  )

  const lineVolume = useMemo(() => {
    const bet = wager.openBets.find((b) => b.yesOdds === activeLineOdds)
    return bet?.volume ?? 0
  }, [wager.openBets, activeLineOdds])

  const lineDepthMax = Math.max(yesAvailable, noAvailable, 1)
  const yesDepthPct = Math.min(100, (yesAvailable / lineDepthMax) * 100)
  const noDepthPct = Math.min(100, (noAvailable / lineDepthMax) * 100)

  const handleFillSide = (side: 'YES' | 'NO') => {
    const bet = wager.openBets.find((b) => b.yesOdds === activeLineOdds)
    onSelectOdds(activeLineOdds, bet)
    onFillSide?.(side)
  }

  return (
    <motion.div
      className="panel wager-heatmap-panel"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <div className="panel-header wager-heatmap-header">
        <span className="wager-heatmap-title">WAGER MATCHING</span>
        <span className="wager-heatmap-consensus">{consensus}¢ consensus</span>
      </div>
      <div className="panel-content wager-heatmap-content">
        <div className="wager-heatmap-pool-row">
          <div className="wager-heatmap-pool-text">
            <span className="wager-heatmap-pool-main">{formatCompactUsd(wager.pool)}</span>
            <span className="wager-heatmap-pool-sep">/</span>
            <span className="wager-heatmap-pool-goal">{formatCompactUsd(wager.promotionThreshold)}</span>
          </div>
          <span className={`wager-heatmap-pool-label${closeToPromo ? ' is-close' : ''}`}>
            {closeToPromo ? 'Almost a market' : `${Math.round(fillPct)}% matched`}
          </span>
        </div>
        <div className="wager-heatmap-pool-bar">
          <motion.div
            className={`wager-heatmap-pool-fill${closeToPromo ? ' is-close' : ''}`}
            animate={{ width: `${fillPct}%` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        <div
          className="wager-heatmap-interactive"
          ref={interactiveRef}
          onMouseLeave={() => setDisplayHoverOdds(null)}
        >
          <div className="wager-heatmap-strip-wrap">
            <LiquidityStrip
              wager={wager}
              selectedOdds={selectedOdds}
              onSelect={handleSelectOdds}
              onHoverChange={setStripHoverOdds}
              size="large"
            />
          </div>

          <div className="wager-heatmap-buyers">
            <motion.div
              key={`line-${activeLineOdds}`}
              className="wager-heatmap-buyers-inner"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="wager-heatmap-buyers-head">
                <div>
                  <span className="wager-heatmap-buyers-label">
                    {isHovering ? 'Opponents at this line' : 'Opponents at selected line'}
                  </span>
                  <span className="wager-heatmap-buyers-odds">
                    {activeLineOdds}¢ YES · {100 - activeLineOdds}¢ NO
                  </span>
                  {!isHovering && fillTarget && fillTarget.yesOdds === activeLineOdds && (
                    <span className="wager-heatmap-selection-fill">
                      Matching existing · {formatCompactUsd(fillTarget.volume)} at line
                    </span>
                  )}
                </div>
                {lineVolume > 0 && (
                  <span className="wager-heatmap-buyers-vol">{formatCompactUsd(lineVolume)} total</span>
                )}
              </div>
              <div className="wager-line-liquidity">
                <div className="wager-line-depth" aria-hidden="true">
                  <div className="wager-line-depth-side wager-line-depth-side--no">
                    <motion.span
                      animate={{ width: `${noDepthPct}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                  <div className="wager-line-depth-mid" />
                  <div className="wager-line-depth-side wager-line-depth-side--yes">
                    <motion.span
                      animate={{ width: `${yesDepthPct}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                </div>

                <div className="wager-line-amount-picker" aria-label="Quick fill amount">
                  <span>Amount</span>
                  <div>
                    {QUICK_FILL_AMOUNTS.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        className={quickAmount === amount ? 'active' : ''}
                        onClick={() => setQuickAmount(amount)}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="wager-line-quick">
                  <button type="button" className="wager-line-fill-btn wager-line-fill-btn--yes" onClick={() => handleFillSide('YES')}>
                    Fill any YES
                  </button>
                  <button type="button" className="wager-line-fill-btn wager-line-fill-btn--no" onClick={() => handleFillSide('NO')}>
                    Fill any NO
                  </button>
                </div>

                <div className="wager-line-note">
                  {lineFills.length === 0
                    ? 'No opponents at this line yet'
                    : `Partial coverage · ${friendCountAtLine} friends · ${lineFills.length} open opponents`}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default WagerHeatmapPanel
