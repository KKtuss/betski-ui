import type { ChartTimeWindow, DataPoint } from '../types/chart'
import { clamp } from './math'
import { mulberry32 } from './random'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const WINDOW_MS: Record<Exclude<ChartTimeWindow, 'MAX'>, number> = {
  '1H': HOUR,
  '1D': DAY,
  '1W': 7 * DAY,
  '1M': 30 * DAY
}

const buildHistoryTimestamps = (now: number, createdAtTimestamp?: number) => {
  const start = Math.min(now, createdAtTimestamp ?? now - 90 * DAY)
  const denseStart = now - 48 * HOUR
  const timestamps: number[] = []

  for (let t = start; t < denseStart; t += 3 * HOUR) {
    timestamps.push(t)
  }

  for (let t = Math.max(start, denseStart); t <= now; t += 2 * MINUTE) {
    timestamps.push(t)
  }

  if (timestamps[0] !== start) timestamps.unshift(start)
  if (timestamps[timestamps.length - 1] !== now) timestamps.push(now)
  return timestamps
}

const seededAnchor = (rng: () => number) => {
  const profile = rng()
  const base = profile < 0.22 ? 18 + rng() * 18 : profile > 0.78 ? 64 + rng() * 22 : 30 + rng() * 40
  return clamp(base + (rng() - 0.5) * 8, 3, 97)
}

const quantizePrice = (value: number) => Math.round(value * 2) / 2

const getProfileTarget = (profile: number, progress: number, target: number) => {
  const direction = target >= 50 ? 1 : -1
  const distance = target - 50

  if (profile === 0) {
    const lateProgress = clamp((progress - 0.62) / 0.38, 0, 1)
    return 50 + distance * (progress * 0.12 + Math.pow(lateProgress, 0.58) * 0.88)
  }

  if (profile === 1) {
    const hypeTarget = clamp(target + direction * 16, 8, 92)
    if (progress < 0.34) return 50 + (hypeTarget - 50) * Math.pow(progress / 0.34, 0.72)
    return hypeTarget + (target - hypeTarget) * Math.pow((progress - 0.34) / 0.66, 0.9)
  }

  if (profile === 2) return 50 + distance * Math.pow(progress, 1.18)

  if (profile === 3) {
    return 50 + distance * (0.28 * progress + 0.72 * Math.pow(progress, 1.55))
  }

  if (profile === 4) {
    const falseSide = clamp(50 - direction * (9 + Math.abs(distance) * 0.18), 8, 92)
    if (progress < 0.46) return 50 + (falseSide - 50) * Math.sin((progress / 0.46) * Math.PI * 0.72)
    return falseSide + (target - falseSide) * Math.pow((progress - 0.46) / 0.54, 0.68)
  }

  return 50 + distance * (0.22 * Math.sin(progress * Math.PI * 0.7) + 0.78 * Math.pow(progress, 0.82))
}

const buildEventTape = (seed: number, rng: () => number, points: number, target: number, closePressure: number) => {
  const direction = target >= 50 ? 1 : -1
  const count = 9 + (seed % 7) + Math.round(closePressure * 5)
  const events: { index: number; move: number }[] = []

  for (let i = 0; i < count; i++) {
    const clusterRoll = rng()
    const progress =
      clusterRoll < 0.28
        ? clamp(0.68 + rng() * 0.27, 0.02, 0.98)
        : clamp(0.08 + rng() * 0.86, 0.02, 0.98)
    const index = Math.max(1, Math.min(points - 2, Math.round(progress * (points - 1))))
    const towardLikely = rng() < 0.58 + closePressure * 0.22
    const falseMove = rng() < 0.24 * (1 - closePressure * 0.45)
    const side = towardLikely ? direction : -direction
    const magnitude = (1.8 + rng() * 8.8 + closePressure * rng() * 5.2) * (falseMove ? 0.68 : 1)
    events.push({ index, move: side * magnitude })

    if (rng() < 0.42) {
      const clusterSize = 1 + Math.floor(rng() * 3)
      for (let j = 0; j < clusterSize; j++) {
        const clusterIndex = Math.max(1, Math.min(points - 2, index + 1 + j * (1 + Math.floor(rng() * 3))))
        events.push({
          index: clusterIndex,
          move: side * magnitude * (0.18 + rng() * 0.32)
        })
      }
    }
  }

  return events.sort((a, b) => a.index - b.index)
}

export const buildMarketHistory = ({
  seed,
  now,
  anchorValue,
  createdAtTimestamp,
  resolutionTimestamp
}: {
  seed: number
  now: number
  anchorValue?: number
  createdAtTimestamp?: number
  resolutionTimestamp?: number
}): DataPoint[] => {
  const rng = mulberry32(310_000 + seed * 1009)
  const timestamps = buildHistoryTimestamps(now, createdAtTimestamp)
  const bondedTimestamp = timestamps[0]
  const resolutionProgress =
    resolutionTimestamp && resolutionTimestamp > bondedTimestamp
      ? clamp((now - bondedTimestamp) / (resolutionTimestamp - bondedTimestamp), 0, 1)
      : 0
  const seededTarget = seededAnchor(rng)
  const baseTarget = anchorValue ?? seededTarget
  const likelyOutcome = baseTarget >= 50 ? 100 : 0
  const target =
    anchorValue == null && resolutionTimestamp
      ? clamp(baseTarget + (likelyOutcome - baseTarget) * Math.pow(resolutionProgress, 1.65) * 0.34, 2, 98)
      : clamp(baseTarget, 2, 98)
  const profile = seed % 6
  const volatility = 0.58 + rng() * 0.62
  const closePressure = Math.pow(resolutionProgress, 1.45)
  const events = buildEventTape(seed, rng, timestamps.length, target, closePressure)

  let value = 50
  let eventIndex = 0
  let eventOffset = 0
  const raw: DataPoint[] = []

  for (let i = 0; i < timestamps.length; i++) {
    if (i > 0) {
      const hours = Math.max((timestamps[i] - timestamps[i - 1]) / HOUR, 1 / 30)
      const progress = i / Math.max(1, timestamps.length - 1)
      let eventMove = 0
      while (eventIndex < events.length && events[eventIndex].index === i) {
        eventMove += events[eventIndex].move
        eventIndex += 1
      }
      eventOffset = eventOffset * (1 - 0.006 * Math.min(hours, 3)) + eventMove

      const baseTrendTarget = getProfileTarget(profile, progress, target)
      const resolutionLean = (likelyOutcome - baseTrendTarget) * closePressure * Math.pow(progress, 1.35) * 0.16
      const trendTarget = clamp(baseTrendTarget + resolutionLean + eventOffset, 1, 99)
      const cycle =
        Math.sin(progress * Math.PI * (1.4 + (seed % 3)) + seed * 0.17) * (1.0 + rng() * 0.85) +
        Math.sin(progress * Math.PI * (3.2 + (seed % 4)) + seed * 0.07) * 0.55
      const noiseDamping = 1 - closePressure * progress * 0.32
      const shouldPrint =
        eventMove !== 0 ||
        hours >= 1 ||
        rng() < 0.045 + closePressure * 0.035 + Math.abs(target - value) / 2800

      if (shouldPrint) {
        const noise = (rng() - 0.5) * volatility * Math.sqrt(hours) * 0.42 * noiseDamping
        const falsePullback = rng() < 0.018 ? -(target >= value ? 1 : -1) * (1.8 + rng() * 5.4) * noiseDamping : 0
        const meanRevert = (trendTarget + cycle - value) * (0.08 + closePressure * 0.05) * Math.min(hours, 2.2)
        const stepMove = eventMove !== 0 ? eventMove * 0.72 : 0

        value = quantizePrice(clamp(value + stepMove + noise + falsePullback + meanRevert, 1, 99))
      }
    }

    raw.push({ timestamp: timestamps[i], value })
  }

  const endDiff = target - raw[raw.length - 1].value
  const correctionStart = 0.78
  const adjusted = raw.map((point, index) => {
    const progress = index / Math.max(1, raw.length - 1)
    const correctionProgress =
      progress <= correctionStart
        ? 0
        : Math.pow((progress - correctionStart) / (1 - correctionStart), 1.6)
    return {
      timestamp: point.timestamp,
      value: quantizePrice(clamp(point.value + endDiff * correctionProgress, 1, 99))
    }
  })

  adjusted[0] = { ...adjusted[0], value: 50 }
  adjusted[adjusted.length - 1] = { ...adjusted[adjusted.length - 1], value: target }
  return adjusted
}

export const getWindowStartValue = (chart: DataPoint[], now: number, windowMs: number) =>
  chart.find((point) => point.timestamp >= now - windowMs)?.value ?? chart[0]?.value ?? 50

export const chartWindowsFromHistory = (
  history: DataPoint[],
  now: number
): Record<ChartTimeWindow, DataPoint[]> => {
  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp)
  const sliceWindow = (window: Exclude<ChartTimeWindow, 'MAX'>) => {
    const start = now - WINDOW_MS[window]
    const filtered = sorted.filter((point) => point.timestamp >= start && point.timestamp <= now)
    if (filtered.length >= 2) return filtered

    const fallback = sorted.filter((point) => point.timestamp <= now)
    return fallback.slice(Math.max(0, fallback.length - 2))
  }

  return {
    '1H': sliceWindow('1H'),
    '1D': sliceWindow('1D'),
    '1W': sliceWindow('1W'),
    '1M': sliceWindow('1M'),
    MAX: sorted.filter((point) => point.timestamp <= now)
  }
}
