import { mulberry32 } from '../utils/random'

export type MarketId = string

export type TradeSide = 'YES' | 'NO'
export type PositionSide = 'long' | 'short'

export type Position = {
  marketId: MarketId
  marketName: string
  side: PositionSide
  shares: number
  avgEntry: number
}

export type TradeRecord = {
  id: string
  marketId: MarketId
  marketName: string
  side: PositionSide
  action: 'buy' | 'sell'
  outcome: TradeSide
  price: number
  usdAmount: number
  sharesAmount: number
  timestamp: number
  source: 'main' | 'discovery' | 'wager'
}

export type FriendPosition = {
  id: string
  marketId: MarketId
  marketName: string
  side: TradeSide
  fillPrice: number
  heldUsd: number
  pnlPct: number
}

export type FriendTrade = {
  id: string
  timestamp: string
  timestampMs: number
  market: string
  side: 'buy' | 'sell'
  price: number
  sizeUsd: number
  pnlUsd: number
  pairId: string
  outcome: TradeSide
}

export type UserProfile = {
  handle: string
  displayName: string
  avatar: string
  followers: number
  following: number
  markets: number
  positions: FriendPosition[]
  trades: FriendTrade[]
}

export type AppState = {
  version: 1
  wallet: { balanceUsd: number }
  positions: Record<MarketId, Position>
  trades: TradeRecord[]
  users: Record<string, UserProfile>
  ui: {
    selectedMarketId: MarketId | null
    viewingProfileHandle: string | null
  }
}

const STORAGE_KEY = 'betski-app-state-viral-markets-2026-06-16'
const CURRENT_USER = 'BenBetski'

const seedFriendTrades = (handle: string, markets: string[]): FriendTrade[] => {
  const rng = mulberry32(handle.split('').reduce((h, c) => h + c.charCodeAt(0), 0))
  const now = Date.now()
  const DAY_MS = 24 * 60 * 60 * 1000
  const HOUR_MS = 60 * 60 * 1000
  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const out: FriendTrade[] = []
  let price = 0.3 + rng() * 0.4
  for (let i = 14; i >= 0; i--) {
    const buyMs = now - i * DAY_MS - 3 * HOUR_MS
    const sellMs = now - i * DAY_MS - 1 * HOUR_MS
    const buyPrice = Math.max(0.12, Math.min(0.88, price))
    const buySizeUsd = 400 + rng() * 2800
    const shares = buySizeUsd / buyPrice
    const sellPrice = Math.max(0.12, Math.min(0.88, buyPrice + (rng() - 0.4) * 0.12))
    const sellSizeUsd = shares * sellPrice
    const pairId = `${handle}-pair-${i}`
    const outcome: TradeSide = rng() > 0.5 ? 'YES' : 'NO'
    const market = markets[i % markets.length]
    out.push(
      {
        id: `${handle}-sell-${i}`,
        timestamp: fmt(new Date(sellMs)),
        timestampMs: sellMs,
        market,
        side: 'sell',
        price: Number(sellPrice.toFixed(3)),
        sizeUsd: Number(sellSizeUsd.toFixed(0)),
        pnlUsd: Number((sellSizeUsd - buySizeUsd).toFixed(0)),
        pairId,
        outcome
      },
      {
        id: `${handle}-buy-${i}`,
        timestamp: fmt(new Date(buyMs)),
        timestampMs: buyMs,
        market,
        side: 'buy',
        price: Number(buyPrice.toFixed(3)),
        sizeUsd: Number(buySizeUsd.toFixed(0)),
        pnlUsd: 0,
        pairId,
        outcome
      }
    )
    price = sellPrice
  }
  return out
}

const seedFriendPositions = (handle: string, markets: string[]): FriendPosition[] =>
  Array.from({ length: 4 }, (_, i) => {
    const side: TradeSide = i % 2 === 0 ? 'YES' : 'NO'
    const fill = 0.25 + i * 0.08
    const heldUsd = 200 + i * 120
    const pnlPct = side === 'YES' ? 8 + i * 3 : -(5 + i * 2)
    return {
      id: `${handle}-pos-${i}`,
      marketId: `batch-${(i % 5) + 1}`,
      marketName: markets[i % markets.length],
      side,
      fillPrice: Number(fill.toFixed(3)),
      heldUsd,
      pnlPct
    }
  })

const FRIEND_SEEDS: { handle: string; avatar: string; followers: number; following: number; markets: number }[] = [
  { handle: 'BenBetski', avatar: '/Stems/BetskiPEFFPEE.png', followers: 8420, following: 142, markets: 23 },
  { handle: 'moggorrr', avatar: '/Stems/moggorrr transparent.png', followers: 12400, following: 89, markets: 31 },
  { handle: 'epstein', avatar: '/Stems/epstein transparent.png', followers: 3200, following: 210, markets: 12 },
  { handle: 'MarkDiTob', avatar: '/Stems/moggorrr transparent.png', followers: 5600, following: 178, markets: 19 },
  { handle: 'DeskWhale', avatar: '/Stems/betskuu.png', followers: 18900, following: 44, markets: 47 },
  { handle: 'ClipQueen', avatar: '/Stems/betskuu.png', followers: 9100, following: 312, markets: 28 }
]

const TREND_MARKETS = [
  'Triple T going 10x virality before EOM ?',
  'Dah Bih Gahh going 2x in virality in 3 days ?',
  "D4vd's story having a 3x regain in virality over 2 weeks ?",
  'Daffy Duck Money Edits going 5x virality in 2 months ?',
  'Hullo - 25 Dollar Max going 2x virality before EOW ?',
  'Drooling cat going 10x virality before EOM ?'
]

export const seedAppState = (): AppState => {
  const users: Record<string, UserProfile> = {}
  for (const f of FRIEND_SEEDS) {
    users[f.handle] = {
      handle: f.handle,
      displayName: f.handle,
      avatar: f.avatar,
      followers: f.followers,
      following: f.following,
      markets: f.markets,
      positions: f.handle === CURRENT_USER ? [] : seedFriendPositions(f.handle, TREND_MARKETS),
      trades: seedFriendTrades(f.handle, TREND_MARKETS)
    }
  }
  return {
    version: 1,
    wallet: { balanceUsd: 13501 },
    positions: {},
    trades: [],
    users,
    ui: {
      selectedMarketId: 'batch-1',
      viewingProfileHandle: null
    }
  }
}

type Listener = () => void
const listeners = new Set<Listener>()

const notify = () => listeners.forEach((fn) => fn())

/** Stable in-memory snapshot — required for useSyncExternalStore (getSnapshot must not change reference unless data changed). */
let cachedState: AppState | null = null

const hydrateFromStorage = (): AppState => {
  if (typeof window === 'undefined') return seedAppState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const state = seedAppState()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      return state
    }
    const parsed = JSON.parse(raw) as AppState
    if (parsed?.version !== 1) return seedAppState()
    const seeded = seedAppState()
    return {
      ...seeded,
      ...parsed,
      wallet: parsed.wallet ?? seeded.wallet,
      positions: parsed.positions ?? {},
      trades: parsed.trades ?? [],
      users: { ...seeded.users, ...parsed.users },
      ui: { ...seeded.ui, ...parsed.ui }
    }
  } catch {
    return seedAppState()
  }
}

export const subscribeAppState = (listener: Listener): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const loadAppState = (): AppState => {
  if (!cachedState) {
    cachedState = hydrateFromStorage()
  }
  return cachedState
}

export const saveAppState = (state: AppState): void => {
  if (typeof window === 'undefined') return
  cachedState = state
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  notify()
}

export const getAppState = (): AppState => loadAppState()

export const updateAppState = (updater: (prev: AppState) => AppState): AppState => {
  const next = updater(loadAppState())
  saveAppState(next)
  return next
}

export const CURRENT_USER_HANDLE = CURRENT_USER

export type ExecuteTradeParams = {
  marketId: MarketId
  marketName: string
  side: PositionSide
  action: 'buy' | 'sell'
  usdAmount: number
  price: number
  source?: TradeRecord['source']
}

export const executeTrade = (params: ExecuteTradeParams): { ok: boolean; error?: string } => {
  const { marketId, marketName, side, action, usdAmount, price, source = 'main' } = params
  if (usdAmount <= 0 || price <= 0) return { ok: false, error: 'Invalid amount' }

  const state = loadAppState()
  const sharesAmount = usdAmount / price
  const outcome: TradeSide = side === 'long' ? 'YES' : 'NO'
  const pos = state.positions[marketId]

  if (action === 'buy') {
    if (usdAmount > state.wallet.balanceUsd) return { ok: false, error: 'Insufficient balance' }
    const prevShares = pos?.shares ?? 0
    const prevAvg = pos?.avgEntry ?? price
    const newShares = prevShares + sharesAmount
    const newAvg = prevShares > 0 ? (prevAvg * prevShares + price * sharesAmount) / newShares : price
    const next: AppState = {
      ...state,
      wallet: { balanceUsd: state.wallet.balanceUsd - usdAmount },
      positions: {
        ...state.positions,
        [marketId]: { marketId, marketName, side, shares: newShares, avgEntry: newAvg }
      },
      trades: [
        {
          id: `trade-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          marketId,
          marketName,
          side,
          action,
          outcome,
          price,
          usdAmount,
          sharesAmount,
          timestamp: Date.now(),
          source
        },
        ...state.trades
      ]
    }
    saveAppState(next)
    return { ok: true }
  }

  const held = pos?.shares ?? 0
  if (held <= 0) return { ok: false, error: 'No position' }
  const sellShares = Math.min(held, sharesAmount)
  const proceeds = sellShares * price
  const remaining = held - sellShares
  const nextPositions = { ...state.positions }
  if (remaining <= 0.0001) delete nextPositions[marketId]
  else nextPositions[marketId] = { ...pos!, shares: remaining }

  const next: AppState = {
    ...state,
    wallet: { balanceUsd: state.wallet.balanceUsd + proceeds },
    positions: nextPositions,
    trades: [
      {
        id: `trade-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        marketId,
        marketName,
        side,
        action,
        outcome,
        price,
        usdAmount: proceeds,
        sharesAmount: sellShares,
        timestamp: Date.now(),
        source
      },
      ...state.trades
    ]
  }
  saveAppState(next)
  return { ok: true }
}

export const setSelectedMarketId = (marketId: MarketId | null): void => {
  updateAppState((s) => ({ ...s, ui: { ...s.ui, selectedMarketId: marketId } }))
}

export const setViewingProfileHandle = (handle: string | null): void => {
  updateAppState((s) => ({ ...s, ui: { ...s.ui, viewingProfileHandle: handle } }))
}

export const getPositionForMarket = (marketId: MarketId): Position | undefined =>
  loadAppState().positions[marketId]

export const getWalletBalance = (): number => loadAppState().wallet.balanceUsd
