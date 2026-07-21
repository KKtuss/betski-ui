import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ActionButton, { type ActionLabelStyle } from './ActionButton'
import { triggerCollectionFly } from '../../utils/collectionFlyBus'
import './TradeActions.css'

export type OnExecuteTrade = (params: {
  marketId: string
  marketName: string
  side: 'yes' | 'no'
  usdAmount: number
  price: number
}) => void

type Feedback = { type: 'yes' | 'no'; price: number; amountUsd: number }
type ToastAnchor = { top: number; height: number; width: number }

export const TradeActions = ({
  yesPrice,
  noPrice,
  amountUsd,
  marketId,
  marketName,
  thumbnailUrls,
  onExecuteTrade,
  labelStyle = 'yn'
}: {
  yesPrice: number
  noPrice: number
  amountUsd: number
  marketId?: string
  marketName?: string
  thumbnailUrls?: string[]
  onExecuteTrade?: OnExecuteTrade
  /** Wagers keep Y/N; batch markets use ↑/↓. */
  labelStyle?: ActionLabelStyle
}) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const dismissTimerRef = useRef<number | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [anchor, setAnchor] = useState<ToastAnchor | null>(null)

  const measureAnchor = () => {
    const root = rootRef.current
    const row = root?.closest('.discovery-row') as HTMLElement | null
    if (!root || !row) return null
    const rowRect = row.getBoundingClientRect()
    const rootRect = root.getBoundingClientRect()
    const isWager = row.classList.contains('discovery-row--wager')
    // Same width for market + wager — don't let tall stacked wager cards inflate the toast.
    const width = Math.round(Math.min(128, Math.max(104, Math.min(rowRect.width, 400) / 3)))
    const height = isWager
      ? Math.round(Math.max(52, Math.min(64, rootRect.height + 4)))
      : Math.round(Math.max(36, rowRect.height))
    const top = isWager
      ? rootRect.top + rootRect.height / 2 - height / 2
      : rowRect.top
    return { top, height, width }
  }

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current != null) window.clearTimeout(dismissTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!feedback) return
    const sync = () => {
      const next = measureAnchor()
      if (next) setAnchor(next)
    }
    sync()
    window.addEventListener('scroll', sync, true)
    window.addEventListener('resize', sync)
    return () => {
      window.removeEventListener('scroll', sync, true)
      window.removeEventListener('resize', sync)
    }
  }, [feedback])

  const handleTrade = (type: 'yes' | 'no', price: number, amount: number) => {
    // Only animate after a real quick-buy — never on stems/demo rows without a trade handler.
    if (!marketId || !marketName || !onExecuteTrade) return

    onExecuteTrade({ marketId, marketName, side: type, usdAmount: amount, price })
    if (thumbnailUrls && thumbnailUrls.length > 0) {
      triggerCollectionFly(thumbnailUrls)
    }
    setAnchor(measureAnchor())
    setFeedback({ type, price, amountUsd: amount })
    if (dismissTimerRef.current != null) window.clearTimeout(dismissTimerRef.current)
    dismissTimerRef.current = window.setTimeout(() => {
      setFeedback(null)
      setAnchor(null)
      dismissTimerRef.current = null
    }, 2200)
  }

  const toast =
    typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {feedback && anchor ? (
              <motion.div
                key={`${marketId ?? 'trade'}-${feedback.type}-${feedback.price}`}
                className={`discovery-trade-toast ${feedback.type}`}
                style={{
                  top: anchor.top,
                  height: anchor.height,
                  width: anchor.width
                }}
                initial={{ x: '110%', opacity: 0.85 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '110%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                role="status"
                aria-live="polite"
                aria-label={`Bought ${feedback.type === 'yes' ? 'Yes' : 'No'} for $${feedback.amountUsd} at ${feedback.price} cents`}
              >
                <span className="discovery-trade-toast-rail" aria-hidden="true" />
                <div className="discovery-trade-toast-body">
                  <div className="discovery-trade-toast-row">
                    <span className="discovery-trade-toast-label">bought</span>
                    <span className="discovery-trade-toast-sep" aria-hidden="true">:</span>
                    <span className="discovery-trade-toast-value discovery-trade-toast-value--side">
                      {feedback.type === 'yes' ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="discovery-trade-toast-row">
                    <span className="discovery-trade-toast-label">for</span>
                    <span className="discovery-trade-toast-sep" aria-hidden="true">:</span>
                    <span className="discovery-trade-toast-value">${feedback.amountUsd}</span>
                  </div>
                  <div className="discovery-trade-toast-row">
                    <span className="discovery-trade-toast-label">@</span>
                    <span className="discovery-trade-toast-sep" aria-hidden="true">:</span>
                    <span className="discovery-trade-toast-value">{feedback.price}¢</span>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body
        )
      : null

  return (
    <div className="discovery-actions" ref={rootRef}>
      <div className="discovery-actions-buttons">
        <ActionButton
          type="yes"
          price={yesPrice}
          amountUsd={amountUsd}
          onTrade={handleTrade}
          labelStyle={labelStyle}
        />
        <span className="discovery-actions-divider" aria-hidden="true" />
        <ActionButton
          type="no"
          price={noPrice}
          amountUsd={amountUsd}
          onTrade={handleTrade}
          labelStyle={labelStyle}
        />
      </div>
      {toast}
    </div>
  )
}
