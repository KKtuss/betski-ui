import { mulberry32 } from '../utils/random'
import { emitWagerFillNotification } from '../utils/notificationEmitter'
import { PROFILE_SEEDS, TREND_MARKETS } from './profileRegistry'
import { tradeRecordsToProfileTrades } from '../utils/tradeHistory'

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
  version: 2
  wallet: { balanceUsd: number }
  positions: Record<MarketId, Position>
  trades: TradeRecord[]
  users: Record<string, UserProfile>
  ui: {
    selectedMarketId: MarketId | null
    viewingProfileHandle: string | null
  }
}

const STORAGE_KEY = 'betski-app-state-v2-profiles-2026-06-29'
const LEGACY_STORAGE_KEY = 'betski-app-state-viral-markets-2026-06-16'
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

export const seedAppState = (): AppState => {
  const users: Record<string, UserProfile> = {}
  for (const f of PROFILE_SEEDS) {
    users[f.handle] = {
      handle: f.handle,
      displayName: f.displayName,
      avatar: f.avatar,
      followers: f.followers,
      following: f.following,
      markets: f.markets,
      positions: f.handle === CURRENT_USER ? [] : seedFriendPositions(f.handle, TREND_MARKETS),
      trades: f.handle === CURRENT_USER ? [] : seedFriendTrades(f.handle, TREND_MARKETS)
    }
  }
  return {
    version: 2,
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

const syncCurrentUserProfile = (state: AppState): AppState => {
  const profileTrades = tradeRecordsToProfileTrades(state.trades, (id) => ({
    name: state.positions[id]?.marketName ?? state.trades.find((t) => t.marketId === id)?.marketName
  }))
  const friendTrades: FriendTrade[] = profileTrades.map((t) => ({
    id: t.id,
    timestamp: t.timestamp,
    timestampMs: t.timestampMs,
    market: t.market,
    side: t.side,
    price: t.price,
    sizeUsd: t.sizeUsd,
    pnlUsd: t.pnlUsd,
    pairId: t.pairId,
    outcome: t.outcome
  }))

  const friendPositions: FriendPosition[] = Object.values(state.positions).map((pos) => ({
    id: `self-pos-${pos.marketId}`,
    marketId: pos.marketId,
    marketName: pos.marketName,
    side: pos.side === 'long' ? 'YES' : 'NO',
    fillPrice: pos.avgEntry,
    heldUsd: Number((pos.shares * pos.avgEntry).toFixed(0)),
    pnlPct: 0
  }))

  const base = state.users[CURRENT_USER] ?? seedAppState().users[CURRENT_USER]
  return {
    ...state,
    users: {
      ...state.users,
      [CURRENT_USER]: {
        ...base,
        positions: friendPositions,
        trades: friendTrades,
        markets: Math.max(base.markets, new Set(state.trades.map((t) => t.marketId)).size)
      }
    }
  }
}

type Listener = () => void
const listeners = new Set<Listener>()

const notify = () => listeners.forEach((fn) => fn())

let cachedState: AppState | null = null

const readLegacyState = (): Partial<AppState> | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<AppState>
  } catch {
    return null
  }
}

const hydrateFromStorage = (): AppState => {
  if (typeof window === 'undefined') return seedAppState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const legacy = readLegacyState()
    if (!raw) {
      const seeded = seedAppState()
      const migrated: AppState = legacy
        ? {
            ...seeded,
            wallet: legacy.wallet ?? seeded.wallet,
            positions: legacy.positions ?? {},
            trades: legacy.trades ?? [],
            ui: { ...seeded.ui, ...legacy.ui }
          }
        : seeded
      const synced = syncCurrentUserProfile(migrated)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(synced))
      return synced
    }
    const parsed = JSON.parse(raw) as AppState
    if (parsed?.version !== 2) {
      const seeded = seedAppState()
      return syncCurrentUserProfile({
        ...seeded,
        wallet: parsed.wallet ?? seeded.wallet,
        positions: parsed.positions ?? {},
        trades: parsed.trades ?? [],
        ui: { ...seeded.ui, ...parsed.ui }
      })
    }
    const seeded = seedAppState()
    const merged: AppState = {
      ...seeded,
      ...parsed,
      wallet: parsed.wallet ?? seeded.wallet,
      positions: parsed.positions ?? {},
      trades: parsed.trades ?? [],
      users: { ...seeded.users, ...parsed.users },
      ui: { ...seeded.ui, ...parsed.ui }
    }
    return syncCurrentUserProfile(merged)
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
  const next = syncCurrentUserProfile(updater(loadAppState()))
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
    const record: TradeRecord = {
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
    }
    const next: AppState = syncCurrentUserProfile({
      ...state,
      wallet: { balanceUsd: state.wallet.balanceUsd - usdAmount },
      positions: {
        ...state.positions,
        [marketId]: { marketId, marketName, side, shares: newShares, avgEntry: newAvg }
      },
      trades: [record, ...state.trades]
    })
    saveAppState(next)
    if (source === 'wager') {
      emitWagerFillNotification({
        wagerId: marketId,
        wagerName: marketName,
        side: outcome,
        usdAmount,
        price: price * 100
      })
    }
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

  const record: TradeRecord = {
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
  }
  const next: AppState = syncCurrentUserProfile({
    ...state,
    wallet: { balanceUsd: state.wallet.balanceUsd + proceeds },
    positions: nextPositions,
    trades: [record, ...state.trades]
  })
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

export const getUserProfile = (handle: string): UserProfile | undefined => loadAppState().users[handle]
