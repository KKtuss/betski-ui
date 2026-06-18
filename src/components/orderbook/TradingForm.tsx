import { motion } from 'framer-motion'
import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowLeft, Wallet, Pen } from 'lucide-react'
import LockAnimation from '../shared/LockAnimation'
import type { TradingFormProps } from '../../types/orderbook'

const TradingForm = ({ mode, onBack, walletBalance, holdingShares, currentPrice, onTradeExecuted }: TradingFormProps) => {
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

  // Sync button effect with lock animation timing (approx 0.75s delay)
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
    // Immediate close after animation finishes
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
    <div className="trading-form" style={{ width: '100%', height: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}>
      {/* Header Section */}
      <div className="trading-header" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4px' }}>
        <button 
          onClick={onBack}
          style={{ position: 'absolute', left: 0, top: 0, background: 'transparent', border: 'none', color: '#d0d0d0', cursor: 'pointer', padding: '4px', display: 'flex' }}
        >
          <ArrowLeft size={20} />
        </button>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'end', width: '100%', marginTop: '8px', fontFamily: 'Roboto Mono, monospace', columnGap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '56px', fontWeight: '800', color: '#eaeaea', lineHeight: '1', textShadow: '0 0 8px rgba(255,255,255,0.15)' }}>2x</span>
            <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1px', color: '#aaaaaa', marginTop: '4px', transform: 'translateX(-8px)' }}>INDEX</span>
          </div>
          <span style={{ 
            fontSize: '32px', 
            fontWeight: '900', 
            fontStyle: 'italic', 
            background: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
            display: 'inline-block',
            textShadow: '0 0 12px rgba(238, 9, 121, 0.3)'
          }}>VS</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', transform: 'translateY(5px)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ 
                fontSize: '120px', 
                fontWeight: '900', 
                color: '#fff',
                textShadow: '0 0 30px rgba(255,255,255,0.9), 0 0 60px rgba(255,255,255,0.5)',
                lineHeight: '1'
              }}>7</span>
              <span style={{ fontSize: '56px', fontWeight: '800', color: '#fff', marginLeft: '2px', textShadow: '0 0 18px rgba(255,255,255,0.6)', lineHeight: '1' }}>x</span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1px', color: '#aaaaaa', marginTop: '4px', transform: 'translate(13px, -3px)' }}>BETSKI</span>
          </div>
        </div>
        <div style={{ fontSize: '14px', color: '#a0a0a0', marginTop: '4px', fontFamily: 'Roboto Mono, monospace' }}>
          TIME LEFT: 36h 18m 56s
        </div>
      </div>

      {/* Input Section */}
      <div style={{ 
        background: '#0B0B0C',
        borderRadius: '12px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        marginTop: '12px',
        position: 'relative'
      }}>
        {/* Wallet Balance Pill */}
        <div style={{ 
          position: 'absolute', 
          top: '-12px', 
          right: '12px', 
          background: '#111', 
          padding: '4px 12px', 
          borderRadius: '12px', 
          fontSize: '11px', 
          border: '1px solid rgba(255,255,255,0.1)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
          color: '#fff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          zIndex: 10
        }}>
          <span style={{ fontWeight: '600' }}>{walletBalance.toLocaleString()} $</span>
          <Wallet size={14} color="#888" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '0 4px' }}>
            <div style={{ display: 'flex', gap: '8px', padding: '2px' }}>
              <button
                type="button"
                onClick={() => setTradeAction('buy')}
                className={tradeAction === 'buy' ? 'active long' : ''}
                style={{
                  background: tradeAction === 'buy' ? 'rgba(45, 213, 110, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: tradeAction === 'buy' ? '1px solid rgba(45, 213, 110, 0.2)' : '1px solid transparent',
                  borderRadius: '8px',
                  color: tradeAction === 'buy' ? '#2DD56E' : '#777',
                  fontSize: '13px',
                  fontWeight: '800',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  boxShadow: tradeAction === 'buy' ? '0 0 12px rgba(45, 213, 110, 0.1)' : 'none',
                  transition: 'all 0.2s ease'
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
                  borderRadius: '8px',
                  color: tradeAction === 'sell' ? '#FF4D4D' : '#777',
                  fontSize: '13px',
                  fontWeight: '800',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  boxShadow: tradeAction === 'sell' ? '0 0 12px rgba(255, 77, 77, 0.1)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                SELL
              </button>
            </div>
            <div style={{ color: '#777', fontSize: '12px', fontWeight: '700', fontFamily: 'Roboto Mono, monospace' }}>
              {tradeAction === 'sell' ? `${holdingShares.toFixed(4)} SHARES` : `$${currentPrice.toFixed(2)}`}
            </div>
          </div>

        {/* Amount Input Row */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          background: 'transparent',
          padding: '0 4px',
          width: '100%'
        }}>
          <span style={{ fontSize: '18px', fontWeight: '600', color: '#666', fontFamily: 'Roboto Mono, monospace' }}>{tradeAction === 'sell' ? 'PERCENT' : 'AMOUNT'}</span>
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
              fontSize: '24px',
              fontWeight: '700',
              textAlign: 'left',
              width: '120px',
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
          <span style={{ fontSize: '24px', fontWeight: '700', color: '#666', marginLeft: 'auto' }}>{tradeAction === 'sell' ? '%' : '$'}</span>
        </div>

        {/* Quick Buttons Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(5, 1fr)', 
          gap: '4px' 
        }}>
          {(tradeAction === 'sell' ? ['10', '25', '50', '100'] : quickAmounts).map((val, index) => (
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
                  padding: '6px 0',
                  color: '#fff',
                  fontSize: '14px',
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
                  padding: '6px 0',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#252525'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#1a1a1a'}
              >
                {tradeAction === 'sell' ? `${val}%` : val}
              </button>
            )
          ))}
          {tradeAction === 'buy' && (
            <button 
              onClick={() => setIsEditingAmounts(!isEditingAmounts)}
              style={{ 
                background: isEditingAmounts ? '#333' : '#1a1a1a',
                border: `1px solid ${isEditingAmounts ? '#666' : '#333'}`,
                borderRadius: '4px',
                padding: '6px 0',
                color: '#fff',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <Pen size={12} />
            </button>
          )}
        </div>
      </div>

      {tradeAction === 'buy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px', flex: 1 }}>
          {[64, 67, 68].map((val, i) => (
            <div key={i} style={{ 
              width: '100%', 
              background: 'rgba(255,255,255,0.03)', 
              height: '24px', 
              borderRadius: '4px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: `${val}%`, 
                height: '100%', 
                background: mode === 'long' ? 'rgba(45, 213, 110, 0.25)' : 'rgba(255, 77, 77, 0.25)',
                borderRight: `2px solid ${mode === 'long' ? '#2DD56E' : '#FF4D4D'}`,
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: i === 2 ? '75%' : '100%',
                  height: '100%',
                  backgroundImage: `repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 4px,
                    ${mode === 'long' ? 'rgba(45, 213, 110, 0.15)' : 'rgba(255, 77, 77, 0.15)'} 4px,
                    ${mode === 'long' ? 'rgba(45, 213, 110, 0.15)' : 'rgba(255, 77, 77, 0.15)'} 8px
                  )`
                }} />
              </div>
              
              <span style={{ 
                position: 'absolute', 
                right: '8px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                fontSize: '11px', 
                color: '#666', 
                fontFamily: 'Roboto Mono, monospace' 
              }}>
                {val}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Action */}
      <div style={{ marginTop: 'auto', paddingTop: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <motion.button
          onClick={handlePlaceOrder}
          disabled={isSubmitDisabled}
          style={{
            width: '80%',
            height: '72px',
            padding: '0 14px',
            background: color,
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '18px',
            fontWeight: '600',
            cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
            opacity: isSubmitDisabled ? 0.55 : 1,
            boxShadow: `0 8px 24px ${color}60`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          whileTap={{ scale: 0.98 }}
          animate={buttonEffect ? {
            x: [0, -3, 3, -3, 3, 0],
            scale: [1, 1.05, 1],
            boxShadow: [
              `0 8px 24px ${color}60`,
              `0 8px 40px ${color}90`,
              `0 8px 24px ${color}60`
            ]
          } : {
            x: 0,
            scale: 1,
            boxShadow: `0 8px 24px ${color}60`
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {tradeAction === 'buy' ? 'Buy' : 'Sell'} {isLong ? 'Long' : 'Short'}
        </motion.button>
        
        <div style={{ 
          flex: 1, 
          height: '72px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <LockAnimation 
            isLocked={isLocked} 
            mode={mode} 
            onAnimationComplete={handleAnimationComplete}
          />
        </div>
      </div>
    </div>
  )
}

export default TradingForm
