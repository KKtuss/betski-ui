import { mulberry32 } from './random'

export { seriesToPath } from '../charts/data/transformChartData'

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
