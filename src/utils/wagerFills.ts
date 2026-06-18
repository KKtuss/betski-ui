import type { OpenBet, SelectedLineFill, Wager, WagerFill } from '../types/discovery'
import type { TradeRecord } from '../data/appStore'
import { CURRENT_USER_HANDLE } from '../data/appStore'
import { mulberry32 } from './random'

const FILL_AVATARS: Record<string, string> = {
  BenBetski: '/Stems/BetskiPEFFPEE.png',
  moggorrr: '/Stems/moggorrr transparent.png',
  epstein: '/Stems/epstein transparent.png',
  MarkDiTob: '/Stems/moggorrr transparent.png',
  DeskWhale: '/Stems/betskuu.png',
  ClipQueen: '/Stems/betskuu.png'
}

const FILL_HANDLES = ['moggorrr', 'MarkDiTob', 'DeskWhale', 'ClipQueen', 'epstein', 'BenBetski']

/** Seed plausible fills from aggregated open bets when no ledger exists yet. */
export const synthesizeWagerFills = (wager: Wager): WagerFill[] => {
  const rng = mulberry32(wager.id.split('').reduce((h, c) => h + c.charCodeAt(0), 0))
  const fills: WagerFill[] = []
  let fillIdx = 0
  for (const bet of wager.openBets) {
    const chunks = 1 + Math.floor(rng() * 3)
    let remaining = bet.volume
    for (let i = 0; i < chunks && remaining > 0; i++) {
      const share = i === chunks - 1 ? remaining : Math.round(remaining * (0.25 + rng() * 0.45))
      if (share <= 0) continue
      remaining -= share
      const handle = FILL_HANDLES[Math.floor(rng() * FILL_HANDLES.length)]
      const side: 'YES' | 'NO' = rng() > 0.42 ? 'YES' : 'NO'
      fills.push({
        id: `${wager.id}-seed-${fillIdx++}`,
        handle,
        avatar: FILL_AVATARS[handle],
        side,
        yesOdds: bet.yesOdds,
        usdAmount: share,
        timestamp: wager.createdAtTimestamp + Math.round(rng() * 72 * 60 * 60 * 1000)
      })
    }
  }
  return fills.sort((a, b) => b.timestamp - a.timestamp)
}

export const getWagerFills = (wager: Wager, userTrades: TradeRecord[]): WagerFill[] => {
  const stored = wager.fills ?? []
  const fromUserTrades: WagerFill[] = userTrades
    .filter((t) => t.marketId === wager.id && t.action === 'buy')
    .map((t) => ({
      id: t.id,
      handle: CURRENT_USER_HANDLE,
      avatar: FILL_AVATARS[CURRENT_USER_HANDLE],
      side: t.outcome,
      yesOdds: Math.round(t.price * 100),
      usdAmount: Math.round(t.usdAmount),
      timestamp: t.timestamp
    }))

  const base = stored.length > 0 ? stored : synthesizeWagerFills(wager)
  const seen = new Set(base.map((f) => f.id))
  const merged = [...fromUserTrades.filter((f) => !seen.has(f.id)), ...base]
  return merged.sort((a, b) => b.timestamp - a.timestamp)
}

export const consensusYesFromOpenBets = (bets: OpenBet[]): number => {
  const total = bets.reduce((s, b) => s + b.volume, 0)
  if (total <= 0) return 50
  return Math.round(bets.reduce((s, b) => s + b.yesOdds * b.volume, 0) / total)
}

export const formatFillTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  })

export const getSelectedLineFills = (
  wager: Pick<Wager, 'friendBuys'>,
  fills: WagerFill[],
  yesOdds: number
): SelectedLineFill[] => {
  const friendHandles = new Set(wager.friendBuys.map((buy) => buy.handle))

  return fills
    .filter((fill) => fill.yesOdds === yesOdds)
    .map((fill) => {
      const checksum = fill.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)

      return {
        id: fill.id,
        side: fill.side,
        counterpartyName: fill.handle,
        counterpartyType: fill.handle === CURRENT_USER_HANDLE
          ? 'user'
          : friendHandles.has(fill.handle)
            ? 'friend'
            : 'market',
        availableSize: fill.usdAmount,
        partialFillAllowed: fill.usdAmount >= 25 && checksum % 5 !== 0,
        yesOdds,
        noOdds: 100 - yesOdds
      }
    })
}
