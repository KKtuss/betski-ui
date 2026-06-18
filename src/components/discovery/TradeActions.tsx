import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ActionButton from './ActionButton'
import './TradeActions.css'

export type OnExecuteTrade = (params: {
  marketId: string
  marketName: string
  side: 'yes' | 'no'
  usdAmount: number
  price: number
}) => void

export const TradeActions = ({
  yesPrice,
  noPrice,
  amountUsd,
  marketId,
  marketName,
  onExecuteTrade
}: {
  yesPrice: number
  noPrice: number
  amountUsd: number
  marketId?: string
  marketName?: string
  onExecuteTrade?: OnExecuteTrade
}) => {
  const [feedback, setFeedback] = useState<{ type: 'yes' | 'no'; price: number; amountUsd: number } | null>(null)

  const handleTrade = (type: 'yes' | 'no', price: number, amount: number) => {
    if (marketId && marketName && onExecuteTrade) {
      onExecuteTrade({ marketId, marketName, side: type, usdAmount: amount, price })
    }
    setFeedback({ type, price, amountUsd: amount })
    setTimeout(() => setFeedback(null), 2500)
  }

  return (
    <div className="discovery-actions" style={{ position: 'relative', width: '60px', height: '28px' }}>
      <AnimatePresence initial={false}>
        {!feedback && (
          <motion.div
            key="buttons"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="discovery-actions-buttons"
            style={{ position: 'absolute', inset: 0 }}
          >
            <ActionButton type="yes" price={yesPrice} amountUsd={amountUsd} onTrade={handleTrade} />
            <ActionButton type="no" price={noPrice} amountUsd={amountUsd} onTrade={handleTrade} />
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {feedback && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={`discovery-trade-feedback ${feedback.type}`}
            style={{ position: 'absolute', right: -4, top: -6, bottom: -6, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
          >
            <div className="feedback-pill">
              <span className="feedback-action">BOUGHT</span>
              <div className="feedback-details">
                <span className="feedback-side">{feedback.type === 'yes' ? 'YES' : 'NO'}</span>
                <span className="feedback-price">${feedback.amountUsd} @{feedback.price}¢</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
