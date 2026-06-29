import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const LockAnimation = ({
  isLocked,
  mode,
  accentColor,
  onAnimationComplete
}: {
  isLocked: boolean
  mode: 'long' | 'short'
  accentColor?: string
  onAnimationComplete?: () => void
}) => {
  const [frame, setFrame] = useState(0)
  const [triggerEffect, setTriggerEffect] = useState(false)
  const color = accentColor ?? (mode === 'long' ? '#2DD56E' : '#FF4D4D')

  useEffect(() => {
    if (isLocked) {
      setTriggerEffect(false)
      const interval = setInterval(() => {
        setFrame((prev) => {
          if (prev === 25) setTriggerEffect(true)
          if (prev === 53) onAnimationComplete?.()
          if (prev >= 59) {
            clearInterval(interval)
            return 59
          }
          return prev + 1
        })
      }, 30)
      return () => clearInterval(interval)
    }
    setFrame(0)
    setTriggerEffect(false)
  }, [isLocked, onAnimationComplete])

  const lockColor = mode === 'long' ? 'green' : 'red'
  const imageUrl = isLocked
    ? `/assets/lock/${mode === 'long' ? 'green/sequence' : 'sequence'}/lock ${lockColor}_${Math.min(frame, 59).toString().padStart(5, '0')}.png`
    : `/assets/lock/${mode === 'long' ? 'green/lock_open.png' : 'lock_open.png'}`

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <AnimatePresence>
        {triggerEffect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: `radial-gradient(circle at center, ${color}26 0%, transparent 70%)`,
              pointerEvents: 'none',
              zIndex: 1000
            }}
          />
        )}
      </AnimatePresence>
      <motion.img
        src={imageUrl}
        alt="Lock"
        style={{
          height: '100%',
          objectFit: 'contain',
          filter: `drop-shadow(0 0 6px ${color}55)`
        }}
        animate={
          triggerEffect
            ? {
                scale: [1.15, 1.25, 1.15],
                x: [0, -3, 3, -3, 3, 0],
                filter: [
                  `drop-shadow(0 0 6px ${color}55)`,
                  `drop-shadow(0 0 22px ${color})`,
                  `drop-shadow(0 0 6px ${color}55)`
                ]
              }
            : {
                scale: 1.12,
                x: 0,
                filter: `drop-shadow(0 0 8px ${color}66)`
              }
        }
        transition={{
          duration: 0.5,
          ease: 'easeInOut'
        }}
      />
    </div>
  )
}

export default LockAnimation
