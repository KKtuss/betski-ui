import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { subscribeCollectionFly } from '../utils/collectionFlyBus'
import './CollectionFlyOverlay.css'

type FlyJob = {
  id: number
  thumbnails: [string, string, string]
  origin: { x: number; y: number }
  barTop: number
}

const CARD_H = 54

const padThumbs = (thumbs: string[]): [string, string, string] => {
  const a = thumbs[0]
  const b = thumbs[1] ?? a
  const c = thumbs[2] ?? thumbs[1] ?? a
  return [a, b, c]
}

const getProfileAnchor = () => {
  const el = document.querySelector<HTMLElement>('[data-bottom-tab="profile"]')
  const bar = document.querySelector<HTMLElement>('.bottom-bar')
  if (!el) return null
  const rect = el.getBoundingClientRect()
  const barTop = bar?.getBoundingClientRect().top ?? rect.top
  return {
    x: rect.left + rect.width / 2,
    y: barTop,
    barTop
  }
}

/**
 * Hand-fan → merge → sink behind the bottom bar into profile.
 * Card order: center (1), left (2), right (3).
 */
const CollectionFlyOverlay = () => {
  const [job, setJob] = useState<FlyJob | null>(null)

  useEffect(() => {
    return subscribeCollectionFly(({ thumbnails }) => {
      const origin = getProfileAnchor()
      if (!origin) return
      setJob({
        id: Date.now(),
        thumbnails: padThumbs(thumbnails),
        origin: { x: origin.x, y: origin.y },
        barTop: origin.barTop
      })
    })
  }, [])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {job && (
        <motion.div
          key={job.id}
          className="collection-fly"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          <CollectionFlyBurst
            key={job.id}
            thumbnails={job.thumbnails}
            origin={job.origin}
            barTop={job.barTop}
            onDone={() => setJob(null)}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

const CollectionFlyBurst = ({
  thumbnails,
  origin,
  barTop,
  onDone
}: {
  thumbnails: [string, string, string]
  origin: { x: number; y: number }
  barTop: number
  onDone: () => void
}) => {
  // Phase: 0 fan-in, 1 merge, 2 sink behind bar
  const [phase, setPhase] = useState<0 | 1 | 2>(0)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  // Timers must run once per burst mount. Parent re-renders pass a new
  // onDone identity — putting it in deps restarts phases and pops the
  // stack back out after it already sank.
  useEffect(() => {
    const mergeTimer = window.setTimeout(() => setPhase(1), 900)
    const sinkTimer = window.setTimeout(() => setPhase(2), 1280)
    const doneTimer = window.setTimeout(() => onDoneRef.current(), 2200)
    return () => {
      window.clearTimeout(mergeTimer)
      window.clearTimeout(sinkTimer)
      window.clearTimeout(doneTimer)
    }
  }, [])

  const cards = [
    { src: thumbnails[1], role: 'left' as const, appearDelay: 0.12 },
    { src: thumbnails[0], role: 'center' as const, appearDelay: 0 },
    { src: thumbnails[2], role: 'right' as const, appearDelay: 0.24 }
  ]

  // Distance from bar top down so the full card slips behind the bar
  const sinkY = CARD_H + 28

  const fanTransform = (role: 'left' | 'center' | 'right') => {
    if (phase >= 2) {
      // Keep stack order while sliding behind the bar (center stays on top)
      if (role === 'center') return { x: 0, y: sinkY - 10, rotate: 0, scale: 0.55, opacity: 1 }
      if (role === 'left') return { x: 0, y: sinkY - 5, rotate: 0, scale: 0.53, opacity: 1 }
      return { x: 0, y: sinkY, rotate: 0, scale: 0.51, opacity: 1 }
    }
    if (phase >= 1) {
      // Stack: fan-front (center) stays on top; tighter vertical offsets
      if (role === 'center') return { x: 0, y: -CARD_H - 28, rotate: 0, scale: 1, opacity: 1 }
      if (role === 'left') return { x: 0, y: -CARD_H - 23, rotate: 0, scale: 0.98, opacity: 1 }
      return { x: 0, y: -CARD_H - 18, rotate: 0, scale: 0.96, opacity: 1 }
    }
    if (role === 'left') return { x: -18, y: -CARD_H - 20, rotate: -16, scale: 0.92, opacity: 1 }
    if (role === 'right') return { x: 18, y: -CARD_H - 20, rotate: 16, scale: 0.92, opacity: 1 }
    return { x: 0, y: -CARD_H - 30, rotate: 0, scale: 1, opacity: 1 }
  }

  return (
    <div
      className="collection-fly-stage"
      style={{
        // Clip everything at the bottom-bar top so cards truly vanish behind it
        clipPath: `inset(0 0 ${Math.max(0, window.innerHeight - barTop)}px 0)`
      }}
    >
      <div className="collection-fly-anchor" style={{ left: origin.x, top: origin.y }}>
        {cards.map((card) => {
          const t = fanTransform(card.role)
          return (
            <motion.div
              key={`${card.role}-${card.src}`}
              className={`collection-fly-card collection-fly-card--${card.role}`}
              initial={{
                x: 0,
                y: 4,
                rotate: 0,
                scale: 0.15,
                opacity: 0
              }}
              animate={{
                x: t.x,
                y: t.y,
                rotate: t.rotate,
                scale: t.scale,
                opacity: t.opacity
              }}
              transition={
                phase === 0
                  ? {
                      type: 'spring',
                      stiffness: 260,
                      damping: 22,
                      delay: card.appearDelay
                    }
                  : phase === 1
                    ? { type: 'spring', stiffness: 240, damping: 26 }
                    : { duration: 0.7, ease: [0.45, 0, 0.2, 1] }
              }
            >
              <img src={card.src} alt="" draggable={false} />
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default CollectionFlyOverlay
