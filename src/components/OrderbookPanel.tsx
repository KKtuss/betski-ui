import { motion, AnimatePresence } from 'framer-motion'
import ShareForm from './shared/ShareForm'
import TradingForm from './orderbook/TradingForm'
import type { OrderbookPanelProps } from '../types/orderbook'
import { createDefaultRecentTrades } from '../data/mockRecentTrades'
import './Panel.css'

const OrderbookPanel = ({ activeMode = 'orderbook', onBack = () => {}, recentTrades: externalTrades, walletBalance = 0, holdingShares = 0, currentPrice = 68.5, onTradeExecuted, shareTargets, onShareToChat }: OrderbookPanelProps) => {

  const defaultRecentTrades = createDefaultRecentTrades()

  const recentTrades = externalTrades ?? defaultRecentTrades

  return (
    <AnimatePresence mode="wait">
      {activeMode === 'long' || activeMode === 'short' ? (
        <motion.div 
          key={activeMode}
          className="panel orderbook-panel"
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 12 }}
          transition={{ duration: 0.25 }}
        >
          <TradingForm
            mode={activeMode}
            onBack={onBack}
            walletBalance={walletBalance}
            holdingShares={holdingShares}
            currentPrice={currentPrice}
            onTradeExecuted={onTradeExecuted}
          />
        </motion.div>
      ) : activeMode === 'share' ? (
        <motion.div
          key="share"
          className="panel orderbook-panel"
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 12 }}
          transition={{ duration: 0.25 }}
        >
          <ShareForm onBack={onBack} shareTargets={shareTargets} onShareToChat={onShareToChat} />
        </motion.div>
      ) : (
        <motion.div 
          key="orderbook"
          className="panel orderbook-panel"
          initial={{ opacity: 0, scale: 0.98, y: -12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -12 }}
          transition={{ duration: 0.25 }}
          whileHover={{ scale: 1 }}
        >
          <motion.div
            className="panel-header orderbook-header orderbook-header--trades-only"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            <span className="orderbook-title">RECENT TRADES</span>
          </motion.div>
          <div className="panel-content orderbook-content" style={{ padding: 0, width: '100%' }}>
            <motion.div
              key="trades-list"
              className="recent-trades-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              <div
                className="trade-row header-row"
                style={{
                  padding: '8px 12px',
                  color: '#666',
                  fontSize: '11px',
                  fontWeight: '600',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  marginBottom: '4px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  alignItems: 'center'
                }}
              >
                <span className="trade-time" style={{ textAlign: 'left' }}>
                  TIME
                </span>
                <span className="trade-price" style={{ textAlign: 'center' }}>
                  PRICE
                </span>
                <span className="trade-quantity" style={{ textAlign: 'right' }}>
                  SIZE
                </span>
              </div>

              <div
                className="recent-trades-list"
                style={{
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  height: 'calc(100% - 32px)',
                  paddingBottom: '8px'
                }}
              >
                <AnimatePresence initial={false}>
                  {recentTrades.map((trade, index) => (
                    <motion.div
                      key={trade.id ?? `${trade.time}-${index}`}
                      className="trade-row"
                      layout="position"
                      initial={{ opacity: 0, y: -8, backgroundColor: trade.type === 'buy' ? 'rgba(45, 213, 110, 0.18)' : 'rgba(255, 77, 77, 0.18)' }}
                      animate={{ opacity: 1, y: 0, backgroundColor: 'rgba(0, 0, 0, 0)' }}
                      exit={{ opacity: 0 }}
                      transition={{
                        opacity: { duration: 0.25 },
                        y: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
                        backgroundColor: { duration: 0.9, ease: 'easeOut' },
                        layout: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
                      }}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        padding: '4px 12px',
                        alignItems: 'center'
                      }}
                    >
                      <span className="trade-time" style={{ textAlign: 'left' }}>
                        {trade.time}
                      </span>
                      <span className={`trade-price ${trade.type}`} style={{ textAlign: 'center' }}>
                        {trade.price.toFixed(2)}
                      </span>
                      <span className="trade-quantity" style={{ textAlign: 'right' }}>
                        {trade.quantity}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default OrderbookPanel
