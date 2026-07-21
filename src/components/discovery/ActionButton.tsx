import { useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDown, ArrowUp } from 'lucide-react'

export type ActionLabelStyle = 'yn' | 'arrows'

const ActionButton = ({
  type,
  price,
  amountUsd,
  onTrade,
  labelStyle = 'yn'
}: {
  type: 'yes' | 'no'
  price: number
  amountUsd: number
  onTrade: (type: 'yes' | 'no', price: number, amountUsd: number) => void
  /** Wagers: Y/N. Markets: ↑ / ↓. */
  labelStyle?: ActionLabelStyle
}) => {
  const [ripples, setRipples] = useState<{ id: number }[]>([])
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const movedTooFar = useRef(false)
  const isYes = type === 'yes'
  const label =
    labelStyle === 'arrows' ? (isYes ? 'Long' : 'Short') : isYes ? 'Yes' : 'No'

  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    pointerStart.current = { x: e.clientX, y: e.clientY }
    movedTooFar.current = false
  }

  const handlePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!pointerStart.current || movedTooFar.current) return
    const dx = e.clientX - pointerStart.current.x
    const dy = e.clientY - pointerStart.current.y
    if (dx * dx + dy * dy > 64) {
      // ~8px — treat as scroll/drag, not a tap
      movedTooFar.current = true
    }
  }

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (movedTooFar.current) {
      movedTooFar.current = false
      pointerStart.current = null
      return
    }
    pointerStart.current = null
    setRipples((prev) => [...prev, { id: Date.now() }])
    onTrade(type, price, amountUsd)
    // Drop sticky :hover/:focus on touch so the pill doesn't look "selected".
    e.currentTarget.blur()
  }

  return (
    <motion.button
      type="button"
      className={`discovery-action-btn ${type}`}
      title={`${label} • $${amountUsd}`}
      aria-label={`${label} $${amountUsd}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerCancel={() => {
        movedTooFar.current = true
      }}
      onClick={handleClick}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.div
            key={ripple.id}
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 'inherit',
              border: `2px solid ${isYes ? '#2DD56E' : '#FF4D4D'}`,
              pointerEvents: 'none',
              zIndex: 0
            }}
            onAnimationComplete={() => setRipples((prev) => prev.filter((r) => r.id !== ripple.id))}
          />
        ))}
      </AnimatePresence>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {labelStyle === 'arrows' ? (
          isYes ? (
            <ArrowUp className="discovery-action-icon" strokeWidth={2.6} aria-hidden />
          ) : (
            <ArrowDown className="discovery-action-icon" strokeWidth={2.6} aria-hidden />
          )
        ) : (
          <span className="discovery-action-letter">{isYes ? 'Y' : 'N'}</span>
        )}
      </div>
    </motion.button>
  )
}

export default ActionButton
