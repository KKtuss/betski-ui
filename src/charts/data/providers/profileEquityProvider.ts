import type { ProfileTimeWindow } from '../../../data/profileConstants'
import type { ProfileTrade } from '../../../data/profileMock'
import { seriesToPath } from '../transformChartData'
import type { ChartProviderResult, ProfileEquityChartData } from '../types'

const lpContrib = (t: ProfileTrade) => Math.round(t.sizeUsd * 0.18 - 14 + Math.sin(t.price * 10) * 4)
const mcContrib = (t: ProfileTrade) => Math.round(t.sizeUsd * 0.06 - 6 + Math.cos(t.price * 12) * 3)

export const buildProfileEquityChartData = (
  trades: ProfileTrade[],
  profileTimeWindow: ProfileTimeWindow,
  width = 320,
  height = 170,
  padding = 10
): ProfileEquityChartData => {
  const now = Date.now()
  const DAY_MS = 24 * 60 * 60 * 1000
  const HOUR_MS = 60 * 60 * 1000
  const allSorted = [...trades].sort((a, b) => a.timestampMs - b.timestampMs)

  const cumAt = (upToMs: number) => {
    let t = 0
    let l = 0
    let m = 0
    for (const trade of allSorted) {
      if (trade.timestampMs > upToMs) break
      t += trade.pnlUsd
      l += lpContrib(trade)
      m += mcContrib(trade)
    }
    return [t, l, m] as const
  }

  let tradingSeries: number[]
  let lpSeries: number[]
  let marketSeries: number[]
  let labels: string[]

  if (profileTimeWindow === '1d') {
    const pts = Array.from({ length: 25 }, (_, i) => now - (24 - i) * HOUR_MS)
    tradingSeries = []
    lpSeries = []
    marketSeries = []
    labels = pts.map((ms) => {
      const d = new Date(ms)
      return `${String(d.getHours()).padStart(2, '0')}:00`
    })
    for (const ms of pts) {
      const [t, l, mVal] = cumAt(ms)
      tradingSeries.push(t)
      lpSeries.push(l)
      marketSeries.push(mVal)
    }
  } else if (profileTimeWindow === '7d') {
    const pts = Array.from({ length: 8 }, (_, i) => now - (7 - i) * DAY_MS)
    tradingSeries = []
    lpSeries = []
    marketSeries = []
    labels = pts.map((ms) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    for (const ms of pts) {
      const [t, l, mVal] = cumAt(ms)
      tradingSeries.push(t)
      lpSeries.push(l)
      marketSeries.push(mVal)
    }
  } else if (profileTimeWindow === '30d') {
    const pts = Array.from({ length: 31 }, (_, i) => now - (30 - i) * DAY_MS)
    tradingSeries = []
    lpSeries = []
    marketSeries = []
    labels = pts.map((ms) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    for (const ms of pts) {
      const [t, l, mVal] = cumAt(ms)
      tradingSeries.push(t)
      lpSeries.push(l)
      marketSeries.push(mVal)
    }
  } else {
    tradingSeries = [0]
    lpSeries = [0]
    marketSeries = [0]
    labels = ['Start']
    let rt = 0
    let rl = 0
    let rm = 0
    for (const trade of allSorted) {
      rt += trade.pnlUsd
      rl += lpContrib(trade)
      rm += mcContrib(trade)
      tradingSeries.push(rt)
      lpSeries.push(rl)
      marketSeries.push(rm)
      labels.push(trade.timestamp)
    }
  }

  const all = [...tradingSeries, ...lpSeries, ...marketSeries]
  const min = all.length ? Math.min(...all) : 0
  const max = all.length ? Math.max(...all) : 0
  const pad = Math.max(20, (max - min) * 0.12)
  const minY = min - pad
  const maxY = max + pad
  const y0raw = padding + (1 - (0 - minY) / Math.max(1, maxY - minY)) * (height - padding * 2)

  return {
    width,
    height,
    padding,
    minY,
    maxY,
    y0: Math.max(padding, Math.min(height - padding, y0raw)),
    tradingSeries,
    lpSeries,
    marketSeries,
    labels,
    paths: {
      trading: seriesToPath(tradingSeries, width, height, padding, minY, maxY),
      lp: seriesToPath(lpSeries, width, height, padding, minY, maxY),
      marketCreating: seriesToPath(marketSeries, width, height, padding, minY, maxY)
    }
  }
}

export const createProfileEquityProvider = (
  trades: ProfileTrade[] | undefined,
  profileTimeWindow: ProfileTimeWindow,
  loading = false,
  error: string | null = null
): (() => ChartProviderResult<ProfileEquityChartData>) => {
  return () => {
    if (loading) return { status: 'loading' }
    if (error) return { status: 'error', message: error }
    if (!trades) return { status: 'empty', reason: 'No trade history' }
    const data = buildProfileEquityChartData(trades, profileTimeWindow)
    if (data.tradingSeries.length < 2 && trades.length === 0) {
      return { status: 'empty', reason: 'No PnL data yet' }
    }
    return { status: 'success', data }
  }
}
