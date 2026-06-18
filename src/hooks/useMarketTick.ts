import { useEffect, useRef, useState } from 'react'
import { mulberry32 } from '../utils/random'

export type MarketTick = {
  /** Wall-clock at which this tick fired */
  t: number
  /** Monotonic tick index (0, 1, 2, ...) */
  idx: number
  /** Seeded RNG bound to this tick; calling it advances the local sequence.
   *  Use it instead of `Math.random()` when you want correlated effects across
   *  panels reacting to the same beat. */
  rng: () => number
}

/**
 * Emits a slow heartbeat used to animate "live" market data.
 *
 * - `intervalMs` is the base cadence; a small random jitter is added so the
 *   UI doesn't pulse like a metronome.
 * - Pauses entirely while the tab is hidden (`document.hidden`), so
 *   background tabs don't accumulate updates.
 */
export function useMarketTick(intervalMs = 2200, jitterMs = 700): MarketTick {
  const [tick, setTick] = useState<MarketTick>(() => ({
    t: Date.now(),
    idx: 0,
    rng: mulberry32(0xc0ffee)
  }))
  const idxRef = useRef(0)

  useEffect(() => {
    let timer: number | null = null
    let cancelled = false

    const schedule = (delay: number) => {
      if (cancelled) return
      timer = window.setTimeout(loop, delay)
    }

    const loop = () => {
      if (cancelled) return
      if (typeof document !== 'undefined' && document.hidden) {
        schedule(400)
        return
      }
      idxRef.current += 1
      const seed = (idxRef.current * 1009 + 0x9e3779b1) >>> 0
      setTick({ t: Date.now(), idx: idxRef.current, rng: mulberry32(seed) })
      schedule(intervalMs + Math.random() * jitterMs)
    }

    schedule(intervalMs)
    return () => {
      cancelled = true
      if (timer != null) window.clearTimeout(timer)
    }
  }, [intervalMs, jitterMs])

  return tick
}
