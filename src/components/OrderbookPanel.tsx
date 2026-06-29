import { motion, AnimatePresence } from 'framer-motion'
import ShareForm from './shared/ShareForm'
import TradingForm from './orderbook/TradingForm'
import type { OrderbookPanelProps } from '../types/orderbook'
import { createDefaultRecentTrades } from '../data/mockRecentTrades'
import './Panel.css'

const OrderbookPanel = ({ activeMode = 'orderbook', onBack = () => {}, recentTrades: externalTrades, walletBalance = 0, holdingShares = 0, currentPrice = 68.5, onTradeExecuted, shareTargets, onShareToChat, compact = false }: OrderbookPanelProps) => {

  const defaultRecentTrades = createDefaultRecentTrades()

  const recentTrades = externalTrades ?? defaultRecentTrades
  const visibleTrades = compact ? recentTrades.slice(0, 8) : recentTrades

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
            compact={compact}
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
          className={`panel orderbook-panel${compact ? ' orderbook-panel--compact' : ''}`}
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
            style={compact ? { padding: '8px 12px' } : undefined}
          >
            <span className="orderbook-title" style={compact ? { fontSize: '11px' } : undefined}>RECENT TRADES</span>
          </motion.div>
          <div className="panel-content orderbook-content" style={{ padding: 0, width: '100%' }}>
            <motion.div
              key="trades-list"
              className="recent-trades-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              style={compact ? { padding: '6px 8px' } : undefined}
            >
              <div
                className="trade-row header-row"
                style={{
                  padding: compact ? '4px 8px' : '8px 12px',
                  color: '#666',
                  fontSize: compact ? '9px' : '11px',
                  fontWeight: '600',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  marginBottom: compact ? '2px' : '4px',
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
                  overflowY: compact ? 'hidden' : 'auto',
                  overflowX: 'hidden',
                  height: compact ? '100%' : 'calc(100% - 32px)',
                  paddingBottom: compact ? '4px' : '8px',
                  flex: compact ? '1 1 auto' : undefined,
                  minHeight: compact ? 0 : undefined
                }}
              >
                <AnimatePresence initial={false}>
                  {visibleTrades.map((trade, index) => (
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
                        padding: compact ? '2px 8px' : '4px 12px',
                        alignItems: 'center',
                        fontSize: compact ? '10px' : undefined
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
