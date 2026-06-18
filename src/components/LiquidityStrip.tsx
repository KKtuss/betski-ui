import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { OpenBet, Wager } from '../types/discovery'
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

const LiquidityStrip = ({
  wager,
  selectedOdds,
  onSelect,
  onHoverChange,
  size = 'compact'
}: LiquidityStripProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const [hoverOdds, setHoverOdds] = useState<number | null>(null)
  const [showFillChoice, setShowFillChoice] = useState(false)

  const closeFillChoice = useCallback(() => {
    setShowFillChoice(false)
    setHoverOdds(null)
  }, [])

  useEffect(() => {
    onHoverChange?.(hoverOdds)
  }, [hoverOdds, onHoverChange])

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
    if (hoverOdds === null) return []
    return wager.openBets.filter(
      (b) => Math.abs(b.yesOdds - hoverOdds) <= NEARBY_THRESHOLD && b.yesOdds !== hoverOdds
    )
  }, [hoverOdds, wager.openBets])

  const exactMatch = useMemo(() => {
    if (hoverOdds === null) return null
    return wager.openBets.find((b) => b.yesOdds === hoverOdds) ?? null
  }, [hoverOdds, wager.openBets])

  const handleClick = () => {
    if (showFillChoice) {
      closeFillChoice()
      return
    }
    if (hoverOdds === null) return
    if (nearbyBets.length > 0 && !exactMatch) {
      setShowFillChoice(true)
    } else {
      onSelect(hoverOdds, exactMatch ?? undefined)
      setShowFillChoice(false)
    }
  }

  return (
    <div
      className={`liquidity-strip-container${size === 'large' ? ' liquidity-strip-container--large' : ''}`}
      ref={containerRef}
      onMouseLeave={handleContainerMouseLeave}
    >
      <div
        ref={stripRef}
        className={`liquidity-strip${size === 'large' ? ' liquidity-strip--large' : ''}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        role="slider"
        aria-label="Select odds"
        aria-valuemin={1}
        aria-valuemax={99}
        aria-valuenow={selectedOdds}
      >
        <div className="liquidity-strip-bg" />
        {wager.openBets.map((bet) => {
          const leftPct = oddsToStripPercent(bet.yesOdds)
          const heightPct = clamp((bet.volume / maxVol) * 100, 12, 100)
          const isSelected = bet.yesOdds === selectedOdds
          const isNearby =
            hoverOdds !== null && Math.abs(bet.yesOdds - hoverOdds) <= NEARBY_THRESHOLD
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
        {hoverOdds !== null && (
          <div
            className="liquidity-strip-cursor"
            style={{ left: `${oddsToStripPercent(hoverOdds)}%` }}
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
      <AnimatePresence>
        {showFillChoice && hoverOdds !== null && (
          <motion.div
            className="liquidity-fill-choice"
            style={{ left: `${oddsToStripPercent(hoverOdds)}%` }}
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
                if (hoverOdds !== null) onSelect(hoverOdds)
                setShowFillChoice(false)
              }}
            >
              <span className="liquidity-fill-odds">
                Create new @ {hoverOdds}¢/{100 - hoverOdds}¢
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LiquidityStrip
