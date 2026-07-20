import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import type { OpenBet, Wager, WagerFill } from '../types/discovery'
import { PROFILE_AVATARS } from '../data/profileRegistry'
import { getSelectedLineFills } from '../utils/wagerFills'
import './WagerLiquidityPanel.css'
import './Panel.css'

type WagerLiquidityPanelProps = {
  wager: Wager
  selectedOdds: number
  fillTarget?: OpenBet
  fills: WagerFill[]
  walletBalance: number
  activeMode: 'orderbook' | 'long' | 'short' | 'share'
  onBack: () => void
  onSelectSide?: (side: 'yes' | 'no') => void
  onExecuteTrade: (params: {
    marketId: string
    marketName: string
    side: 'yes' | 'no'
    usdAmount: number
    price: number
  }) => void
  compact?: boolean
}

const QUICK_AMOUNTS = [10, 25, 50, 100]

type WagerOpponent = {
  id: string
  side: 'YES' | 'NO'
  username: string
  avatar: string
  wagered: number
  filledAmount: number
  partialFillAllowed: boolean
}

const resolveFillAvatar = (handle: string) =>
  PROFILE_AVATARS[handle] ?? '/Stems/BetskiPEFFPEE.png'

const formatWagerAmount = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)}K` : Math.round(value).toLocaleString()

const formatCurrencyAmount = (value: number) => `$${formatWagerAmount(value)}`

const OpponentIdentity = ({
  opponent,
  align = 'left'
}: {
  opponent: WagerOpponent
  align?: 'left' | 'right'
}) => (
  <span className={`wager-ref-person wager-ref-person--${align}`}>
    {align === 'left' && <img src={opponent.avatar} alt="" className="wager-ref-avatar" />}
    <span className="wager-ref-person-copy">
      <span className="wager-ref-name-line">
        <strong>{opponent.username}</strong>
      </span>
      <span>{formatWagerAmount(opponent.wagered)} wagered</span>
    </span>
    {align === 'right' && <img src={opponent.avatar} alt="" className="wager-ref-avatar" />}
  </span>
)

const WagerLiquidityPanel = ({
  wager,
  selectedOdds,
  fills,
  walletBalance,
  activeMode,
  onBack,
  onExecuteTrade,
  compact = false
}: WagerLiquidityPanelProps) => {
  const [customAmount, setCustomAmount] = useState('250')
  const [fillMode, setFillMode] = useState<'any' | 'specific'>('specific')
  const [selectedOpponentId, setSelectedOpponentId] = useState<string | null>(null)
  const [fillRestriction, setFillRestriction] = useState<'partial' | 'full'>('partial')

  const isTrading = activeMode === 'long' || activeMode === 'short'
  const tradeSide = isTrading ? (activeMode === 'long' ? 'yes' : 'no') : 'yes'
  const yesOdds = selectedOdds
  const noOdds = 100 - selectedOdds
  const tradePrice = tradeSide === 'yes' ? yesOdds : noOdds
  const userSide = tradeSide === 'no' ? 'NO' : 'YES'
  const userStake = Math.max(0, Math.round(Number(customAmount) || 0))
  const selectedLineFills = useMemo(
    () => getSelectedLineFills(wager, fills, selectedOdds),
    [wager, fills, selectedOdds]
  )
  
  // Convert selectedLineFills to WagerOpponent format
  const lineOpponents: WagerOpponent[] = useMemo(() => {
    return selectedLineFills.map((fill) => {
      // 70% fully filled, 30% partial (using hash of fill.id for consistency)
      const hash = fill.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      const isFullyFilled = (hash % 10) < 7
      let filledAmount: number
      if (isFullyFilled) {
        filledAmount = fill.availableSize
      } else {
        // For partial, use a random percentage between 10-60%
        const partialHash = fill.counterpartyName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        const filledPercent = (partialHash % 50) + 10 // 10-60% filled
        filledAmount = Math.round((fill.availableSize * filledPercent) / 100)
      }
      return {
        id: fill.id,
        side: fill.side,
        username: fill.counterpartyName,
        avatar: resolveFillAvatar(fill.counterpartyName),
        wagered: fill.availableSize,
        filledAmount,
        partialFillAllowed: fill.partialFillAllowed
      }
    }).sort((a, b) => b.wagered - a.wagered)
  }, [selectedLineFills])

  const noOpponents = lineOpponents.filter(o => o.side === 'NO')
  const yesOpponents = lineOpponents.filter(o => o.side === 'YES')
  
  // Build WAGER_BOOK_ROWS from lineOpponents
  const WAGER_BOOK_ROWS = useMemo(() => {
    const maxLen = Math.max(noOpponents.length, yesOpponents.length)
    const rows: Array<{ no?: WagerOpponent; yes?: WagerOpponent }> = []
    for (let i = 0; i < maxLen; i++) {
      const row: { no?: WagerOpponent; yes?: WagerOpponent } = {}
      if (i < noOpponents.length) row.no = noOpponents[i]
      if (i < yesOpponents.length) row.yes = yesOpponents[i]
      rows.push(row)
    }
    return rows
  }, [noOpponents, yesOpponents])
  
  // Set default selected opponent if needed
  const selectedOpponent = useMemo(() => {
    if (selectedOpponentId) {
      return lineOpponents.find((o: WagerOpponent) => o.id === selectedOpponentId)
    }
    const defaultSide = tradeSide === 'no' ? 'NO' : 'YES'
    return lineOpponents.find((o: WagerOpponent) => o.side === defaultSide) || null
  }, [lineOpponents, selectedOpponentId, tradeSide])

  // Update selected opponent when selectedOdds changes (only if no opponent is selected)
  useEffect(() => {
    if (!selectedOpponentId) {
      const defaultSide = tradeSide === 'no' ? 'NO' : 'YES'
      const firstSideOpponent = lineOpponents.find((o: WagerOpponent) => o.side === defaultSide)
      setSelectedOpponentId(firstSideOpponent?.id || null)
    }
  }, [selectedOdds, lineOpponents, tradeSide, selectedOpponentId])
  
  const noWageredTotal = noOpponents.reduce((sum, o) => sum + o.wagered, 0)
  const yesWageredTotal = yesOpponents.reduce((sum, o) => sum + o.wagered, 0)
  const maxOpponentWagered = Math.max(
    ...lineOpponents.map(o => o.wagered),
    1
  )
  const potentialMultiplier = tradePrice > 0 ? (100 / tradePrice).toFixed(1) : '0.0'
  const potentialProfitDollars = tradePrice > 0 ? (userStake * (100 / tradePrice) - userStake).toFixed(2) : '0.00'

  const handleCustomBuy = () => {
    const usd = userStake
    if (usd <= 0 || usd > walletBalance) return
    if (!selectedOpponent) return
    // Prevent submitting against fully filled wagers
    if (selectedOpponent.filledAmount >= selectedOpponent.wagered) return
    onExecuteTrade({
      marketId: wager.id,
      marketName: wager.name,
      side: tradeSide,
      usdAmount: usd,
      price: tradePrice
    })
    onBack()
  }

  const defaultUserSide = userSide
  const displayBookRows = compact ? WAGER_BOOK_ROWS.slice(0, 3) : WAGER_BOOK_ROWS

  return (
    <motion.div
      className={`panel orderbook-panel wager-liquidity-panel wager-liquidity-panel--trading${compact ? ' wager-liquidity-panel--compact' : ''}`}
      initial={{ opacity: 0, scale: 0.98, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: 12 }}
    >
      <div className="wager-ref-shell">
        <div className="wager-ref-head">
          <div className="wager-ref-head-copy">
            <div>
              <div className="wager-ref-title">TRADE</div>
              <div className="wager-ref-line-label">SELECTED LINE</div>
              <div className="wager-ref-line-value">
                {yesOdds}¢ YES <span>•</span> {noOdds}¢ NO
              </div>
            </div>
          </div>

          <div className="wager-ref-mode-toggle" role="group" aria-label="Fill mode">
            <button
              type="button"
              className={`wager-ref-mode-btn${fillMode === 'any' ? ' active' : ''}`}
              onClick={() => setFillMode('any')}
            >
              Fill Any
            </button>
            <button
              type="button"
              className={`wager-ref-mode-btn${fillMode === 'specific' ? ' active' : ''}`}
              onClick={() => setFillMode('specific')}
            >
              Pick Specific
            </button>
          </div>
        </div>

        <div className="wager-ref-totals">
          <div>
            <span>NO wagered</span>
            <strong className="wager-ref-red">{formatCurrencyAmount(noWageredTotal)}</strong>
          </div>
          <i aria-hidden="true" />
          <div>
            <span>YES wagered</span>
            <strong className="wager-ref-green">{formatCurrencyAmount(yesWageredTotal)}</strong>
          </div>
        </div>

        <div className="wager-ref-book">
          <div className="wager-ref-book-head">
            <span className="wager-ref-red">NO SIDE</span>
            <span className="wager-ref-green">YES SIDE</span>
          </div>
          <div className="wager-ref-book-rows">
            {displayBookRows.map((row, index) => {
              const noOpponent = row.no
              const yesOpponent = row.yes
              const noWidth = noOpponent ? Math.max(10, (noOpponent.wagered / maxOpponentWagered) * 100) : 0
              const yesWidth = yesOpponent ? Math.max(10, (yesOpponent.wagered / maxOpponentWagered) * 100) : 0
              // Calculate filled percentages (avoid division by zero)
              const noFilledPercent = noOpponent && noOpponent.wagered > 0 
                ? Math.max(0, Math.min(100, (noOpponent.filledAmount / noOpponent.wagered) * 100)) 
                : 0
              const yesFilledPercent = yesOpponent && yesOpponent.wagered > 0 
                ? Math.max(0, Math.min(100, (yesOpponent.filledAmount / yesOpponent.wagered) * 100)) 
                : 0
              const isNoSelected = fillMode === 'specific' && noOpponent && selectedOpponentId === noOpponent.id
              const isYesSelected = fillMode === 'specific' && yesOpponent && selectedOpponentId === yesOpponent.id
              const isNoFilled = noOpponent && noOpponent.filledAmount >= noOpponent.wagered
              const isYesFilled = yesOpponent && yesOpponent.filledAmount >= yesOpponent.wagered

              return (
                <div
                  key={`wager-book-row-${index}`}
                  className={`wager-ref-book-row${isNoSelected || isYesSelected ? ` is-selected is-selected--${defaultUserSide.toLowerCase()}` : ''}`}
                >
                  {noOpponent ? (
                    <button
                      type="button"
                      className={`wager-ref-person-btn${isNoSelected ? ' active' : ''}${isNoFilled ? ' is-filled' : ''}`}
                      onClick={() => !isNoFilled && setSelectedOpponentId(noOpponent.id)}
                      disabled={isNoFilled}
                    >
                      <OpponentIdentity opponent={noOpponent} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="wager-ref-empty-side wager-ref-empty-side--no"
                      onClick={() => yesOpponent && setSelectedOpponentId(yesOpponent.id)}
                      disabled={!yesOpponent}
                    >
                      Waiting to be filled
                    </button>
                  )}
                  {noOpponent ? (
                    <button
                      type="button"
                      className={`wager-ref-bar-cell wager-ref-bar-cell--no${isNoFilled ? ' is-filled' : ''}`}
                      onClick={() => !isNoFilled && setSelectedOpponentId(noOpponent.id)}
                      disabled={isNoFilled}
                      aria-label={`Select ${noOpponent.username}`}
                    >
                      <div
                        className="wager-ref-bar-container"
                        style={{ width: `${noWidth}%` }}
                      >
                        <div
                          className="wager-ref-bar-fill"
                          style={{ width: `${noFilledPercent}%` }}
                        />
                      </div>
                    </button>
                  ) : (
                    <span className="wager-ref-bar-cell wager-ref-bar-cell--empty" />
                  )}
                  <span className="wager-ref-center-line" aria-hidden="true" />
                  <button
                    type="button"
                    className={`wager-ref-bar-cell wager-ref-bar-cell--yes${isYesFilled ? ' is-filled' : ''}`}
                    onClick={() => !isYesFilled && yesOpponent && setSelectedOpponentId(yesOpponent.id)}
                    disabled={isYesFilled}
                    aria-label={yesOpponent ? `Select ${yesOpponent.username}` : undefined}
                  >
                    {yesOpponent ? (
                      <div
                        className="wager-ref-bar-container"
                        style={{ width: `${yesWidth}%` }}
                      >
                        <div
                          className="wager-ref-bar-fill"
                          style={{ width: `${yesFilledPercent}%` }}
                        />
                      </div>
                    ) : null}
                  </button>
                  {yesOpponent ? (
                    <button
                      type="button"
                      className={`wager-ref-person-btn${isYesSelected ? ' active' : ''}${isYesFilled ? ' is-filled' : ''}`}
                      onClick={() => !isYesFilled && setSelectedOpponentId(yesOpponent.id)}
                      disabled={isYesFilled}
                    >
                      <OpponentIdentity opponent={yesOpponent} align="right" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="wager-ref-empty-side wager-ref-empty-side--yes"
                      onClick={() => noOpponent && setSelectedOpponentId(noOpponent.id)}
                      disabled={!noOpponent}
                    >
                      Waiting to be filled
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="wager-ref-fill-radios" role="group" aria-label="Fill restrictions">
          <button
            type="button"
            className={fillRestriction === 'partial' ? 'active' : ''}
            onClick={() => setFillRestriction('partial')}
          >
            <span />
            Partial fills allowed
          </button>
          <button
            type="button"
            className={fillRestriction === 'full' ? 'active' : ''}
            onClick={() => setFillRestriction('full')}
          >
            <span />
            Full fill only
          </button>
        </div>

        {selectedOpponent && !compact && (
          <div className="wager-ref-selected-fill">
            <div className="wager-ref-selected-label">Wagering against</div>
            <div className="wager-ref-selected-body">
              <OpponentIdentity opponent={selectedOpponent} />
              <div className="wager-ref-selected-meta">
                <strong>{selectedOpponent.side}</strong>
                <span>·</span>
                <span>{formatWagerAmount(selectedOpponent.wagered)} wagered</span>
                <span>·</span>
                <span>{fillRestriction === 'partial' ? 'Partial fills allowed' : 'Full fill only'}</span>
              </div>
              <button type="button" className="wager-ref-change">
                Change
              </button>
            </div>
          </div>
        )}

        <div className="wager-ref-bottom-grid">
          <div className="wager-ref-amount-card">
            <div className="wager-ref-amount-picker">
              <span className="wager-ref-amount-label">Amount</span>
              <div className="wager-ref-amount-input-wrapper">
                <span className="wager-ref-amount-currency">$</span>
                <input
                  id="wager-buy-amount"
                  className="wager-ref-amount-input"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  inputMode="decimal"
                />
              </div>
            </div>
            <div className="wager-ref-quick-amounts">
              {QUICK_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className={`wager-ref-quick-btn${Number(customAmount) === amount ? ' active' : ''}`}
                  onClick={() => setCustomAmount(String(amount))}
                >
                  ${amount}
                </button>
              ))}
            </div>
          </div>

          <div className="wager-ref-gain-card">
            <span className="wager-ref-gain-label">Potential profit</span>
            <strong>${potentialProfitDollars}</strong>
            <em>{potentialMultiplier}x RETURN</em>
          </div>
        </div>

        <button
          type="button"
          className="wager-ref-submit"
          onClick={handleCustomBuy}
          disabled={!selectedOpponent}
        >
          {selectedOpponent ? `Wager against ${selectedOpponent.username}` : 'No opponents available'}
        </button>

        <div className="wager-ref-footer">
          <ShieldCheck size={15} />
          <span>
            By placing this order you agree to the <a href="#market-rules">market rules</a>.
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export default WagerLiquidityPanel
