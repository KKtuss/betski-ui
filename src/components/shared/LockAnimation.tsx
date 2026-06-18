import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const LockAnimation = ({ isLocked, mode, onAnimationComplete }: { isLocked: boolean, mode: 'long' | 'short', onAnimationComplete?: () => void }) => {
  const [frame, setFrame] = useState(0)
  const [triggerEffect, setTriggerEffect] = useState(false)

  useEffect(() => {
    if (isLocked) {
      setTriggerEffect(false)
      const interval = setInterval(() => {
        setFrame(prev => {
          // Trigger effect around frame 25 (approx 0.75s: 25 * 30ms)
          if (prev === 25) setTriggerEffect(true)
          
          // Trigger close early around frame 53 (approx 200ms before end: 6 frames * 30ms = 180ms)
          if (prev === 53) onAnimationComplete?.()

          if (prev >= 59) {
            clearInterval(interval)
            return 59
          }
          return prev + 1
        })
      }, 30) // ~33fps
      return () => clearInterval(interval)
    } else {
      setFrame(0)
      setTriggerEffect(false)
    }
  }, [isLocked])

  // Removed frame 59 check since we trigger early now
  // useEffect(() => {
  //   if (frame === 59 && isLocked) {
  //     onAnimationComplete?.()
  //   }
  // }, [frame])

  const color = mode === 'long' ? 'green' : 'red'
  const imageUrl = isLocked 
    ? `/assets/lock/${mode === 'long' ? 'green/sequence' : 'sequence'}/lock ${color}_${Math.min(frame, 59).toString().padStart(5, '0')}.png`
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
              background: `radial-gradient(circle at center, ${mode === 'long' ? 'rgba(45, 213, 110, 0.15)' : 'rgba(255, 77, 77, 0.15)'} 0%, transparent 70%)`,
              pointerEvents: 'none',
              zIndex: 1000
            }}
          />
        )}
      </AnimatePresence>
      <motion.img 
        src={imageUrl} 
        alt="Lock" 
        style={{ height: '100%', objectFit: 'contain' }}
        animate={triggerEffect ? {
          scale: [1.15, 1.25, 1.15],
          x: [0, -3, 3, -3, 3, 0],
          filter: [
            `drop-shadow(0 0 0px ${mode === 'long' ? '#2DD56E' : '#FF4D4D'})`,
            `drop-shadow(0 0 25px ${mode === 'long' ? '#2DD56E' : '#FF4D4D'})`,
            `drop-shadow(0 0 0px ${mode === 'long' ? '#2DD56E' : '#FF4D4D'})`
          ]
        } : {
          scale: 1.15,
          x: 0,
          filter: 'drop-shadow(0 0 0px transparent)'
        }}
        transition={{
          duration: 0.5,
          ease: "easeInOut"
        }}
      />
    </div>
  )
}

export default LockAnimation
