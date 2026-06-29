import type { ChartTimeWindow, DataPoint } from '../types/chart'
import type { Rule, Holder, LpPosition } from '../components/RulesPanel'
import type { Trade } from '../types/trading'
import type { Market } from '../data/marketCatalog'
import { hashMarketId } from '../data/marketCatalog'
import { formatCompactUsd } from './formatCompact'
import { buildMarketHistory, chartWindowsFromHistory } from './marketHistory'

const chartFromDiscovery = (chart: DataPoint[], now: number): Record<ChartTimeWindow, DataPoint[]> => {
  if (chart.length === 0) return { '1H': [], '1D': [], '1W': [], '1M': [], MAX: [] }
  return chartWindowsFromHistory(chart, now)
}

const generateChartDataByWindow = (
  seed: number,
  anchorYes: number,
  now: number,
  createdAtTimestamp?: number,
  resolutionTimestamp?: number
): Record<ChartTimeWindow, DataPoint[]> => {
  return chartWindowsFromHistory(
    buildMarketHistory({ seed, now, anchorValue: anchorYes, createdAtTimestamp, resolutionTimestamp }),
    now
  )
}

export type MarketViewData = {
  chartDataByWindow: Record<ChartTimeWindow, DataPoint[]>
  rules: Rule[]
  topHolders: Holder[]
  lpPositions: LpPosition[]
  recentTrades: Trade[]
  basePrice: number
}

export const buildMarketViewData = (
  market: Market,
  outcomeSide: 'yes' | 'no',
  chartNow: number
): MarketViewData => {
  const seed = Math.abs(hashMarketId(market.id))
  const chartDataByWindow =
    market.chart.length > 0
      ? chartFromDiscovery(market.chart, chartNow)
      : generateChartDataByWindow(seed, market.yesOdds, chartNow, market.createdAtTimestamp, market.resolutionTimestamp)

  const liquidityUsd = market.volume * 0.8 + (outcomeSide === 'yes' ? 6500 : 9500)
  const volume24hUsd = market.volume24h

  const rules: Rule[] = [
    {
      label: 'Outcome',
      value: outcomeSide === 'yes' ? `YES on "${market.name}"` : `NO on "${market.name}"`
    },
    { label: 'Liquidity', value: formatCompactUsd(liquidityUsd) },
    { label: 'Volume (24h)', value: formatCompactUsd(volume24hUsd) },
    { label: 'Resolves', value: market.resolutionDateLabel }
  ]

  if (market.type === 'wager' && market.promotionThreshold != null) {
    rules.push({
      label: 'Promotion',
      value: `${formatCompactUsd(market.pool ?? 0)} / ${formatCompactUsd(market.promotionThreshold)}`
    })
  }

  const outcomeSeed = outcomeSide === 'yes' ? 1 : 2
  const topHolders: Holder[] = Array.from({ length: 5 }, (_, i) => ({
    address: `0x${(outcomeSeed * 100 + seed * 10 + i).toString(16).padStart(3, '0')}...${(outcomeSeed * 200 + seed * 20 + i).toString(16).padStart(4, '0')}`,
    amount: `$${500 - i * 50 + (seed % 100) * 20 + outcomeSeed * 15}k`,
    percentage: `${(5 - i * 0.5 + outcomeSeed * 0.1).toFixed(1)}%`
  }))

  const lpPositions: LpPosition[] = Array.from({ length: 5 }, (_, i) => ({
    address: `0x${(outcomeSeed * 300 + seed * 30 + i).toString(16).padStart(3, '0')}...${(outcomeSeed * 400 + seed * 40 + i).toString(16).padStart(4, '0')}`,
    liquidity: formatCompactUsd(22_000 + (seed % 50) * 1800 + outcomeSeed * 2400 - i * 3250),
    share: `${(18 - i * 2.4 - (seed % 2) * 0.7 + outcomeSeed * 0.2).toFixed(1)}%`
  }))

  const base = outcomeSide === 'yes' ? market.yesOdds : market.noOdds
  const recentTrades: Trade[] = Array.from({ length: 60 }, (_, i) => {
    const t = new Date(Date.now() - i * 950 - ((seed * 19 + i * 7) % 5000))
    return {
      id: `seed-${market.id}-${outcomeSeed}-${i}`,
      time: t.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      price: base + Math.sin(i * 0.12 + seed + outcomeSeed) * 1.1,
      quantity: Math.floor(14 + Math.abs(Math.sin(i * 0.38 + seed)) * 520 + (i % 9) * 11),
      type: Math.random() > 0.44 ? 'buy' : 'sell'
    }
  })

  return { chartDataByWindow, rules, topHolders, lpPositions, recentTrades, basePrice: base }
}
