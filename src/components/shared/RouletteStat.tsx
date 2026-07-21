import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue } from 'framer-motion'
import './RouletteStat.css'

type RouletteStatProps = {
  value: number | string
  /** Format the settled (and decoy) values for display. */
  format?: (value: number | string) => string
  /** Bump on vertical market hop to force a spin even if the value is unchanged. */
  shuffleKey?: number | string
  /** +1 = reel spins upward (next market); -1 = downward (prev). */
  spinDir?: -1 | 1
  /** Stagger delay so multiple stats don't land in lockstep. */
  delayMs?: number
  className?: string
  spinMs?: number
  steps?: number
}

const mulberry32 = (seed: number) => {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const makeDecoy = (
  value: number | string,
  format: (v: number | string) => string,
  rand: () => number
): string => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const spread = Math.max(8, Math.abs(value) * 0.35)
    const n = value + (rand() - 0.5) * 2 * spread
    const decimals = format(value).includes('.') ? 1 : 0
    const decoyNum = Number(n.toFixed(decimals))
    return format(decoyNum)
  }

  const raw = String(value)
  if (/^\d+\s*[smhdw]$/i.test(raw.trim()) || /^\d+d$/i.test(raw.trim())) {
    const unit = raw.replace(/[\d.\s]/g, '') || 'h'
    const n = 1 + Math.floor(rand() * 28)
    return format(`${n}${unit}`)
  }

  return format(
    raw
      .split('')
      .map((ch) => (/\d/.test(ch) ? String(Math.floor(rand() * 10)) : ch))
      .join('')
  )
}

/**
 * Casino-style vertical reel for a single stat.
 * Spins through decoy values on shuffleKey/value change, then lands on plain text
 * (no leftover Framer transforms — those were escaping into the overlay title).
 */
export const RouletteStat = ({
  value,
  format = (v) => String(v),
  shuffleKey,
  spinDir = 1,
  delayMs = 0,
  className,
  spinMs = 380,
  steps = 7
}: RouletteStatProps) => {
  const finalLabel = format(value)
  const [strip, setStrip] = useState<string[]>([finalLabel])
  const [offset, setOffset] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const itemRef = useRef<HTMLSpanElement>(null)
  const itemHRef = useRef(16)
  const prevKeyRef = useRef<string | null>(null)
  const delayTimerRef = useRef<number | null>(null)
  const endTimerRef = useRef<number | null>(null)
  const smearY = useMotionValue(1)

  useLayoutEffect(() => {
    const el = itemRef.current
    if (!el) return
    const measure = () => {
      itemHRef.current = el.offsetHeight || el.getBoundingClientRect().height || 16
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [finalLabel, spinning])

  useEffect(() => {
    const key = `${shuffleKey ?? ''}::${finalLabel}`
    const prev = prevKeyRef.current
    prevKeyRef.current = key

    // First paint or no shuffle — settle as static label.
    if (prev == null || shuffleKey == null) {
      setStrip([finalLabel])
      setOffset(0)
      setSpinning(false)
      smearY.set(1)
      return
    }

    // Same key (e.g. parent re-render) — do not restart the reel.
    if (prev === key) return

    const seed =
      (typeof shuffleKey === 'number' ? shuffleKey : String(shuffleKey).length * 997) * 1009 +
      finalLabel.split('').reduce((a, c) => a + c.charCodeAt(0), 0) +
      delayMs * 13
    const rand = mulberry32(seed | 0)
    const decoys = Array.from({ length: Math.max(3, steps - 1) }, () =>
      makeDecoy(value, format, rand)
    )

    const clearTimers = () => {
      if (delayTimerRef.current != null) window.clearTimeout(delayTimerRef.current)
      if (endTimerRef.current != null) window.clearTimeout(endTimerRef.current)
      delayTimerRef.current = null
      endTimerRef.current = null
    }
    clearTimers()

    delayTimerRef.current = window.setTimeout(() => {
      const h = itemHRef.current || 16
      const duration = spinMs / 1000

      if (spinDir >= 0) {
        const next = [...decoys, finalLabel]
        setStrip(next)
        setOffset(0)
        setSpinning(true)
        requestAnimationFrame(() => {
          setOffset(-(next.length - 1) * h)
        })
      } else {
        const next = [finalLabel, ...decoys]
        setStrip(next)
        setOffset(-(next.length - 1) * h)
        setSpinning(true)
        requestAnimationFrame(() => {
          setOffset(0)
        })
      }

      smearY.set(1.12)
      void animate(smearY, 1, {
        duration,
        ease: [0.08, 0.5, 0.2, 1]
      })

      endTimerRef.current = window.setTimeout(() => {
        // Drop motion entirely on settle so a leftover translateY cannot
        // yank the label up into the market title / TikTok chrome.
        setSpinning(false)
        setOffset(0)
        setStrip([finalLabel])
        smearY.set(1)
      }, spinMs + 40)
    }, delayMs)

    return clearTimers
    // format/value are reflected via finalLabel; omit unstable inline format fns from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalLabel, shuffleKey, spinDir, delayMs, spinMs, steps])

  // Idle: single text node (no nested block) so baseline stays aligned in buttons/charts.
  if (!spinning) {
    return (
      <span className={`roulette-stat roulette-stat--idle${className ? ` ${className}` : ''}`}>
        {finalLabel}
      </span>
    )
  }

  return (
    <span className={`roulette-stat is-spinning${className ? ` ${className}` : ''}`}>
      <motion.span
        className="roulette-stat-strip"
        animate={{ y: offset }}
        style={{ scaleY: smearY }}
        transition={{ duration: spinMs / 1000, ease: [0.12, 0.75, 0.12, 1] }}
      >
        {strip.map((label, i) => (
          <span
            key={`${i}-${label}`}
            ref={i === 0 ? itemRef : undefined}
            className="roulette-stat-item"
          >
            {label}
          </span>
        ))}
      </motion.span>
    </span>
  )
}

export default RouletteStat
