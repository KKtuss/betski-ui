import type { DataPoint } from '../types/chart'
import type { Batch, BatchPreviewItem, FriendBuy, OpenBet, Wager } from '../types/discovery'
import { clamp } from '../utils/math'
import { buildMarketHistory } from '../utils/marketHistory'
import { mulberry32 } from '../utils/random'

export { mulberry32 } from '../utils/random'

/** Default volume at which a wager promotes to a full Market. The creation
 *  form no longer exposes this, so new wagers use a sensible fixed target. */
export const DEFAULT_PROMOTION_THRESHOLD = 5000

/** Pool of friends used to populate "friends bought here" indicators. */
const FRIENDS: { handle: string; avatar: string }[] = [
  { handle: 'BenBetski',  avatar: '/Stems/BetskiPEFFPEE.png' },
  { handle: 'moggorrr',   avatar: '/Stems/moggorrr transparent.png' },
  { handle: 'epstein',    avatar: '/Stems/epstein transparent.png' },
  { handle: 'MarkDiTob',  avatar: '/Stems/moggorrr transparent.png' },
  { handle: 'DeskWhale',  avatar: '/Stems/betskuu.png' },
  { handle: 'ClipQueen',  avatar: '/Stems/betskuu.png' }
]

export const buildFriendBuys = (
  rng: () => number,
  yesBias: number
): FriendBuy[] => {
  // ~55% of batches surface at least one friend; rarer to have 2-3.
  const roll = rng()
  const count = roll < 0.45 ? 0 : roll < 0.78 ? 1 : roll < 0.93 ? 2 : 3
  if (count === 0) return []

  // Shuffle a copy of FRIENDS deterministically.
  const pool = [...FRIENDS]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  return pool.slice(0, count).map((f) => {
    // Trade sides correlate loosely with the batch's YES odds.
    const side: 'YES' | 'NO' = rng() < clamp(yesBias / 100, 0.2, 0.85) ? 'YES' : 'NO'
    const amountUsd = Math.round(25 + rng() * 750)
    // Price each friend paid is anchored on the current implied price
    // of their side, jittered to reflect that they entered at slightly
    // different moments.
    const baseOdds = side === 'YES' ? yesBias : 100 - yesBias
    const jitter = (rng() - 0.5) * 18
    const oddsAt = Math.round(clamp(baseOdds + jitter, 1, 99))
    const mins = Math.floor(rng() * 220) + 2
    const ago = mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`
    return { ...f, side, amountUsd, oddsAt, ago }
  })
}

export const formatResolutionDate = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
}

const seedFromString = (value: string) =>
  value.split('').reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) | 0, 0)

const buildChart = (seed: number, now: number, resolutionTimestamp: number) =>
  buildMarketHistory({ seed, now, resolutionTimestamp })

const getWindowStartValue = (chart: DataPoint[], now: number, windowMs: number) =>
  chart.find((point) => point.timestamp >= now - windowMs)?.value ?? chart[0]?.value ?? 50

export const getRandomPhoneThumbnailUrl = (index: number) => {
  return `https://picsum.photos/360/640?random=${1000 + index}`
}

const SEEDED_MARKETS: {
  name: string
  hoursUntilResolution: number
  resolutionTimestamp?: number
  links: string[]
}[] = [
  {
    name: 'Triple T going 10x virality before EOM ?',
    hoursUntilResolution: 14 * 24,
    links: [
      'https://www.tiktok.com/@loofy_e/video/7642847747623685407?q=TRIPLE%20T&t=1781573353873',
      'https://www.tiktok.com/@supremeralph23/video/7649442298119474446?q=TRIPLE%20T&t=1781573353873',
      'https://www.tiktok.com/@fabianmosele/video/7651007310243908877?q=TRIPLE%20T&t=1781573353873',
      'https://www.tiktok.com/@zyrix.aep/video/7623076562589453581?q=TRIPLE%20T&t=1781573353873',
      'https://www.tiktok.com/@noxaasht/video/7644457251595406613?q=TRIPLE%20T&t=1781573353873'
    ]
  },
  {
    name: 'Dah Bih Gahh going 2x in virality in 3 days ?',
    hoursUntilResolution: 72,
    links: [
      'https://www.tiktok.com/@overtime/video/7648273286291393805?q=Dat%20Bih%20Gah&t=1781573587281',
      'https://www.tiktok.com/@santacruzmedicinals/video/7650610293256604959?q=Dah%20Bih%20Gah&t=1781573406314',
      'https://www.tiktok.com/@staxburgerco/video/7649317710169410836?q=Dah%20Bih%20Gah&t=1781573406314',
      'https://www.tiktok.com/@jasontheween/video/7647299186693508382?q=Dah%20Bih%20Gah&t=1781573406314',
      'https://www.tiktok.com/@greenscreens4memes/video/7646413082302057749?q=Dat%20Bih%20Gah&t=1781573587281'
    ]
  },
  {
    name: "D4vd's story having a 3x regain in virality over 2 weeks ?",
    hoursUntilResolution: 14 * 24,
    links: [
      'https://www.tiktok.com/@edensweetin/video/7631150831873690894?q=d4vd&t=1781573618733',
      'https://www.tiktok.com/@stolenwawa/video/7636123094163148063?q=d4vd&t=1781573618733',
      'https://www.tiktok.com/@dubski.bangers/video/7649877006317931790?q=d4vd&t=1781573618733',
      'https://www.tiktok.com/@crustyrobot/video/7559779450200558903?q=d4vd&t=1781573618733',
      'https://www.tiktok.com/@cashconner/video/7631655001277959454?q=d4vd&t=1781573618733'
    ]
  },
  {
    name: 'Daffy Duck Money Edits going 5x virality in 2 months ?',
    hoursUntilResolution: 60 * 24,
    links: [
      'https://www.tiktok.com/@winstonbft/video/7629706767550778638?q=Daffy%20duck&t=1781573771172',
      'https://www.tiktok.com/@cloudxpp/video/7633519191118613781?q=Daffy%20duck&t=1781573771172',
      'https://www.tiktok.com/@sliverqq/video/7628323865286020383?q=Daffy%20duck&t=1781573771172',
      'https://www.tiktok.com/@salvadorlerma/video/7636664589563841805?q=Daffy%20duck%20money&t=1781573864619',
      'https://www.tiktok.com/@executivelos/video/7628582997847035158?q=Daffy%20duck%20money&t=1781573864619'
    ]
  },
  {
    name: 'Hullo - 25 Dollar Max going 2x virality before EOW ?',
    hoursUntilResolution: 5 * 24,
    links: [
      'https://www.tiktok.com/@zenncant155/video/7635937916857994518?q=hullo%2025%20max%20pizza&t=1781573929241',
      'https://www.tiktok.com/@zzk2010/video/7636543205210737938?q=hullo%2025%20max%20pizza&t=1781573929241',
      'https://www.tiktok.com/@jidion/video/7651730155798416653?q=hullo&t=1781573985329',
      'https://www.tiktok.com/@androgenic_/video/7637039455982898450?q=hullo&t=1781573985329',
      'https://www.tiktok.com/@jidion/video/7636970303154834701?q=hullo&t=1781573985329'
    ]
  },
  {
    name: 'Drooling cat going 10x virality before EOM ?',
    hoursUntilResolution: 14 * 24,
    links: [
      'https://www.tiktok.com/@droolingcatsol/video/7651156114339384589?q=drooling%20cat&t=1781574080921',
      'https://www.tiktok.com/@martin_raventiktok/video/7649633058563394849?q=drooling%20cat&t=1781574080921',
      'https://www.tiktok.com/@bako0ooo/video/7650698235962592525?q=drooling%20cat&t=1781574080921',
      'https://www.tiktok.com/@benjaminscabin/video/7649752728926768404?q=drooling%20cat&t=1781574080921',
      'https://www.tiktok.com/@maqaroon/video/7651669765236296982?q=drooling%20cat&t=1781574080921'
    ]
  }
]

export const buildBatches = (): Batch[] => {
  const now = Date.now()
  let globalPreviewIndex = 0

  return SEEDED_MARKETS.map((market, index) => {
    const rng = mulberry32(90000 + index * 777)
    const resolutionTimestamp = market.resolutionTimestamp ?? now + market.hoursUntilResolution * 60 * 60 * 1000
    const hours = Math.max(1, Math.round((resolutionTimestamp - now) / (60 * 60 * 1000)))
    const previews: BatchPreviewItem[] = market.links.map((sourceUrl, i) => {
      globalPreviewIndex += 1
      const volume = Math.round(40 + rng() * 3_200)
      return {
        id: `batch-${index + 1}-vid-${i + 1}`,
        thumbnailUrl: getRandomPhoneThumbnailUrl(globalPreviewIndex),
        sourceUrl,
        volume
      }
    })
    const volume = previews.reduce((sum, v) => sum + v.volume, 0)
    const volume24h = Math.round(volume * (0.35 + rng() * 0.8))
    // More realistic holder counts for a growing app
    const holders = Math.round(120 + rng() * 4_800)
    const top10WinRate = Math.round(48 + rng() * 30)
    // Avg hold duration (minutes): faster for short-expiry batches, slower for long-expiry.
    const avgHoldMinutes = Math.round(
      clamp(18 + rng() * 210 + hours * (rng() * 1.4 + 0.35), 12, 900)
    )

    const chart = buildChart(index + 1, now, resolutionTimestamp)
    const startVal = getWindowStartValue(chart, now, 24 * 60 * 60 * 1000)
    const endVal = chart[chart.length - 1].value
    // Use the actual chart end value for the displayed odds to ensure sync
    const yes = Math.round(endVal)
    const no = 100 - yes
    const priceChange = endVal - startVal

    const friendBuys = buildFriendBuys(rng, yes)

    return {
      id: `batch-${index + 1}`,
      name: market.name,
      yesOdds: yes,
      noOdds: no,
      resolutionTimestamp,
      resolutionDateLabel: formatResolutionDate(resolutionTimestamp),
      timeLeftLabel: hours >= 48 ? `${Math.round(hours / 24)}d` : `${hours}h`,
      volume,
      volume24h,
      holders,
      top10WinRate,
      avgHoldMinutes,
      chart,
      previews,
      priceChange,
      friendBuys
    }
  })
}

export const formatTimeLeftFromTimestamp = (resolutionTimestamp: number, now: number = Date.now()) => {
  const diffMs = resolutionTimestamp - now
  if (diffMs <= 0) return '0h'
  const hours = diffMs / (60 * 60 * 1000)
  if (hours >= 48) return `${Math.round(hours / 24)}d`
  if (hours >= 1) return `${Math.round(hours)}h`
  const mins = Math.max(1, Math.round(diffMs / (60 * 1000)))
  return `${mins}m`
}

const WAGER_CREATOR_HANDLES = [
  'BenBetski', 'moggorrr', 'epstein', 'MarkDiTob', 'DeskWhale', 'ClipQueen',
  'fadeking', 'tapeMaster', 'rugpullRick'
]

const WAGER_SPECS: {
  name: string
  hoursUntilResolution?: number
  resolutionTimestamp?: number
  links?: string[]
}[] = [
  {
    name: 'Merlin the Duck 5x virality before end of World Cup ?',
    resolutionTimestamp: new Date('2026-07-19T19:00:00Z').getTime(),
    links: [
      'https://www.tiktok.com/@luvitk12/video/7628089819641548053?q=merlin%20the%20duck&t=1781695858476',
      'https://www.tiktok.com/@m6info_/video/7651310286867057942?q=merlin%20the%20duck&t=1781695858476',
      'https://www.tiktok.com/@n.mas/video/7651065935222050065?q=merlin%20the%20duck&t=1781695858476',
      'https://www.tiktok.com/@apnews/video/7651926942056271118?q=merlin%20the%20duck&t=1781695858476',
      'https://www.tiktok.com/@record_mexico/video/7651759152615771410?q=merlin%20the%20duck&t=1781695858476'
    ]
  },
  {
    name: 'Toy Story 10x virality before EOM ?',
    hoursUntilResolution: 14 * 24,
    links: [
      'https://www.tiktok.com/@f378598/video/7649438007673589005?q=toy%20story&t=1781696129225',
      'https://www.tiktok.com/@overtime/video/7651855578901368078?q=toy%20story&t=1781696129225',
      'https://www.tiktok.com/@digital.printfoot/video/7650821949265874207?q=toy%20story&t=1781696129225',
      'https://www.tiktok.com/@filmthusiastofficial/video/7652050677639679250?q=toy%20story&t=1781696129225',
      'https://www.tiktok.com/@jitachi.707/video/7639948057966120206?q=toy%20story&t=1781696129225'
    ]
  },
  {
    name: 'Blue Bands / Larp going 3x virality in 2 months ?',
    hoursUntilResolution: 60 * 24,
    links: [
      'https://www.tiktok.com/@launkown/video/7617678034103045406?q=blue%20bands%20larp&t=1781697814612',
      'https://www.tiktok.com/@richofftt/video/7616129146258787615?q=blue%20bands%20larp&t=1781697814612',
      'https://www.tiktok.com/@princesspea6767/video/7624600527833189664?q=blue%20bands%20larp&t=1781697814612',
      'https://www.tiktok.com/@oliver.okenka/video/7626719189968997645?q=blue%20bands%20larp&t=1781697814612',
      'https://www.tiktok.com/@_zakolinski/video/7648952190513548576?q=blue%20bands%20larp&t=1781697814612'
    ]
  }
]

/** Generate a set of open bets scattered across the 1-99 range,
 *  clustered around a consensus center with natural volume falloff. */
export const buildOpenBets = (totalPool: number, consensus: number, rng: () => number): OpenBet[] => {
  if (totalPool <= 0) return []
  // Generate 5-12 open bets, concentrated near consensus
  const count = Math.max(5, Math.round(5 + rng() * 7))
  const bets: OpenBet[] = []
  const weights: number[] = []

  for (let i = 0; i < count; i++) {
    // Spread bets from tight to wide around the consensus
    const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1 // -1 to 1
    const spread = t * (20 + rng() * 25) // ±20-45 from center
    const jitter = (rng() - 0.5) * 6
    const yesOdds = Math.round(clamp(consensus + spread + jitter, 3, 97))
    // Skip if duplicate
    if (bets.some(b => b.yesOdds === yesOdds)) continue
    const dist = Math.abs(yesOdds - consensus)
    const w = Math.exp(-(dist * dist) / 200) * (0.4 + rng() * 0.8)
    weights.push(w)
    bets.push({ yesOdds, volume: 0 })
  }

  // Distribute volume
  const wSum = weights.reduce((a, b) => a + b, 0) || 1
  let remaining = totalPool
  for (let i = 0; i < bets.length; i++) {
    const alloc = i === bets.length - 1
      ? remaining
      : Math.round((weights[i] / wSum) * totalPool)
    bets[i].volume = Math.max(1, alloc)
    remaining -= bets[i].volume
  }

  bets.sort((a, b) => a.yesOdds - b.yesOdds)
  return bets.filter(b => b.volume > 0)
}

export const buildWagers = (): Wager[] => {
  const now = Date.now()
  return WAGER_SPECS.map((spec, index) => {
    const rng = mulberry32(50000 + index * 613)
    const hours = spec.hoursUntilResolution ?? Math.round(6 + rng() * 240)
    const resolutionTimestamp = spec.resolutionTimestamp ?? now + hours * 60 * 60 * 1000
    const createdHoursAgo = Math.round(rng() * 120)
    const createdAtTimestamp = now - createdHoursAgo * 60 * 60 * 1000

    const promotionThreshold = Math.round((2500 + rng() * 5500) / 250) * 250
    const fillRatio = clamp(0.05 + rng() * 0.78, 0.04, 0.96)
    const pool = Math.round(promotionThreshold * fillRatio)

    // Pick a consensus center for this wager (where most bets cluster)
    const consensus = Math.round(clamp(20 + rng() * 60, 15, 85))
    const openBets = buildOpenBets(pool, consensus, rng)
    // Use volume-weighted consensus for friend-buy bias
    const consensusYes = consensusYesFromBets(openBets)

    const previewCount = spec.links?.length ?? 3
    const previews: BatchPreviewItem[] = Array.from({ length: previewCount }, (_, i) => ({
      id: `wager-${index + 1}-vid-${i + 1}`,
      thumbnailUrl: getRandomPhoneThumbnailUrl(5000 + index * 11 + i),
      sourceUrl: spec.links?.[i],
      volume: Math.round(20 + rng() * 600)
    }))

    const friendBuys = buildFriendBuys(rng, consensusYes)
    const creatorHandle = WAGER_CREATOR_HANDLES[index % WAGER_CREATOR_HANDLES.length]

    return {
      id: `wager-${index + 1}`,
      name: spec.name,
      question: spec.name,
      openBets,
      pool: openBets.reduce((s, b) => s + b.volume, 0),
      promotionThreshold,
      createdAtTimestamp,
      resolutionTimestamp,
      resolutionDateLabel: formatResolutionDate(resolutionTimestamp),
      timeLeftLabel: formatTimeLeftFromTimestamp(resolutionTimestamp, now),
      previews,
      friendBuys,
      creatorHandle
    }
  })
}

/** Volume-weighted average YES odds across all open bets. */
export const consensusYesFromBets = (bets: OpenBet[]): number => {
  const total = bets.reduce((s, b) => s + b.volume, 0)
  if (total <= 0) return 50
  return bets.reduce((s, b) => s + b.yesOdds * b.volume, 0) / total
}

export const promoteWagerToBatch = (wager: Wager, rng: () => number): Batch => {
  const anchor = consensusYesFromBets(wager.openBets)
  const now = Date.now()
  const series = buildMarketHistory({
    seed: Math.abs(seedFromString(wager.id)),
    now,
    anchorValue: anchor,
    createdAtTimestamp: wager.createdAtTimestamp,
    resolutionTimestamp: wager.resolutionTimestamp
  })
  const startVal = getWindowStartValue(series, now, 24 * 60 * 60 * 1000)
  const endVal = series[series.length - 1].value
  const yes = Math.round(endVal)
  const no = 100 - yes
  const priceChange = endVal - startVal

  const volume = wager.pool
  const volume24h = Math.round(volume * (0.5 + rng() * 0.5))
  const holders = Math.round(40 + rng() * 320)
  const top10WinRate = Math.round(50 + rng() * 28)
  const avgHoldMinutes = Math.round(25 + rng() * 240)

  return {
    id: `batch-from-${wager.id}`,
    name: wager.name,
    yesOdds: yes,
    noOdds: no,
    resolutionTimestamp: wager.resolutionTimestamp,
    resolutionDateLabel: wager.resolutionDateLabel,
    timeLeftLabel: formatTimeLeftFromTimestamp(wager.resolutionTimestamp),
    volume,
    volume24h,
    holders,
    top10WinRate,
    avgHoldMinutes,
    chart: series,
    previews: wager.previews,
    priceChange,
    friendBuys: wager.friendBuys
  }
}
