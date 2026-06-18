import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { OpenBet, WagerFill } from '../types/discovery'
import { formatCompactUsd } from '../utils/formatCompact'
import './Panel.css'

export interface Rule {
  label: string
  value: string
}

export interface Holder {
  address: string
  amount: string
  percentage: string
}

export interface LpPosition {
  address: string
  liquidity: string
  share: string
}

interface RulesPanelProps {
  variant?: 'market' | 'wager'
  rules?: Rule[]
  topHolders?: Holder[]
  lpPositions?: LpPosition[]
  openBets?: OpenBet[]
  wagerFills?: WagerFill[]
  poolTotal?: number
  outcomeSide: 'no' | 'yes'
  onOutcomeSideChange: (side: 'no' | 'yes') => void
}

const RulesPanel = ({
  variant = 'market',
  rules: externalRules,
  topHolders: externalHolders,
  lpPositions: externalLpPositions,
  openBets = [],
  wagerFills = [],
  poolTotal = 0,
  outcomeSide,
  onOutcomeSideChange
}: RulesPanelProps) => {
  const isWager = variant === 'wager'
  const [activeTab, setActiveTab] = useState<'rules' | 'holders' | 'lp' | 'pool' | 'fills'>('rules')

  useEffect(() => {
    setActiveTab('rules')
  }, [variant])

  const defaultRules = [
    { label: 'Resolution', value: 'never' },
    { label: 'Virality score', value: 'yes' },
    { label: 'Liquidity', value: 'approximately' },
    { label: 'Volume (24h)', value: '$12.4K' }
  ]

  const defaultTopHolders = [
    { address: '0x71C...9A21', amount: '$450k', percentage: '4.5%' },
    { address: '0x3D2...8B12', amount: '$320k', percentage: '3.2%' },
    { address: '0x9F4...1C44', amount: '$280k', percentage: '2.8%' },
    { address: '0x1A8...7D99', amount: '$150k', percentage: '1.5%' },
    { address: '0x5E6...2F33', amount: '$120k', percentage: '1.2%' }
  ]

  const defaultLpPositions = [
    { address: '0xB12...A901', liquidity: '$1.24M', share: '18.4%' },
    { address: '0x9A8...2F10', liquidity: '$980k', share: '14.6%' },
    { address: '0x1D4...C772', liquidity: '$640k', share: '9.5%' },
    { address: '0x7E6...0B31', liquidity: '$420k', share: '6.3%' },
    { address: '0x3C2...8D19', liquidity: '$310k', share: '4.7%' }
  ]

  const rules = externalRules || defaultRules
  const topHolders = externalHolders || defaultTopHolders
  const lpPositions = externalLpPositions || defaultLpPositions

  const sortedBets = [...openBets].sort((a, b) => b.volume - a.volume)

  return (
    <motion.div
      className="panel rules-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      whileHover={{ scale: 1 }}
    >
      <motion.div
        className="panel-header"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div className="panel-tabs">
            <button
              className={`panel-tab ${activeTab === 'rules' ? 'active' : ''}`}
              onClick={() => setActiveTab('rules')}
            >
              RULES
            </button>
            {isWager ? (
              <>
                <button
                  className={`panel-tab ${activeTab === 'pool' ? 'active' : ''}`}
                  onClick={() => setActiveTab('pool')}
                >
                  POOL
                </button>
                <button
                  className={`panel-tab ${activeTab === 'fills' ? 'active' : ''}`}
                  onClick={() => setActiveTab('fills')}
                >
                  FILLS
                </button>
              </>
            ) : (
              <>
                <button
                  className={`panel-tab ${activeTab === 'holders' ? 'active' : ''}`}
                  onClick={() => setActiveTab('holders')}
                >
                  TOP HOLDERS
                </button>
                <button
                  className={`panel-tab ${activeTab === 'lp' ? 'active' : ''}`}
                  onClick={() => setActiveTab('lp')}
                >
                  LP
                </button>
              </>
            )}
          </div>

          {!isWager && (
            <div
              style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                padding: '2px'
              }}
            >
              <button
                type="button"
                onClick={() => onOutcomeSideChange('no')}
                style={{
                  background: outcomeSide === 'no' ? 'rgba(255, 77, 77, 0.18)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: outcomeSide === 'no' ? '#fff' : '#777',
                  fontSize: '12px',
                  fontWeight: '900',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                }}
              >
                NO
              </button>
              <button
                type="button"
                onClick={() => onOutcomeSideChange('yes')}
                style={{
                  background: outcomeSide === 'yes' ? 'rgba(45, 213, 110, 0.14)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: outcomeSide === 'yes' ? '#fff' : '#777',
                  fontSize: '12px',
                  fontWeight: '900',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                }}
              >
                YES
              </button>
            </div>
          )}
        </div>
      </motion.div>
      <div className="panel-content">
        <AnimatePresence mode="wait">
          {activeTab === 'rules' && (
            <motion.div
              key="rules"
              className="rules-list"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {rules.map((rule, index) => (
                <motion.div
                  key={index}
                  className="rule-item"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <span className="rule-label">{rule.label} :</span>
                  <span className="rule-value"> {rule.value}</span>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === 'pool' && isWager && (
            <motion.div
              key="pool"
              className="rules-list"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="wager-pool-table-head">
                <span>YES ODDS</span>
                <span>VOLUME</span>
                <span>SHARE</span>
              </div>
              {sortedBets.map((bet) => (
                <div key={bet.yesOdds} className="wager-pool-table-row">
                  <span>
                    {bet.yesOdds}¢ / {100 - bet.yesOdds}¢
                  </span>
                  <span>{formatCompactUsd(bet.volume)}</span>
                  <span>{poolTotal > 0 ? `${Math.round((bet.volume / poolTotal) * 100)}%` : '—'}</span>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'fills' && isWager && (
            <motion.div
              key="fills"
              className="rules-list wager-rules-fills"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {wagerFills.length === 0 ? (
                <div className="wager-fills-empty">No individual fills recorded yet.</div>
              ) : (
                wagerFills.slice(0, 24).map((fill) => (
                  <div key={fill.id} className="wager-rules-fill-row">
                    <span className="wager-rules-fill-handle">@{fill.handle}</span>
                    <span className={`wager-fill-side wager-fill-side--${fill.side === 'YES' ? 'yes' : 'no'}`}>
                      {fill.side}
                    </span>
                    <span>{fill.yesOdds}¢</span>
                    <span>{formatCompactUsd(fill.usdAmount)}</span>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'holders' && !isWager && (
            <motion.div
              key="holders"
              className="rules-list"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div
                style={{
                  display: 'flex',
                  padding: '0 0 8px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '11px',
                  color: '#888',
                  fontWeight: '600'
                }}
              >
                <span style={{ flex: 1 }}>ADDRESS</span>
                <span style={{ flex: 1, textAlign: 'right' }}>VALUE</span>
                <span style={{ width: '40px', textAlign: 'right' }}>%</span>
              </div>
              {topHolders.map((holder, index) => (
                <motion.div
                  key={index}
                  className="rule-item"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  style={{ fontSize: '12px' }}
                >
                  <span style={{ flex: 1, fontFamily: 'Roboto Mono, monospace', color: '#a0a0a0' }}>
                    {holder.address}
                  </span>
                  <span style={{ flex: 1, textAlign: 'right', color: '#fff', fontWeight: '600' }}>
                    {holder.amount}
                  </span>
                  <span style={{ width: '40px', textAlign: 'right', color: '#FF4D4D', fontWeight: '600' }}>
                    {holder.percentage}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === 'lp' && !isWager && (
            <motion.div
              key="lp"
              className="rules-list"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div
                style={{
                  display: 'flex',
                  padding: '0 0 8px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '11px',
                  color: '#888',
                  fontWeight: '600'
                }}
              >
                <span style={{ flex: 1 }}>ADDRESS</span>
                <span style={{ flex: 1, textAlign: 'right' }}>LIQUIDITY</span>
                <span style={{ width: '60px', textAlign: 'right' }}>%</span>
              </div>
              {lpPositions.map((lp, index) => (
                <motion.div
                  key={index}
                  className="rule-item"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  style={{ fontSize: '12px' }}
                >
                  <span style={{ flex: 1, fontFamily: 'Roboto Mono, monospace', color: '#a0a0a0' }}>
                    {lp.address}
                  </span>
                  <span style={{ flex: 1, textAlign: 'right', color: '#fff', fontWeight: '600' }}>
                    {lp.liquidity}
                  </span>
                  <span style={{ width: '60px', textAlign: 'right', color: '#2DD56E', fontWeight: '600' }}>
                    {lp.share}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default RulesPanel
