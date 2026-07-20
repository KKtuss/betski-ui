import type { Batch, OpenBet, Wager } from '../types/discovery'
import type { BatchPreviewItem } from '../types/discovery'
import type { DataPoint } from '../types/chart'
import { loadDiscoveryCatalog } from './discoveryStore'
import type { MarketId } from './appStore'
import { PROFILE_AVATARS, PROFILE_SEEDS } from './profileRegistry'

export type MarketPreview = BatchPreviewItem & {
  videoUrl?: string
  embedUrl?: string
}

export type Market = {
  id: MarketId
  type: 'batch' | 'wager' | 'legacy'
  name: string
  question?: string
  yesOdds: number
  noOdds: number
  chart: DataPoint[]
  previews: MarketPreview[]
  volume: number
  volume24h: number
  holders: number
  resolutionTimestamp: number
  createdAtTimestamp?: number
  resolutionDateLabel: string
  timeLeftLabel: string
  /** Legacy video MP4 for seeded main-page markets */
  legacyVideoUrl?: string
  legacyDescription?: string
  legacyCreator?: string
  legacyAvatar?: string
  /** Wager-only fields */
  openBets?: OpenBet[]
  pool?: number
  promotionThreshold?: number
  /** Betski market / wager creator handle (not the social video author). */
  creatorHandle?: string
}

const LEGACY_VIDEOS = [
  {
    id: 1,
    title: 'Video 1',
    url: 'https://www.tiktok.com/@daviddobrik/video/7234567890123456789',
    creator: '@BenBetski',
    description: 'Will this be tough in 2026? 🔥 #betski',
    avatar: '/Stems/BetskiPEFFPEE.png'
  },
  {
    id: 2,
    title: 'Video 2',
    url: 'https://www.tiktok.com/@charlidamelio/video/7234567890123456790',
    creator: '@DeskWhale',
    description: 'Analyzing the next big move 🚀 #crypto'
  },
  {
    id: 3,
    title: 'Video 3',
    url: 'https://www.tiktok.com/@khaby.lame/video/7234567890123456791',
    creator: '@moggorrr',
    description: "Don't miss these entry points! 📈"
  },
  {
    id: 4,
    title: 'Video 4',
    url: 'https://www.tiktok.com/@bellapoarch/video/7234567890123456792',
    creator: '@ClipQueen',
    description: 'Liquidity hunt explained in 30s 💧'
  },
  {
    id: 5,
    title: 'Video 5',
    url: 'https://www.tiktok.com/@zachking/video/7234567890123456793',
    creator: '@ViralVince',
    description: 'Tracking the biggest wallets on chain 🐋'
  }
]

const batchToMarket = (batch: Batch, index = 0): Market => {
  const creatorHandle = PROFILE_SEEDS[index % PROFILE_SEEDS.length]?.handle ?? 'BenBetski'
  return {
    id: batch.id,
    type: 'batch',
    name: batch.name,
    yesOdds: batch.yesOdds,
    noOdds: batch.noOdds,
    chart: batch.chart,
    previews: batch.previews,
    volume: batch.volume,
    volume24h: batch.volume24h,
    holders: batch.holders,
    resolutionTimestamp: batch.resolutionTimestamp,
    resolutionDateLabel: batch.resolutionDateLabel,
    timeLeftLabel: batch.timeLeftLabel,
    creatorHandle,
    legacyAvatar: PROFILE_AVATARS[creatorHandle]
  }
}

const wagerToMarket = (wager: Wager): Market => {
  const consensus =
    wager.openBets.reduce((s, b) => s + b.yesOdds * b.volume, 0) /
    Math.max(1, wager.openBets.reduce((s, b) => s + b.volume, 0))
  const yes = Math.round(consensus)
  const creatorHandle = wager.creatorHandle.replace(/^@/, '')
  return {
    id: wager.id,
    type: 'wager',
    name: wager.name,
    question: wager.question,
    yesOdds: yes,
    noOdds: 100 - yes,
    chart: [],
    previews: wager.previews,
    volume: wager.pool,
    volume24h: Math.round(wager.pool * 0.4),
    holders: Math.round(20 + wager.pool / 200),
    resolutionTimestamp: wager.resolutionTimestamp,
    createdAtTimestamp: wager.createdAtTimestamp,
    resolutionDateLabel: wager.resolutionDateLabel,
    timeLeftLabel: wager.timeLeftLabel,
    openBets: wager.openBets,
    pool: wager.pool,
    promotionThreshold: wager.promotionThreshold,
    creatorHandle,
    legacyAvatar: PROFILE_AVATARS[creatorHandle]
  }
}

const legacyToMarket = (v: (typeof LEGACY_VIDEOS)[0], index: number): Market => {
  const creatorHandle = v.creator.replace(/^@/, '')
  return {
    id: `legacy-${v.id}`,
    type: 'legacy',
    name: v.description,
    yesOdds: Math.round(68.5 - index),
    noOdds: Math.round(100 - (68.5 - index)),
    chart: [],
    previews: [
      {
        id: `legacy-${v.id}-preview`,
        thumbnailUrl: '/Stems/BetskiPEFFPEE.png',
        volume: 100,
        sourceUrl: v.url
      }
    ],
    volume: 12000 + v.id * 8000,
    volume24h: 4000 + v.id * 2000,
    holders: 800 + v.id * 200,
    resolutionTimestamp: Date.now() + 72 * 60 * 60 * 1000,
    resolutionDateLabel: new Date(Date.now() + 72 * 60 * 60 * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    }),
    timeLeftLabel: '72h',
    legacyVideoUrl: v.url,
    legacyDescription: v.description,
    legacyCreator: v.creator,
    legacyAvatar: v.avatar ?? PROFILE_AVATARS[creatorHandle],
    creatorHandle
  }
}

export const getLegacyVideos = () => LEGACY_VIDEOS

export const buildMarketCatalog = (): Market[] => {
  const catalog = loadDiscoveryCatalog()
  const discoveryMarkets = [
    ...catalog.batches.filter((b) => !b.hidden).map((b, i) => batchToMarket(b, i)),
    ...catalog.wagers.filter((w) => !w.hidden).map(wagerToMarket)
  ]
  const legacyMarkets = LEGACY_VIDEOS.map(legacyToMarket)
  return [...discoveryMarkets, ...legacyMarkets]
}

export const getMarketById = (marketId: MarketId): Market | undefined =>
  buildMarketCatalog().find((m) => m.id === marketId)

/** Feed order for vertical market hopping — discovery markets by volume (trending). */
export const getNavigableMarketIds = (): MarketId[] => {
  const markets = buildMarketCatalog().filter((m) => m.type !== 'legacy')
  return [...markets].sort((a, b) => b.volume - a.volume).map((m) => m.id)
}

/**
 * Adjacent market in the vertical feed.
 * delta -1 = previous (ArrowUp / swipe down), +1 = next (ArrowDown / swipe up).
 */
export const getAdjacentMarketId = (
  currentId: MarketId,
  delta: -1 | 1
): MarketId | null => {
  let ids = getNavigableMarketIds()
  if (!ids.includes(currentId)) {
    // Legacy / unknown: still allow hopping through the full catalog.
    ids = buildMarketCatalog().map((m) => m.id)
  }
  const index = ids.indexOf(currentId)
  if (index < 0) return null
  return ids[index + delta] ?? null
}

export const legacyVideoIdToMarketId = (videoId: number): MarketId => `legacy-${videoId}`

export const marketIdToLegacyVideoId = (marketId: MarketId): number | null => {
  const match = marketId.match(/^legacy-(\d+)$/)
  return match ? Number(match[1]) : null
}

export const hashMarketId = (marketId: string): number =>
  marketId.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)
