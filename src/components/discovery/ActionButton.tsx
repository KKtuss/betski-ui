import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ActionButton = ({ type, price, amountUsd, onTrade }: { type: 'yes' | 'no', price: number, amountUsd: number, onTrade: (type: 'yes' | 'no', price: number, amountUsd: number) => void }) => {
  const [ripples, setRipples] = useState<{ id: number }[]>([])
  
  const handleClick = () => {
    setRipples(prev => [...prev, { id: Date.now() }])
    onTrade(type, price, amountUsd)
  }

  return (
    <motion.button 
      className={`discovery-action-btn ${type}`} 
      title={`${type === 'yes' ? 'Long (Yes)' : 'Short (No)'} • $${amountUsd}`}
      onClick={handleClick}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      style={{ position: 'relative', overflow: 'visible' }}
    >
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.div
            key={ripple.id}
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              borderRadius: '4px',
              border: `2px solid ${type === 'yes' ? '#2DD56E' : '#FF4D4D'}`,
              pointerEvents: 'none',
              zIndex: 0
            }}
            onAnimationComplete={() => setRipples(prev => prev.filter(r => r.id !== ripple.id))}
          />
        ))}
      </AnimatePresence>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="discovery-action-letter">{type === 'yes' ? 'Y' : 'N'}</span>
      </div>
    </motion.button>
  )
}

export default ActionButton
