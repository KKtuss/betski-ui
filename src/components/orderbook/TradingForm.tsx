import { motion } from 'framer-motion'
import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowLeft, Wallet, Pen } from 'lucide-react'
import LockAnimation from '../shared/LockAnimation'
import type { TradingFormProps } from '../../types/orderbook'
import './TradingForm.css'

const COMPACT_UI = {
  pad: 8,
  gap: 6,
  heroIndex: 28,
  heroIndexLabel: 9,
  heroMain: 44,
  heroSub: 28,
  vs: 18,
  heroLabel: 9,
  time: 11,
  gridGap: 12,
  headerMt: 2,
  cardPad: 8,
  cardGap: 8,
  cardMt: 4,
  toggleFont: 11,
  togglePad: '5px 10px',
  metaFont: 10,
  amountLabel: 14,
  amountInput: 18,
  amountSuffix: 18,
  quickFont: 11,
  quickPad: '4px 0',
  walletFont: 10,
  walletPad: '3px 8px',
  walletIcon: 11,
  walletTop: -10,
  depthH: 14,
  depthGap: 4,
  depthVals: [64, 67] as const,
  actionPad: 4,
  actionGap: 8,
  btnH: 48,
  btnFont: 14,
  lockH: 48,
  backIcon: 16
}

const DEFAULT_UI = {
  pad: 16,
  gap: 16,
  heroIndex: 56,
  heroIndexLabel: 12,
  heroMain: 120,
  heroSub: 56,
  vs: 32,
  heroLabel: 12,
  time: 14,
  gridGap: 24,
  headerMt: 8,
  cardPad: 12,
  cardGap: 12,
  cardMt: 12,
  toggleFont: 13,
  togglePad: '8px 16px',
  metaFont: 12,
  amountLabel: 18,
  amountInput: 24,
  amountSuffix: 24,
  quickFont: 14,
  quickPad: '6px 0',
  walletFont: 11,
  walletPad: '4px 12px',
  walletIcon: 14,
  walletTop: -12,
  depthH: 24,
  depthGap: 6,
  depthVals: [64, 67, 68] as const,
  actionPad: 12,
  actionGap: 12,
  btnH: 72,
  btnFont: 18,
  lockH: 72,
  backIcon: 20
}

const TradingForm = ({
  mode,
  onBack,
  walletBalance,
  holdingShares,
  currentPrice,
  onTradeExecuted,
  compact = false
}: TradingFormProps) => {
  const ui = compact ? COMPACT_UI : DEFAULT_UI
  const [amount, setAmount] = useState<string>('0')
  const [isLocked, setIsLocked] = useState(false)
  const [buttonEffect, setButtonEffect] = useState(false)
  const [quickAmounts, setQuickAmounts] = useState(['10', '25', '50', '100'])
  const [isEditingAmounts, setIsEditingAmounts] = useState(false)
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy')
  const inputRef = useRef<HTMLInputElement>(null)

  const isLong = mode === 'long'
  const color = isLong ? '#2DD56E' : '#FF4D4D'
  const isSubmitDisabled = tradeAction === 'sell' && holdingShares <= 0

  useEffect(() => {
    if (isLocked) {
      const timer = setTimeout(() => {
        setButtonEffect(true)
      }, 750)
      return () => clearTimeout(timer)
    } else {
      setButtonEffect(false)
    }
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

  return (
    <div
      className={`trading-form${compact ? ' trading-form--compact' : ''}`}
      style={{
        width: '100%',
        height: '100%',
        padding: ui.pad,
        display: 'flex',
        flexDirection: 'column',
        gap: ui.gap,
        boxSizing: 'border-box',
        minHeight: 0,
        overflow: 'hidden'
      }}
    >
      <div
        className="trading-header"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: compact ? 0 : 4,
          flexShrink: 0
        }}
      >
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            background: 'transparent',
            border: 'none',
            color: '#d0d0d0',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex'
          }}
        >
          <ArrowLeft size={ui.backIcon} />
        </button>

        <div
          className="trading-vs-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'end',
            width: '100%',
            marginTop: ui.headerMt,
            fontFamily: 'Roboto Mono, monospace',
            columnGap: ui.gridGap
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: ui.heroIndex, fontWeight: '800', color: '#eaeaea', lineHeight: '1', textShadow: '0 0 8px rgba(255,255,255,0.15)' }}>2x</span>
            <span style={{ fontSize: ui.heroIndexLabel, fontWeight: '700', letterSpacing: '1px', color: '#aaaaaa', marginTop: '2px', transform: compact ? 'translateX(-4px)' : 'translateX(-8px)' }}>INDEX</span>
          </div>
          <span
            style={{
              fontSize: ui.vs,
              fontWeight: '900',
              fontStyle: 'italic',
              background: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
              display: 'inline-block'
            }}
          >
            VS
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', transform: compact ? 'translateY(2px)' : 'translateY(5px)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span
                style={{
                  fontSize: ui.heroMain,
                  fontWeight: '900',
                  color: '#fff',
                  textShadow: compact ? '0 0 16px rgba(255,255,255,0.55)' : '0 0 30px rgba(255,255,255,0.9), 0 0 60px rgba(255,255,255,0.5)',
                  lineHeight: '1'
                }}
              >
                7
              </span>
              <span style={{ fontSize: ui.heroSub, fontWeight: '800', color: '#fff', marginLeft: '2px', lineHeight: '1' }}>x</span>
            </div>
            <span style={{ fontSize: ui.heroLabel, fontWeight: '700', letterSpacing: '1px', color: '#aaaaaa', marginTop: '2px', transform: compact ? 'translate(8px, -2px)' : 'translate(13px, -3px)' }}>BETSKI</span>
          </div>
        </div>
        <div style={{ fontSize: ui.time, color: '#a0a0a0', marginTop: '2px', fontFamily: 'Roboto Mono, monospace' }}>
          TIME LEFT: 36h 18m 56s
        </div>
      </div>

      <div
        className="trading-input-card"
        style={{
          background: '#0B0B0C',
          borderRadius: compact ? '10px' : '12px',
          padding: ui.cardPad,
          display: 'flex',
          flexDirection: 'column',
          gap: ui.cardGap,
          border: '1px solid rgba(255, 255, 255, 0.05)',
          marginTop: ui.cardMt,
          position: 'relative',
          flexShrink: 0
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: ui.walletTop,
            right: '10px',
            background: '#111',
            padding: ui.walletPad,
            borderRadius: '10px',
            fontSize: ui.walletFont,
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            zIndex: 10
          }}
        >
          <span style={{ fontWeight: '600' }}>{walletBalance.toLocaleString()} $</span>
          <Wallet size={ui.walletIcon} color="#888" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '0 2px' }}>
          <div style={{ display: 'flex', gap: '6px', padding: '2px' }}>
            <button
              type="button"
              onClick={() => setTradeAction('buy')}
              className={tradeAction === 'buy' ? 'active long' : ''}
              style={{
                background: tradeAction === 'buy' ? 'rgba(45, 213, 110, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: tradeAction === 'buy' ? '1px solid rgba(45, 213, 110, 0.2)' : '1px solid transparent',
                borderRadius: '6px',
                color: tradeAction === 'buy' ? '#2DD56E' : '#777',
                fontSize: ui.toggleFont,
                fontWeight: '800',
                padding: ui.togglePad,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              BUY
            </button>
            <button
              type="button"
              onClick={() => setTradeAction('sell')}
              className={tradeAction === 'sell' ? 'active short' : ''}
              style={{
                background: tradeAction === 'sell' ? 'rgba(255, 77, 77, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: tradeAction === 'sell' ? '1px solid rgba(255, 77, 77, 0.2)' : '1px solid transparent',
                borderRadius: '6px',
                color: tradeAction === 'sell' ? '#FF4D4D' : '#777',
                fontSize: ui.toggleFont,
                fontWeight: '800',
                padding: ui.togglePad,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              SELL
            </button>
          </div>
          <div style={{ color: '#777', fontSize: ui.metaFont, fontWeight: '700', fontFamily: 'Roboto Mono, monospace' }}>
            {tradeAction === 'sell' ? `${holdingShares.toFixed(4)} SHARES` : `$${currentPrice.toFixed(2)}`}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 2px', width: '100%' }}>
          <span style={{ fontSize: ui.amountLabel, fontWeight: '600', color: '#666', fontFamily: 'Roboto Mono, monospace' }}>{tradeAction === 'sell' ? 'PERCENT' : 'AMOUNT'}</span>
          <input
            ref={inputRef}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={tradeAction === 'sell' ? 0 : undefined}
            max={tradeAction === 'sell' ? 100 : undefined}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: ui.amountInput,
              fontWeight: '700',
              textAlign: 'left',
              width: compact ? '88px' : '120px',
              outline: 'none',
              fontFamily: 'Roboto Mono, monospace',
              WebkitAppearance: 'none',
              MozAppearance: 'textfield'
            }}
          />
          <style>{`
            input[type=number]::-webkit-inner-spin-button,
            input[type=number]::-webkit-outer-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
          `}</style>
          <span style={{ fontSize: ui.amountSuffix, fontWeight: '700', color: '#666', marginLeft: 'auto' }}>{tradeAction === 'sell' ? '%' : '$'}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px' }}>
          {(tradeAction === 'sell' ? ['10', '25', '50', '100'] : quickAmounts).map((val, index) =>
            tradeAction === 'buy' && isEditingAmounts ? (
              <input
                key={index}
                type="number"
                value={val}
                onChange={(e) => {
                  const newAmounts = [...quickAmounts]
                  newAmounts[index] = e.target.value
                  setQuickAmounts(newAmounts)
                }}
                style={{
                  background: '#252525',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  padding: ui.quickPad,
                  color: '#fff',
                  fontSize: ui.quickFont,
                  fontWeight: '700',
                  textAlign: 'center',
                  width: '100%',
                  outline: 'none',
                  fontFamily: 'Roboto Mono, monospace'
                }}
              />
            ) : (
              <button
                key={index}
                onClick={() => setAmount(val)}
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  padding: ui.quickPad,
                  color: '#fff',
                  fontSize: ui.quickFont,
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {tradeAction === 'sell' ? `${val}%` : val}
              </button>
            )
          )}
          {tradeAction === 'buy' && (
            <button
              onClick={() => setIsEditingAmounts(!isEditingAmounts)}
              style={{
                background: isEditingAmounts ? '#333' : '#1a1a1a',
                border: `1px solid ${isEditingAmounts ? '#666' : '#333'}`,
                borderRadius: '4px',
                padding: ui.quickPad,
                color: '#fff',
                fontSize: compact ? 10 : 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Pen size={compact ? 10 : 12} />
            </button>
          )}
        </div>
      </div>

      {tradeAction === 'buy' && (
        <div className="trading-depth-bars" style={{ display: 'flex', flexDirection: 'column', gap: ui.depthGap, marginTop: '2px', flex: '1 1 auto', minHeight: 0, justifyContent: 'center' }}>
          {ui.depthVals.map((val, i) => (
            <div
              key={i}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.03)',
                height: ui.depthH,
                borderRadius: '4px',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0
              }}
            >
              <div
                style={{
                  width: `${val}%`,
                  height: '100%',
                  background: mode === 'long' ? 'rgba(45, 213, 110, 0.25)' : 'rgba(255, 77, 77, 0.25)',
                  borderRight: `2px solid ${mode === 'long' ? '#2DD56E' : '#FF4D4D'}`,
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: i === ui.depthVals.length - 1 ? '75%' : '100%',
                    height: '100%',
                    backgroundImage: `repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 4px,
                    ${mode === 'long' ? 'rgba(45, 213, 110, 0.15)' : 'rgba(255, 77, 77, 0.15)'} 4px,
                    ${mode === 'long' ? 'rgba(45, 213, 110, 0.15)' : 'rgba(255, 77, 77, 0.15)'} 8px
                  )`
                  }}
                />
              </div>
              <span
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: compact ? 9 : 11,
                  color: '#666',
                  fontFamily: 'Roboto Mono, monospace'
                }}
              >
                {val}%
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="trading-actions" style={{ marginTop: 'auto', paddingTop: ui.actionPad, display: 'flex', gap: ui.actionGap, alignItems: 'center', flexShrink: 0 }}>
        <motion.button
          onClick={handlePlaceOrder}
          disabled={isSubmitDisabled}
          style={{
            width: '80%',
            height: ui.btnH,
            padding: '0 12px',
            background: color,
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: ui.btnFont,
            fontWeight: '600',
            cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
            opacity: isSubmitDisabled ? 0.55 : 1,
            boxShadow: `0 8px 24px ${color}60`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          whileTap={{ scale: 0.98 }}
          animate={
            buttonEffect
              ? {
                  x: [0, -3, 3, -3, 3, 0],
                  scale: [1, 1.05, 1],
                  boxShadow: [`0 8px 24px ${color}60`, `0 8px 40px ${color}90`, `0 8px 24px ${color}60`]
                }
              : {
                  x: 0,
                  scale: 1,
                  boxShadow: `0 8px 24px ${color}60`
                }
          }
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {tradeAction === 'buy' ? 'Buy' : 'Sell'} {isLong ? 'Long' : 'Short'}
        </motion.button>

        <div
          style={{
            flex: 1,
            height: ui.lockH,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        >
          <LockAnimation isLocked={isLocked} mode={mode} onAnimationComplete={handleAnimationComplete} />
        </div>
      </div>
    </div>
  )
}

export default TradingForm
