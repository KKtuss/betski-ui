import { motion } from 'framer-motion'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { ArrowLeft, ChevronDown, Info } from 'lucide-react'
import LockAnimation from '../shared/LockAnimation'
import { formatCompactUsd } from '../../utils/formatCompact'
import type { TradingFormProps } from '../../types/orderbook'
import './TradingForm.css'

const QUICK_AMOUNTS = ['10', '25', '50', '100']

const formatCents = (price: number) => `${(price * 100).toFixed(1)}¢`
const formatUsd = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const TradingForm = ({
  mode,
  onBack,
  walletBalance,
  holdingShares,
  currentPrice,
  marketTitle = 'Market',
  volume24h = 21400,
  priceChange24h = 0,
  avgEntry,
  onTradeExecuted,
  compact = false
}: TradingFormProps) => {
  const [amount, setAmount] = useState<string>('250')
  const [isLocked, setIsLocked] = useState(false)
  const [buttonEffect, setButtonEffect] = useState(false)
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy')

  const isLong = mode === 'long'
  const accentColor = isLong ? '#2DD56E' : '#FF4D4D'
  const sideLabel = isLong ? 'YES' : 'NO'
  const isSubmitDisabled = tradeAction === 'sell' && holdingShares <= 0

  useEffect(() => {
    if (isLocked) {
      const timer = setTimeout(() => setButtonEffect(true), 750)
      return () => clearTimeout(timer)
    }
    setButtonEffect(false)
  }, [isLocked])

  const handleAnimationComplete = useCallback(() => {
    onBack()
  }, [onBack])

  const handlePlaceOrder = () => {
    if (isLocked) return
    if (tradeAction === 'buy') {
      const usdAmount = parseFloat(amount)
      if (Number.isNaN(usdAmount) || usdAmount <= 0) return
      if (usdAmount > walletBalance) return
      const sharesAmount = usdAmount / currentPrice
      onTradeExecuted?.({ side: mode, action: 'buy', usdAmount, sharesAmount, price: currentPrice })
    } else {
      const percent = parseFloat(amount)
      if (Number.isNaN(percent) || percent <= 0) return
      const clamped = Math.max(0, Math.min(100, percent))
      const sharesAmount = (holdingShares * clamped) / 100
      if (sharesAmount <= 0) return
      const usdAmount = sharesAmount * currentPrice
      onTradeExecuted?.({ side: mode, action: 'sell', usdAmount, sharesAmount, price: currentPrice })
    }
    setIsLocked(true)
  }

  const tradeMetrics = useMemo(() => {
    if (tradeAction === 'sell') {
      const percent = Math.max(0, Math.min(100, parseFloat(amount) || 0))
      const sharesSold = (holdingShares * percent) / 100
      const usdProceeds = sharesSold * currentPrice
      const fees = usdProceeds * 0.0014
      return {
        shares: sharesSold,
        fees,
        estReturn: usdProceeds,
        estProfit: usdProceeds - fees,
        profitPct: 0,
        positionAfter: Math.max(0, holdingShares - sharesSold),
        avgEntryDisplay: avgEntry ?? currentPrice,
        unrealizedPnl: 0,
        unrealizedPct: 0
      }
    }

    const usdAmount = Math.max(0, parseFloat(amount) || 0)
    const sharesReceive = currentPrice > 0 ? usdAmount / currentPrice : 0
    const fees = usdAmount * 0.0014
    const estReturn = sharesReceive
    const estProfit = estReturn - usdAmount - fees
    const profitPct = usdAmount > 0 ? (estProfit / usdAmount) * 100 : 0
    const positionAfter = holdingShares + sharesReceive
    const prevAvg = avgEntry ?? currentPrice
    const avgEntryAfter =
      holdingShares > 0
        ? (prevAvg * holdingShares + currentPrice * sharesReceive) / positionAfter
        : currentPrice
    const markValue = positionAfter * currentPrice
    const costBasis = holdingShares > 0 ? holdingShares * prevAvg + usdAmount : usdAmount
    const unrealizedPnl = markValue - costBasis
    const unrealizedPct = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0

    return {
      shares: sharesReceive,
      fees,
      estReturn,
      estProfit,
      profitPct,
      positionAfter,
      avgEntryDisplay: avgEntryAfter,
      unrealizedPnl,
      unrealizedPct
    }
  }, [amount, avgEntry, currentPrice, holdingShares, tradeAction])

  const changeLabel = `${priceChange24h >= 0 ? '+' : ''}${priceChange24h.toFixed(1)}%`
  const assetLine = `${sideLabel} on '${marketTitle}'`
  const submitLabel =
    tradeAction === 'buy'
      ? `Review Buy ${sideLabel}`
      : `Review Sell ${sideLabel}`

  return (
    <div
      className={`trading-form trading-form--${mode}${compact ? ' trading-form--compact' : ''}`}
    >
      <header className="trading-form__header">
        <button type="button" className="betski-back trading-form__back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h2 className="trading-form__title">TRADE</h2>
      </header>

      <div className="trading-form__scroll">
        <div className="trading-form__toggle">
          <button
            type="button"
            className={`trading-form__toggle-btn trading-form__toggle-btn--buy${tradeAction === 'buy' ? ' trading-form__toggle-btn--active' : ''}`}
            onClick={() => setTradeAction('buy')}
          >
            Buy
          </button>
          <button
            type="button"
            className={`trading-form__toggle-btn trading-form__toggle-btn--sell${tradeAction === 'sell' ? ' trading-form__toggle-btn--active' : ''}`}
            onClick={() => setTradeAction('sell')}
          >
            Sell
          </button>
        </div>

        <div className="trading-form__asset">
          <span className="trading-form__side-badge">{sideLabel}</span>
          <span className="trading-form__asset-title">{assetLine}</span>
          <span className="trading-form__asset-price">{formatCents(currentPrice)}</span>
        </div>

        <div className="trading-form__stats">
          <div className="trading-form__stat">
            <span className="trading-form__stat-label">Market price</span>
            <span className="trading-form__stat-value">{formatCents(currentPrice)}</span>
          </div>
          <div className="trading-form__stat">
            <span className="trading-form__stat-label">24h change</span>
            <span
              className={`trading-form__stat-value ${priceChange24h >= 0 ? 'trading-form__stat-value--up' : 'trading-form__stat-value--down'}`}
            >
              {changeLabel}
            </span>
          </div>
          <div className="trading-form__stat">
            <span className="trading-form__stat-label">24h volume</span>
            <span className="trading-form__stat-value">{formatCompactUsd(volume24h)}</span>
          </div>
        </div>

        <div className="trading-form__amount">
          <div className="trading-form__amount-head">
            <span className="trading-form__amount-label">
              {tradeAction === 'sell' ? 'PERCENT' : 'AMOUNT'}
            </span>
            <span className="trading-form__balance">
              BALANCE <strong>{formatUsd(walletBalance)}</strong>
            </span>
          </div>

          <div className="trading-form__amount-row">
            <span className="trading-form__amount-prefix">
              {tradeAction === 'sell' ? '%' : '$'}
            </span>
            <input
              type="number"
              className="trading-form__amount-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={tradeAction === 'sell' ? 0 : undefined}
              max={tradeAction === 'sell' ? 100 : undefined}
            />
            {tradeAction === 'buy' && (
              <span className="trading-form__currency">
                USD
                <ChevronDown size={12} />
              </span>
            )}
          </div>

          <div className="trading-form__quick-row">
            {(tradeAction === 'sell' ? ['10', '25', '50', '100'] : QUICK_AMOUNTS).map((val) => (
              <button
                key={val}
                type="button"
                className="trading-form__quick-btn"
                onClick={() => setAmount(val)}
              >
                {tradeAction === 'sell' ? `${val}%` : `$${val}`}
              </button>
            ))}
            {tradeAction === 'buy' && (
              <button
                type="button"
                className="trading-form__quick-btn"
                onClick={() => setAmount(String(Math.floor(walletBalance)))}
              >
                Max
              </button>
            )}
          </div>
        </div>

        <div className="trading-form__card">
          <div className="trading-form__row">
            <span>You receive</span>
            <strong>
              {tradeMetrics.shares.toFixed(2)} {sideLabel}
            </strong>
          </div>
          <div className="trading-form__row">
            <span>Avg. price</span>
            <strong>{formatCents(currentPrice)}</strong>
          </div>
          <div className="trading-form__row">
            <span className="trading-form__row-label">
              Fees
              <Info size={11} />
            </span>
            <strong>{formatUsd(tradeMetrics.fees)}</strong>
          </div>
          <div className="trading-form__row">
            <span>Est. return (if {sideLabel})</span>
            <strong>{formatUsd(tradeMetrics.estReturn)}</strong>
          </div>
          <div className="trading-form__row trading-form__row--profit">
            <span>Est. profit</span>
            <strong>
              {formatUsd(tradeMetrics.estProfit)} ({tradeMetrics.profitPct.toFixed(0)}%)
            </strong>
          </div>
        </div>

        <div className="trading-form__card">
          <div className="trading-form__row">
            <span>Position after trade</span>
            <strong>
              {tradeMetrics.positionAfter.toFixed(2)} {sideLabel}
            </strong>
          </div>
          <div className="trading-form__row">
            <span>Avg. entry</span>
            <strong>{formatCents(tradeMetrics.avgEntryDisplay)}</strong>
          </div>
          <div className="trading-form__row trading-form__row--profit">
            <span className="trading-form__row-label">
              Unrealized P&amp;L
              <Info size={11} />
            </span>
            <strong>
              {tradeMetrics.unrealizedPnl >= 0 ? '+' : ''}
              {formatUsd(tradeMetrics.unrealizedPnl)} ({tradeMetrics.unrealizedPct.toFixed(1)}%)
            </strong>
          </div>
        </div>
      </div>

      <div className="trading-form__footer">
        <motion.button
          type="button"
          className="trading-form__submit"
          onClick={handlePlaceOrder}
          disabled={isSubmitDisabled}
          whileTap={{ scale: 0.98 }}
          animate={
            buttonEffect
              ? {
                  x: [0, -3, 3, -3, 3, 0],
                  scale: [1, 1.03, 1]
                }
              : { x: 0, scale: 1 }
          }
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {submitLabel}
        </motion.button>

        <div className="trading-form__lock">
          <LockAnimation
            isLocked={isLocked}
            mode={mode}
            accentColor={accentColor}
            onAnimationComplete={handleAnimationComplete}
          />
        </div>
      </div>
    </div>
  )
}

export default TradingForm
