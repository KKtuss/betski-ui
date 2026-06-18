import { mulberry32 } from './random'

export const seriesToPath = (
  series: number[],
  width: number,
  height: number,
  padding: number,
  minY: number,
  maxY: number
) => {
  if (series.length < 2) return ''
  const w = width - padding * 2
  const h = height - padding * 2
  const toX = (i: number) => padding + (i / (series.length - 1)) * w
  const range = Math.max(1, maxY - minY)
  const toY = (v: number) => padding + (1 - (v - minY) / range) * h
  let d = `M ${toX(0)} ${toY(series[0])}`
  for (let i = 1; i < series.length; i++) {
    d += ` L ${toX(i)} ${toY(series[i])}`
  }
  return d
}

export const buildTradeSparkline = (buyPrice: number, sellPrice: number, seed: number) => {
  const n = 15
  const buyIdx = 2
  const sellIdx = 11
  const rng = mulberry32(seed)
  const series: number[] = []
  for (let i = 0; i < n; i++) {
    if (i <= buyIdx) series.push(buyPrice * (1 + (rng() - 0.5) * 0.05))
    else if (i < sellIdx) {
      const t = (i - buyIdx) / (sellIdx - buyIdx)
      const mid = buyPrice + (sellPrice - buyPrice) * t
      series.push(mid + (rng() - 0.5) * Math.max(0.02, Math.abs(sellPrice - buyPrice) * 0.2))
    } else series.push(sellPrice * (1 + (rng() - 0.5) * 0.04))
  }
  return { series, buyIdx, sellIdx }
}
