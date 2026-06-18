import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ChevronDown, ShieldCheck } from 'lucide-react'
import type { OpenBet, Wager, WagerFill } from '../types/discovery'
import { TradeActions } from './discovery/TradeActions'
import { formatCompactUsd } from '../utils/formatCompact'
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
}

const QUICK_AMOUNTS = [10, 25, 50, 100]

type OpponentBadge = 'Friend' | 'Whale' | 'Following'

type WagerOpponent = {
  id: string
  side: 'YES' | 'NO'
  username: string
  badge?: OpponentBadge
  avatar: string
  wagered: number
  partialFillAllowed: boolean
}

const NO_SIDE_OPPONENTS: WagerOpponent[] = [
  {
    id: 'no-moontrader',
    side: 'NO',
    username: 'MoonTrader',
    badge: 'Whale',
    avatar: '/Stems/moggorrr transparent.png',
    wagered: 580,
    partialFillAllowed: true
  },
  {
    id: 'no-jessieb',
    side: 'NO',
    username: 'JessieB',
    badge: 'Friend',
    avatar: '/Stems/epstein transparent.png',
    wagered: 320,
    partialFillAllowed: true
  },
  {
    id: 'no-alphak',
    side: 'NO',
    username: 'AlphaK',
    badge: 'Following',
    avatar: '/Stems/BetskiPEFFPEE.png',
    wagered: 250,
    partialFillAllowed: false
  },
  {
    id: 'no-oxdegen',
    side: 'NO',
    username: 'OxDegen',
    avatar: '/Stems/betskuu.png',
    wagered: 180,
    partialFillAllowed: true
  },
  {
    id: 'no-pandabet',
    side: 'NO',
    username: 'PandaBet',
    badge: 'Friend',
    avatar: '/Stems/moggorrr transparent.png',
    wagered: 70,
    partialFillAllowed: true
  }
]

const YES_SIDE_OPPONENTS: WagerOpponent[] = [
  {
    id: 'yes-kassandra-1100',
    side: 'YES',
    username: 'kassandra',
    avatar: '/Stems/epstein transparent.png',
    wagered: 1100,
    partialFillAllowed: true
  },
  {
    id: 'yes-kassandra-750',
    side: 'YES',
    username: 'Kassandra',
    badge: 'Friend',
    avatar: '/Stems/betskuu.png',
    wagered: 750,
    partialFillAllowed: true
  },
  {
    id: 'yes-whaleshark',
    side: 'YES',
    username: 'WhaleShark',
    badge: 'Whale',
    avatar: '/Stems/BetskiPEFFPEE.png',
    wagered: 420,
    partialFillAllowed: false
  },
  {
    id: 'yes-chartnerd',
    side: 'YES',
    username: 'ChartNerd',
    badge: 'Following',
    avatar: '/Stems/moggorrr transparent.png',
    wagered: 220,
    partialFillAllowed: true
  },
  {
    id: 'yes-satoshibet',
    side: 'YES',
    username: 'SatoshiBet',
    avatar: '/Stems/epstein transparent.png',
    wagered: 90,
    partialFillAllowed: true
  }
]

const ALL_WAGER_OPPONENTS = [...NO_SIDE_OPPONENTS, ...YES_SIDE_OPPONENTS]

const WAGER_BOOK_ROWS: Array<{ no?: WagerOpponent; yes?: WagerOpponent }> = [
  { no: NO_SIDE_OPPONENTS[0], yes: YES_SIDE_OPPONENTS[0] },
  { no: NO_SIDE_OPPONENTS[1] },
  { yes: YES_SIDE_OPPONENTS[1] },
  { no: NO_SIDE_OPPONENTS[2], yes: YES_SIDE_OPPONENTS[2] },
  { no: NO_SIDE_OPPONENTS[3] },
  { yes: YES_SIDE_OPPONENTS[3] },
  { no: NO_SIDE_OPPONENTS[4], yes: YES_SIDE_OPPONENTS[4] }
]

const formatWagerAmount = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)}K` : Math.round(value).toLocaleString()

const formatCurrencyAmount = (value: number) => `$${formatWagerAmount(value)}`

const OpponentBadgePill = ({ badge }: { badge?: OpponentBadge }) => {
  if (!badge) return null
  return <span className={`wager-ref-badge wager-ref-badge--${badge.toLowerCase()}`}>{badge}</span>
}

const OpponentIdentity = ({
  opponent,
  align = 'left'
}: {
  opponent: WagerOpponent
  align?: 'left' | 'right'
}) => (
  <span className={`wager-ref-person wager-ref-person--${align}`}>
    <img src={opponent.avatar} alt="" className="wager-ref-avatar" />
    <span className="wager-ref-person-copy">
      <span className="wager-ref-name-line">
        <strong>{opponent.username}</strong>
        <OpponentBadgePill badge={opponent.badge} />
      </span>
      <span>{formatWagerAmount(opponent.wagered)} wagered</span>
    </span>
  </span>
)

const WagerLiquidityPanel = ({
  wager,
  selectedOdds,
  fills,
  walletBalance,
  activeMode,
  onBack,
  onSelectSide,
  onExecuteTrade
}: WagerLiquidityPanelProps) => {
  const [buyAmount, setBuyAmount] = useState(25)
  const [customAmount, setCustomAmount] = useState('250')
  const [fillMode, setFillMode] = useState<'any' | 'specific'>('specific')
  const [selectedOpponentId, setSelectedOpponentId] = useState('yes-kassandra-750')
  const [fillRestriction, setFillRestriction] = useState<'partial' | 'full'>('partial')

  const isTrading = activeMode === 'long' || activeMode === 'short'
  const tradeSide = activeMode === 'long' ? 'yes' : activeMode === 'short' ? 'no' : null
  const yesOdds = selectedOdds
  const noOdds = 100 - selectedOdds
  const tradePrice = tradeSide === 'yes' ? yesOdds : noOdds
  const userSide = tradeSide === 'no' ? 'NO' : 'YES'
  const userStake = Math.max(0, Math.round(Number(customAmount) || 0))
  const selectedLineFills = useMemo(
    () => getSelectedLineFills(wager, fills, selectedOdds),
    [wager, fills, selectedOdds]
  )
  const selectedOpponent = ALL_WAGER_OPPONENTS.find((opponent) => opponent.id === selectedOpponentId) ?? YES_SIDE_OPPONENTS[1]
  const noWageredTotal = NO_SIDE_OPPONENTS.reduce((sum, opponent) => sum + opponent.wagered, 0)
  const yesWageredTotal = YES_SIDE_OPPONENTS.reduce((sum, opponent) => sum + opponent.wagered, 0)
  const maxOpponentWagered = Math.max(
    ...ALL_WAGER_OPPONENTS.map((opponent) => opponent.wagered),
    1
  )
  const potentialMultiplier = tradePrice > 0 ? (100 / tradePrice).toFixed(1) : '0.0'
  const usdPreview = Number(customAmount) || 0

  const handleCustomBuy = () => {
    const usd = userStake
    if (usd <= 0 || usd > walletBalance) return
    if (selectedOpponent.wagered <= 0) return
    onExecuteTrade({
      marketId: wager.id,
      marketName: wager.name,
      side: tradeSide ?? 'yes',
      usdAmount: usd,
      price: tradePrice
    })
    onBack()
  }

  if (isTrading && tradeSide) {
    return (
      <motion.div
        className="panel orderbook-panel wager-liquidity-panel wager-liquidity-panel--trading"
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 12 }}
      >
        <div className="wager-ref-shell">
          <div className="wager-ref-head">
            <div className="wager-ref-head-copy">
              <button type="button" className="wager-ref-back" onClick={onBack} aria-label="Back">
                <ArrowLeft size={18} />
              </button>
              <div>
                <div className="wager-ref-title">TRADE</div>
                <div className="wager-ref-line-label">SELECTED LINE</div>
                <div className="wager-ref-line-value">
                  {yesOdds}¢ YES <span>•</span> {noOdds}¢ NO
                </div>
              </div>
            </div>
            <div className="wager-ref-side-squares" role="group" aria-label="Wager side">
              <button
                type="button"
                className={`wager-ref-side-square wager-ref-side-square--yes${userSide === 'YES' ? ' active' : ''}`}
                onClick={() => onSelectSide?.('yes')}
              >
                Y
              </button>
              <button
                type="button"
                className={`wager-ref-side-square wager-ref-side-square--no${userSide === 'NO' ? ' active' : ''}`}
                onClick={() => onSelectSide?.('no')}
              >
                N
              </button>
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
              {WAGER_BOOK_ROWS.map((row, index) => {
                const noOpponent = row.no
                const yesOpponent = row.yes
                const noWidth = noOpponent ? Math.max(10, (noOpponent.wagered / maxOpponentWagered) * 100) : 0
                const yesWidth = yesOpponent ? Math.max(10, (yesOpponent.wagered / maxOpponentWagered) * 100) : 0
                const isNoSelected = fillMode === 'specific' && noOpponent && selectedOpponentId === noOpponent.id
                const isYesSelected = fillMode === 'specific' && yesOpponent && selectedOpponentId === yesOpponent.id

                return (
                  <div
                    key={`wager-book-row-${index}`}
                    className={`wager-ref-book-row${isNoSelected || isYesSelected ? ` is-selected is-selected--${userSide.toLowerCase()}` : ''}`}
                  >
                    {noOpponent ? (
                      <button
                        type="button"
                        className={`wager-ref-person-btn${isNoSelected ? ' active' : ''}`}
                        onClick={() => setSelectedOpponentId(noOpponent.id)}
                      >
                        <OpponentIdentity opponent={noOpponent} />
                      </button>
                    ) : (
                      <span className="wager-ref-empty-side wager-ref-empty-side--no">Waiting to be filled</span>
                    )}
                    {noOpponent ? (
                      <button
                        type="button"
                        className="wager-ref-bar-cell wager-ref-bar-cell--no"
                        onClick={() => setSelectedOpponentId(noOpponent.id)}
                        aria-label={`Select ${noOpponent.username}`}
                      >
                        <span style={{ width: `${noWidth}%` }} />
                      </button>
                    ) : (
                      <span className="wager-ref-bar-cell wager-ref-bar-cell--empty" />
                    )}
                    <span className="wager-ref-center-line" aria-hidden="true" />
                    <button
                      type="button"
                      className="wager-ref-bar-cell wager-ref-bar-cell--yes"
                      onClick={() => yesOpponent && setSelectedOpponentId(yesOpponent.id)}
                      aria-label={yesOpponent ? `Select ${yesOpponent.username}` : undefined}
                    >
                      {yesOpponent && <span style={{ width: `${yesWidth}%` }} />}
                    </button>
                    {yesOpponent ? (
                      <button
                        type="button"
                        className={`wager-ref-person-btn${isYesSelected ? ' active' : ''}`}
                        onClick={() => setSelectedOpponentId(yesOpponent.id)}
                      >
                        <OpponentIdentity opponent={yesOpponent} align="right" />
                      </button>
                    ) : (
                      <span className="wager-ref-empty-side wager-ref-empty-side--yes">Waiting to be filled</span>
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

          <div className="wager-ref-selected-fill">
            <div className="wager-ref-selected-label">SELECTED FILL</div>
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

          <div className="wager-ref-bottom-grid">
            <label className="wager-ref-amount-card" htmlFor="wager-buy-amount">
              <span>AMOUNT</span>
              <span className="wager-ref-amount-input-row">
                <input
                  id="wager-buy-amount"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  inputMode="decimal"
                />
                <span className="wager-ref-token-select">
                  <span className="wager-ref-token-icon">$</span>
                  USDC
                  <ChevronDown size={14} />
                </span>
              </span>
              <em>≈ {usdPreview.toFixed(2)} USD</em>
            </label>

            <div className="wager-ref-gain-card">
              <span>POTENTIAL GAIN</span>
              <strong>{potentialMultiplier}x</strong>
              <em>POTENTIAL RETURN</em>
            </div>
          </div>

          <button
            type="button"
            className="wager-ref-submit"
            onClick={handleCustomBuy}
          >
            Place order with {selectedOpponent.username}
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

  return (
    <motion.div
      className="panel orderbook-panel wager-liquidity-panel"
      initial={{ opacity: 0, scale: 0.98, y: -12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
    >
      <div className="panel-header orderbook-header orderbook-header--trades-only">
        <span className="orderbook-title">TRADE</span>
      </div>
      <div className="wager-liquidity-quick">
        <div className="wager-liquidity-quick-top">
          <div>
            <div className="wager-liquidity-quick-label">Fill at selected line</div>
            <div className="wager-liquidity-quick-odds">
              {selectedOdds}¢ YES · {100 - selectedOdds}¢ NO
            </div>
          </div>
          <TradeActions
            yesPrice={selectedOdds}
            noPrice={100 - selectedOdds}
            amountUsd={buyAmount}
            marketId={wager.id}
            marketName={wager.name}
            onExecuteTrade={onExecuteTrade}
          />
        </div>
        <div className="wager-trade-quick-row">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              className={`wager-trade-quick${buyAmount === a ? ' active' : ''}`}
              onClick={() => setBuyAmount(a)}
            >
              ${a}
            </button>
          ))}
        </div>
      </div>
      <div className="wager-liquidity-summary">
        <div className="wager-liquidity-summary-row">
          <span>Opponents</span>
          <span>
            {selectedLineFills.length} at selected line
          </span>
        </div>
        <div className="wager-liquidity-summary-row">
          <span>Wallet</span>
          <span>{formatCompactUsd(walletBalance)}</span>
        </div>
        <div className="wager-liquidity-summary-row">
          <span>Open lines</span>
          <span>{wager.openBets.length}</span>
        </div>
        <p className="wager-liquidity-summary-hint">
          Select an odds line on the left, then fill PVP wagers from this panel.
        </p>
      </div>
    </motion.div>
  )
}

export default WagerLiquidityPanel
