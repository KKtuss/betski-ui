import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Particle {
  id: string
  x: number
  y: number
  color: string
}

interface UseParticleEffectProps {
  color?: string
  count?: number
}

export const useParticleEffect = ({ color = '#fff', count = 8 }: UseParticleEffectProps = {}) => {
  const [particles, setParticles] = useState<Particle[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const trigger = useCallback((e?: React.MouseEvent) => {
    // If event is provided, center on click relative to container
    // Otherwise center in container
    let centerX = 0
    let centerY = 0
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      if (e) {
        centerX = e.clientX - rect.left
        centerY = e.clientY - rect.top
      } else {
        centerX = rect.width / 2
        centerY = rect.height / 2
      }
    }

    const newParticles: Particle[] = Array.from({ length: count }).map(() => ({
      id: Math.random().toString(36).substr(2, 9),
      x: centerX,
      y: centerY,
      color
    }))

    setParticles(prev => [...prev, ...newParticles])
  }, [color, count])

  const removeParticle = useCallback((id: string) => {
    setParticles(prev => prev.filter(p => p.id !== id))
  }, [])

  const ParticleContainer = () => (
    <div 
      ref={containerRef}
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        pointerEvents: 'none', 
        overflow: 'visible',
        zIndex: 10
      }}
    >
      <AnimatePresence>
        {particles.map((p, i) => (
          <Particle 
            key={p.id} 
            {...p} 
            index={i} 
            total={count} 
            onComplete={() => removeParticle(p.id)} 
          />
        ))}
      </AnimatePresence>
    </div>
  )

  return { trigger, ParticleContainer }
}

const Particle = ({ x, y, color, index, total, onComplete }: Particle & { index: number, total: number, onComplete: () => void }) => {
  const angle = (index / total) * 360 + Math.random() * 30
  const distance = 20 + Math.random() * 15
  const size = 2 + Math.random() * 2
  
  // Convert polar to cartesian
  const rad = angle * (Math.PI / 180)
  const tx = Math.cos(rad) * distance
  const ty = Math.sin(rad) * distance

  return (
    <motion.div
      initial={{ x, y, opacity: 1, scale: 0 }}
      animate={{ 
        x: x + tx, 
        y: y + ty, 
        opacity: 0,
        scale: size
      }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      onAnimationComplete={onComplete}
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: `0 0 ${size}px ${size/2}px ${color}`
      }}
    />
  )
}
