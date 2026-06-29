import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { OpenBet, Wager } from '../types/discovery'
import { useHomeMobileLayout } from '../hooks/useHomeMobileLayout'
import { formatCompactUsd } from '../utils/formatCompact'
import { clamp } from '../utils/math'
import './LiquidityStrip.css'

const STRIP_RANGE = { min: 1, max: 99 }
const NEARBY_THRESHOLD = 3

export const oddsToStripPercent = (odds: number) =>
  ((odds - STRIP_RANGE.min) / (STRIP_RANGE.max - STRIP_RANGE.min)) * 100

export type LiquidityStripProps = {
  wager: Pick<Wager, 'openBets'>
  selectedOdds: number
  onSelect: (odds: number, fillTarget?: OpenBet) => void
  onHoverChange?: (odds: number | null) => void
  /** Taller strip for main-page wager view */
  size?: 'compact' | 'large'
}

const stopSheetSwipe = (e: React.PointerEvent | React.TouchEvent) => {
  e.stopPropagation()
}

const LiquidityStrip = ({
  wager,
  selectedOdds,
  onSelect,
  onHoverChange,
  size = 'compact'
}: LiquidityStripProps) => {
  const isMobileLayout = useHomeMobileLayout()
  const containerRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const [hoverOdds, setHoverOdds] = useState<number | null>(null)
  const [draftOdds, setDraftOdds] = useState(selectedOdds)
  const [showFillChoice, setShowFillChoice] = useState(false)

  useEffect(() => {
    setDraftOdds(selectedOdds)
  }, [selectedOdds])

  const previewOdds = isMobileLayout ? draftOdds : hoverOdds

  const closeFillChoice = useCallback(() => {
    setShowFillChoice(false)
    if (!isMobileLayout) setHoverOdds(null)
  }, [isMobileLayout])

  useEffect(() => {
    onHoverChange?.(previewOdds)
  }, [previewOdds, onHoverChange])

  useEffect(() => {
    if (!showFillChoice) return
    const handlePointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) closeFillChoice()
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFillChoice()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showFillChoice, closeFillChoice])

  const maxVol = useMemo(
    () => wager.openBets.reduce((m, b) => Math.max(m, b.volume), 0) || 1,
    [wager.openBets]
  )

  const handleMouseMove = (e: React.MouseEvent) => {
    if (showFillChoice) return
    const rect = stripRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = clamp((e.clientX - rect.left) / rect.width, 0, 1)
    const odds = Math.round(STRIP_RANGE.min + pct * (STRIP_RANGE.max - STRIP_RANGE.min))
    setHoverOdds(odds)
  }

  const handleMouseLeave = () => {
    if (showFillChoice) return
    setHoverOdds(null)
  }

  const handleContainerMouseLeave = (e: React.MouseEvent) => {
    const next = e.relatedTarget as Node | null
    if (next && containerRef.current?.contains(next)) return
    closeFillChoice()
  }

  const nearbyBets = useMemo(() => {
    const anchor = previewOdds ?? hoverOdds
    if (anchor === null) return []
    return wager.openBets.filter(
      (b) => Math.abs(b.yesOdds - anchor) <= NEARBY_THRESHOLD && b.yesOdds !== anchor
    )
  }, [previewOdds, hoverOdds, wager.openBets])

  const exactMatch = useMemo(() => {
    const anchor = previewOdds ?? hoverOdds
    if (anchor === null) return null
    return wager.openBets.find((b) => b.yesOdds === anchor) ?? null
  }, [previewOdds, hoverOdds, wager.openBets])

  const commitOdds = (odds: number) => {
    const nearby = wager.openBets.filter(
      (b) => Math.abs(b.yesOdds - odds) <= NEARBY_THRESHOLD && b.yesOdds !== odds
    )
    const exact = wager.openBets.find((b) => b.yesOdds === odds) ?? null
    if (nearby.length > 0 && !exact) {
      setDraftOdds(odds)
      setHoverOdds(odds)
      setShowFillChoice(true)
      return
    }
    onSelect(odds, exact ?? undefined)
    setDraftOdds(odds)
    setShowFillChoice(false)
    if (!isMobileLayout) setHoverOdds(null)
  }

  const handleClick = () => {
    if (isMobileLayout) return
    if (showFillChoice) {
      closeFillChoice()
      return
    }
    if (hoverOdds === null) return
    commitOdds(hoverOdds)
  }

  const handleSliderInput = (odds: number) => {
    setDraftOdds(odds)
    setShowFillChoice(false)
  }

  const handleSliderCommit = () => {
    commitOdds(draftOdds)
  }

  return (
    <div
      className={`liquidity-strip-container${size === 'large' ? ' liquidity-strip-container--large' : ''}${isMobileLayout ? ' liquidity-strip-container--mobile' : ''}`}
      ref={containerRef}
      onMouseLeave={isMobileLayout ? undefined : handleContainerMouseLeave}
    >
      <div
        ref={stripRef}
        className={`liquidity-strip${size === 'large' ? ' liquidity-strip--large' : ''}${isMobileLayout ? ' liquidity-strip--mobile' : ''}`}
        onMouseMove={isMobileLayout ? undefined : handleMouseMove}
        onMouseLeave={isMobileLayout ? undefined : handleMouseLeave}
        onClick={handleClick}
        role="slider"
        aria-label="Select odds"
        aria-valuemin={1}
        aria-valuemax={99}
        aria-valuenow={isMobileLayout ? draftOdds : selectedOdds}
      >
        <div className="liquidity-strip-bg" />
        {wager.openBets.map((bet) => {
          const leftPct = oddsToStripPercent(bet.yesOdds)
          const heightPct = clamp((bet.volume / maxVol) * 100, 12, 100)
          const isSelected = bet.yesOdds === selectedOdds
          const lineOdds = previewOdds ?? selectedOdds
          const isNearby =
            previewOdds !== null && Math.abs(bet.yesOdds - lineOdds) <= NEARBY_THRESHOLD
          return (
            <motion.div
              key={bet.yesOdds}
              className={`liquidity-strip-bar ${isSelected ? 'selected' : ''} ${isNearby ? 'nearby' : ''}`}
              style={{ left: `${leftPct}%` }}
              initial={false}
              animate={{ height: `${heightPct}%`, opacity: 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          )
        })}
        <div
          className="liquidity-strip-selected"
          style={{ left: `${oddsToStripPercent(selectedOdds)}%` }}
        />
        {!isMobileLayout && hoverOdds !== null && (
          <div
            className="liquidity-strip-cursor"
            style={{ left: `${oddsToStripPercent(hoverOdds)}%` }}
          />
        )}
        {isMobileLayout && (
          <div
            className="liquidity-strip-cursor liquidity-strip-cursor--mobile"
            style={{ left: `${oddsToStripPercent(draftOdds)}%` }}
          />
        )}
      </div>
      <div className="liquidity-strip-scale">
        <span>1¢ YES</span>
        <span>25¢</span>
        <span>50/50</span>
        <span>75¢</span>
        <span>99¢ YES</span>
      </div>

      {isMobileLayout && (
        <div
          className="liquidity-odds-slider-wrap"
          data-sheet-no-swipe
          onPointerDown={stopSheetSwipe}
          onTouchStart={stopSheetSwipe}
        >
          <div className="liquidity-odds-slider-head">
            <span className="liquidity-odds-slider-label">Odds line</span>
            <span className="liquidity-odds-slider-value">
              {draftOdds}¢ YES · {100 - draftOdds}¢ NO
            </span>
          </div>
          <input
            type="range"
            className="liquidity-odds-slider"
            min={STRIP_RANGE.min}
            max={STRIP_RANGE.max}
            value={draftOdds}
            onInput={(e) => handleSliderInput(Number(e.currentTarget.value))}
            onChange={(e) => handleSliderInput(Number(e.currentTarget.value))}
            onPointerDown={stopSheetSwipe}
            onTouchStart={stopSheetSwipe}
            onPointerUp={handleSliderCommit}
            aria-label="Adjust odds line"
          />
          {exactMatch && (
            <span className="liquidity-odds-slider-hint">
              {formatCompactUsd(exactMatch.volume)} placed at this line
            </span>
          )}
          {!exactMatch && nearbyBets.length > 0 && !showFillChoice && (
            <span className="liquidity-odds-slider-hint">Release to choose a nearby open bet</span>
          )}
        </div>
      )}

      {!isMobileLayout && (
        <AnimatePresence>
          {hoverOdds !== null && !showFillChoice && (
            <motion.div
              className="liquidity-strip-tooltip"
              style={{ left: `${oddsToStripPercent(hoverOdds)}%` }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.12 }}
            >
              <span className="liquidity-tooltip-odds">
                {hoverOdds}¢ YES / {100 - hoverOdds}¢ NO
              </span>
              {exactMatch && (
                <span className="liquidity-tooltip-vol">{formatCompactUsd(exactMatch.volume)} placed here</span>
              )}
              {!exactMatch && nearbyBets.length > 0 && (
                <span className="liquidity-tooltip-nearby">Click — nearby bets available</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <AnimatePresence>
        {showFillChoice && (previewOdds ?? hoverOdds) !== null && (
          <motion.div
            className={`liquidity-fill-choice${isMobileLayout ? ' liquidity-fill-choice--mobile' : ''}`}
            data-sheet-no-swipe={isMobileLayout ? true : undefined}
            onPointerDown={isMobileLayout ? stopSheetSwipe : undefined}
            onTouchStart={isMobileLayout ? stopSheetSwipe : undefined}
            style={
              isMobileLayout
                ? undefined
                : { left: `${oddsToStripPercent((previewOdds ?? hoverOdds)!)}%` }
            }
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="liquidity-fill-title">Nearby open bets</div>
            {nearbyBets.map((bet) => (
              <button
                key={bet.yesOdds}
                type="button"
                className="liquidity-fill-option"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(bet.yesOdds, bet)
                  setDraftOdds(bet.yesOdds)
                  setShowFillChoice(false)
                }}
              >
                <span className="liquidity-fill-odds">
                  Fill @ {bet.yesOdds}¢/{100 - bet.yesOdds}¢
                </span>
                <span className="liquidity-fill-vol">{formatCompactUsd(bet.volume)}</span>
              </button>
            ))}
            <button
              type="button"
              className="liquidity-fill-option liquidity-fill-new"
              onClick={(e) => {
                e.stopPropagation()
                const odds = previewOdds ?? hoverOdds
                if (odds !== null) {
                  onSelect(odds)
                  setDraftOdds(odds)
                }
                setShowFillChoice(false)
              }}
            >
              <span className="liquidity-fill-odds">
                Create new @ {(previewOdds ?? hoverOdds)!}¢/{100 - (previewOdds ?? hoverOdds)!}¢
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LiquidityStrip
