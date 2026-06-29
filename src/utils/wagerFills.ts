import type { OpenBet, SelectedLineFill, Wager, WagerFill } from '../types/discovery'
import type { TradeRecord } from '../data/appStore'
import { CURRENT_USER_HANDLE } from '../data/appStore'
import { PROFILE_AVATARS } from '../data/profileRegistry'
import { mulberry32 } from './random'

const FILL_HANDLES = [
  'moggorrr',
  'MarkDiTob',
  'DeskWhale',
  'ClipQueen',
  'epstein',
  'BenBetski',
  'CryptoKiwi',
  'NovaTape',
  'ViralVince',
  'ChartChad',
  'LootLord'
]

/** Seed plausible fills from aggregated open bets when no ledger exists yet. */
export const synthesizeWagerFills = (wager: Wager): WagerFill[] => {
  const rng = mulberry32(wager.id.split('').reduce((h, c) => h + c.charCodeAt(0), 0))
  const fills: WagerFill[] = []
  let fillIdx = 0
  for (const bet of wager.openBets) {
    // Generate more chunks, ensure we have both YES and NO sides
    const chunks = 3 + Math.floor(rng() * 5)
    let remaining = bet.volume
    let hasYES = false
    let hasNO = false

    for (let i = 0; i < chunks && remaining > 0; i++) {
      const share = i === chunks - 1 ? remaining : Math.round(remaining * (0.1 + rng() * 0.4))
      if (share <= 0) continue
      remaining -= share
      const handle = FILL_HANDLES[Math.floor(rng() * FILL_HANDLES.length)]

      // Ensure we have both sides
      let side: 'YES' | 'NO'
      if (!hasYES) {
        side = 'YES'
        hasYES = true
      } else if (!hasNO) {
        side = 'NO'
        hasNO = true
      } else {
        side = rng() > 0.45 ? 'YES' : 'NO'
      }

      // Calculate fill amount based on odds
      // If betting YES at Y cents, amount is the share
      // If betting NO at Y cents, amount is share * (100 - Y) / Y
      let usdAmount: number
      if (side === 'YES') {
        // Betting YES: amount is the share
        usdAmount = share
      } else {
        // Betting NO: amount is share * (100 - yesOdds) / yesOdds
        usdAmount = Math.round(share * (100 - bet.yesOdds) / bet.yesOdds)
      }

      fills.push({
        id: `${wager.id}-seed-${fillIdx++}`,
        handle,
        avatar: PROFILE_AVATARS[handle],
        side,
        yesOdds: bet.yesOdds,
        usdAmount,
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
      avatar: PROFILE_AVATARS[CURRENT_USER_HANDLE],
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
