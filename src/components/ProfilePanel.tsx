import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Send } from 'lucide-react'
import { useAppStore } from '../hooks/useAppStore'
import { CURRENT_USER_HANDLE } from '../data/appStore'
import { getMarketById } from '../data/marketCatalog'
import type { MarketId } from '../data/appStore'
import { generateSeededTrades, type ProfileTrade } from '../data/profileMock'
import {
  HIGHLIGHT_CARD_TITLES,
  PROFILE_TIME_WINDOWS,
  type ProfileTimeWindow
} from '../data/profileConstants'
import {
  LOOTBOX_OPEN_VIDEO_SRC
} from '../data/profileLootboxes'
import { formatUsd, formatUsdSigned } from '../utils/profileFormat'
import ProfileEquityChart from './profile/ProfileEquityChart'
import ProfileHighlightsGrid from './profile/ProfileHighlightsGrid'
import ProfileLootboxesStrip from './profile/ProfileLootboxesStrip'
import ProfileLootboxVideo from './profile/ProfileLootboxVideo'
import ProfilePositionsList, { type ProfilePosition } from './profile/ProfilePositionsList'
import ProfileTradeTape from './profile/ProfileTradeTape'
import './Panel.css'
import './ProfilePanel.css'

const ProfilePanel = ({
  onSharePnL,
  onShareTrade,
  viewingHandle = null,
  onBackToSelfProfile,
  onOpenMarket
}: {
  onSharePnL?: (text: string) => void
  onShareTrade?: (trade: {
    title: string
    side: 'YES' | 'NO'
    entry: number
    exit: number
    pnlUsd: number
    pnlPct: number
    chart: { value: number; timestamp: number }[]
    thumbnailSrc?: string
    thumbnailFallbackSrc?: string
  }) => void
  viewingHandle?: string | null
  onBackToSelfProfile?: () => void
  onOpenMarket?: (marketId: MarketId) => void
}) => {
  const appState = useAppStore()
  const isSelf = !viewingHandle || viewingHandle === CURRENT_USER_HANDLE
  const profileUser = isSelf
    ? appState.users[CURRENT_USER_HANDLE]
    : appState.users[viewingHandle] ?? appState.users[CURRENT_USER_HANDLE]

  const rawPfpSrc = profileUser?.avatar ?? '/Stems/BetskiPEFFPEE.png'
  const displayName = profileUser?.displayName ?? CURRENT_USER_HANDLE
  const [profileTimeWindow, setProfileTimeWindow] = useState<ProfileTimeWindow>('30d')
  /** Random market-style vertical thumbs per visit (not profile assets) */
  const highlightThumbSeeds = useMemo(
    () => Array.from({ length: 3 }, () => Math.floor(Math.random() * 2_147_483_646)),
    []
  )
  const [tapeView, setTapeView] = useState<'activity' | 'history'>('activity')
  const [lootboxVideoOpen, setLootboxVideoOpen] = useState(false)

  const seededTrades = useMemo<ProfileTrade[]>(() => generateSeededTrades(), [])

  const trades = useMemo<ProfileTrade[]>(() => {
    if (!isSelf) {
      return (profileUser?.trades ?? []).map((t) => ({
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
    }

    const fmt = (ms: number) =>
      new Date(ms).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })

    const liveTrades: ProfileTrade[] = appState.trades.map((t) => ({
      id: t.id,
      timestamp: fmt(t.timestamp),
      timestampMs: t.timestamp,
      market: t.marketName,
      side: t.action,
      price: t.price,
      sizeUsd: t.usdAmount,
      pnlUsd: t.action === 'sell' ? t.usdAmount * 0.05 : 0,
      pairId: `live-${t.id}`,
      outcome: t.outcome
    }))

    return [...liveTrades, ...seededTrades].sort((a, b) => b.timestampMs - a.timestampMs)
  }, [isSelf, profileUser?.trades, appState.trades, seededTrades])

  const windowedTrades = useMemo(() => {
    const now    = Date.now()
    const DAY_MS = 24 * 60 * 60 * 1000
    const cutoff =
      profileTimeWindow === '1d'  ? now -  1 * DAY_MS
      : profileTimeWindow === '7d'  ? now -  7 * DAY_MS
      : profileTimeWindow === '30d' ? now - 30 * DAY_MS
      : 0 // max = all
    return trades.filter(t => t.timestampMs >= cutoff)
  }, [trades, profileTimeWindow])

  const historyRows = useMemo(() => {
    const map = new Map<string, { buy?: ProfileTrade; sell?: ProfileTrade }>()
    for (const t of windowedTrades) {
      const cur = map.get(t.pairId) ?? {}
      if (t.side === 'buy') cur.buy = t
      else cur.sell = t
      map.set(t.pairId, cur)
    }
    const rows: {
      pairId: string
      market: string
      outcome: 'YES' | 'NO'
      buyPrice: number
      sellPrice: number
      pnlUsd: number
      closedMs: number
    }[] = []
    for (const { buy, sell } of map.values()) {
      if (!buy || !sell) continue
      rows.push({
        pairId: buy.pairId,
        market: buy.market,
        outcome: buy.outcome,
        buyPrice: buy.price,
        sellPrice: sell.price,
        pnlUsd: sell.pnlUsd,
        closedMs: sell.timestampMs
      })
    }
    rows.sort((a, b) => b.closedMs - a.closedMs)
    return rows
  }, [windowedTrades])

  /** All-time top 3 closed trades for Highlights (not time-windowed) */
  const topTradeHighlights = useMemo(() => {
    const map = new Map<string, { buy?: ProfileTrade; sell?: ProfileTrade }>()
    for (const t of trades) {
      const cur = map.get(t.pairId) ?? {}
      if (t.side === 'buy') cur.buy = t
      else cur.sell = t
      map.set(t.pairId, cur)
    }
    const rows: { market: string; buyPrice: number; sellPrice: number; pnlUsd: number }[] = []
    for (const { buy, sell } of map.values()) {
      if (!buy || !sell) continue
      rows.push({
        market: buy.market,
        buyPrice: buy.price,
        sellPrice: sell.price,
        pnlUsd: sell.pnlUsd
      })
    }
    rows.sort((a, b) => b.pnlUsd - a.pnlUsd)
    return rows.slice(0, 3).map((row, i) => ({
      ...row,
      displayTitle: HIGHLIGHT_CARD_TITLES[i] ?? row.market
    }))
  }, [trades])

  const allTimeEquity = useMemo(() => {
    if (isSelf) return appState.wallet.balanceUsd
    const startingBalance = 13501
    const totalPnl = trades.reduce((acc, t) => acc + t.pnlUsd, 0)
    return startingBalance + totalPnl
  }, [isSelf, appState.wallet.balanceUsd, trades])

  const socialStats = {
    followers: profileUser?.followers ?? 8420,
    following: profileUser?.following ?? 142,
    markets: profileUser?.markets ?? 23
  }

  const tradingStats = useMemo(() => {
    const sellTrades = windowedTrades.filter(t => t.side === 'sell')
    const pairCount  = sellTrades.length // one sell = one completed round-trip
    const totalPnl   = sellTrades.reduce((acc, t) => acc + t.pnlUsd, 0)
    const buyVolume  = windowedTrades.reduce((acc, t) => acc + (t.side === 'buy'  ? t.sizeUsd : 0), 0)
    const sellVolume = windowedTrades.reduce((acc, t) => acc + (t.side === 'sell' ? t.sizeUsd : 0), 0)
    // sellVolume - buyVolume === totalPnl (exact, by construction of the round-trip pairs)
    const wins     = sellTrades.filter(t => t.pnlUsd > 0).length
    const winRate  = pairCount === 0 ? 0 : (wins / pairCount) * 100
    const avgPnl   = pairCount === 0 ? 0 : totalPnl / pairCount
    const bestTrade  = sellTrades.reduce((acc, t) => Math.max(acc, t.pnlUsd), Number.NEGATIVE_INFINITY)
    const worstTrade = sellTrades.reduce((acc, t) => Math.min(acc, t.pnlUsd), Number.POSITIVE_INFINITY)

    return {
      totalPnl,
      buyVolume,
      sellVolume,
      pairCount,
      winRate,
      avgPnl,
      bestTrade:  Number.isFinite(bestTrade)  ? bestTrade  : 0,
      worstTrade: Number.isFinite(worstTrade) ? worstTrade : 0,
    }
  }, [windowedTrades])

  const sharePnlText = useMemo(() => {
    const label = PROFILE_TIME_WINDOWS.find(w => w.id === profileTimeWindow)?.label ?? profileTimeWindow.toUpperCase()
    const net = formatUsdSigned(tradingStats.totalPnl)
    const wr = `${tradingStats.winRate.toFixed(0)}%`
    const vol = formatUsd(tradingStats.buyVolume + tradingStats.sellVolume)
    return `${displayName} • Net PnL (${label}): ${net} • Win rate: ${wr} • Volume: ${vol}`
  }, [profileTimeWindow, tradingStats.totalPnl, tradingStats.winRate, tradingStats.buyVolume, tradingStats.sellVolume, displayName])

  const positions = useMemo<ProfilePosition[]>(() => {
    if (!isSelf) {
      return (profileUser?.positions ?? []).map((p) => ({
        id: p.id,
        marketId: p.marketId,
        market: p.marketName,
        side: p.side,
        fillPrice: p.fillPrice,
        heldUsd: p.heldUsd,
        pnlPct: p.pnlPct
      }))
    }

    return Object.values(appState.positions).map((pos) => {
      const market = getMarketById(pos.marketId)
      const odds = pos.side === 'long' ? market?.yesOdds ?? 50 : market?.noOdds ?? 50
      const currentPrice = odds / 100
      const heldUsd = pos.shares * currentPrice
      const rawPnl = ((currentPrice - pos.avgEntry) / Math.max(pos.avgEntry, 0.001)) * 100
      return {
        id: pos.marketId,
        marketId: pos.marketId,
        market: pos.marketName,
        side: pos.side === 'long' ? 'YES' : 'NO',
        fillPrice: pos.avgEntry,
        heldUsd: Number(heldUsd.toFixed(0)),
        pnlPct: Number((pos.side === 'long' ? rawPnl : -rawPnl).toFixed(1))
      }
    })
  }, [isSelf, profileUser?.positions, appState.positions])

  return (
    <motion.div
      className="panel profile-panel"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ scale: 1 }}
    >
      <div className="panel-header profile-header">
        <div className="profile-header-left">
          {!isSelf && onBackToSelfProfile && (
            <button type="button" className="profile-back-btn" onClick={onBackToSelfProfile} aria-label="Back to your profile">
              <ArrowLeft size={18} />
            </button>
          )}
          <div
            className="profile-title"
            style={{
              background: 'linear-gradient(135deg, #FF9966 0%, #FF5E62 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            {isSelf ? 'PROFILE' : displayName.toUpperCase()}
          </div>
        </div>
        <div className="time-selector" role="tablist" aria-label="Stats time window">
          {PROFILE_TIME_WINDOWS.map(({ id, label }) => {
            const active = profileTimeWindow === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`time-btn ${active ? 'active' : ''}`}
                onClick={() => setProfileTimeWindow(id)}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="panel-content profile-content">
        <div className="profile-grid">
          <div className="profile-left-stack">
            <div className="profile-card">
              <div className="profile-card-top">
                <div className="profile-avatar">
                  <img className="profile-avatar-img" src={rawPfpSrc} alt="Profile" />
                </div>
              </div>
              <div className="profile-card-name">{displayName}</div>
            </div>

            <div className="profile-mini-stats">
              <div className="profile-mini-stat">
                <div className="profile-mini-value">{socialStats.followers.toLocaleString()}</div>
                <div className="profile-mini-label">Followers</div>
              </div>
              <div className="profile-mini-stat">
                <div className="profile-mini-value">{socialStats.following.toLocaleString()}</div>
                <div className="profile-mini-label">Following</div>
              </div>
              <div className="profile-mini-stat">
                <div className="profile-mini-value">{socialStats.markets.toLocaleString()}</div>
                <div className="profile-mini-label">Markets</div>
              </div>
            </div>
          </div>

          <div className="profile-center-stack">
            <div className="profile-trading">
              <div className="profile-trading-top">
                <div className="profile-section-title">Trading Data</div>
                {isSelf && onSharePnL && (
                  <button
                    type="button"
                    className="profile-share-pnl-btn"
                    onClick={() => onSharePnL(sharePnlText)}
                    title="Share PnL to socials"
                  >
                    <Send size={14} />
                  </button>
                )}
              </div>

              <div className="profile-trading-summary">
                <div className="profile-summary-left">
                  <div className="profile-summary-label">Net PnL</div>
                  <div className={`profile-summary-value ${tradingStats.totalPnl >= 0 ? 'pos' : 'neg'}`}>
                    {formatUsdSigned(tradingStats.totalPnl)}
                  </div>
                </div>
                <div className="profile-summary-right">
                  <div className="profile-summary-kv">
                    <div className="profile-summary-k">Balance</div>
                    <div className="profile-summary-v">{formatUsd(allTimeEquity)}</div>
                  </div>
                  <div className="profile-summary-kv">
                    <div className="profile-summary-k">Buy Vol</div>
                    <div className="profile-summary-v">{formatUsd(tradingStats.buyVolume)}</div>
                  </div>
                  <div className="profile-summary-kv">
                    <div className="profile-summary-k">Sell Vol</div>
                    <div className="profile-summary-v">{formatUsd(tradingStats.sellVolume)}</div>
                  </div>
                  <div className="profile-summary-kv">
                    <div className="profile-summary-k">Win Rate</div>
                    <div className="profile-summary-v">{tradingStats.winRate.toFixed(0)}%</div>
                  </div>
                </div>
              </div>

              <div className="profile-trading-details">
                <div className="profile-detail-row">
                  <div className="profile-detail-k"># Trades</div>
                  <div className="profile-detail-v">{tradingStats.pairCount}</div>
                </div>
                <div className="profile-detail-row">
                  <div className="profile-detail-k">Avg / Trade</div>
                  <div className={`profile-detail-v ${tradingStats.avgPnl >= 0 ? 'pos' : 'neg'}`}>{formatUsdSigned(tradingStats.avgPnl)}</div>
                </div>
                <div className="profile-detail-row">
                  <div className="profile-detail-k">Best Trade</div>
                  <div className="profile-detail-v pos">{formatUsdSigned(tradingStats.bestTrade)}</div>
                </div>
                <div className="profile-detail-row">
                  <div className="profile-detail-k">Worst Trade</div>
                  <div className={`profile-detail-v ${tradingStats.worstTrade >= 0 ? 'pos' : 'neg'}`}>{formatUsdSigned(tradingStats.worstTrade)}</div>
                </div>
              </div>
            </div>

            <div className="profile-center-bottom-row">
              <ProfileHighlightsGrid rows={topTradeHighlights} thumbSeeds={highlightThumbSeeds} />

              <ProfileLootboxesStrip onOpenLootbox={() => setLootboxVideoOpen(true)} />
            </div>
          </div>

          <ProfileEquityChart trades={trades} profileTimeWindow={profileTimeWindow} />

          <ProfileTradeTape
            tapeView={tapeView}
            onTapeViewChange={setTapeView}
            windowedTrades={windowedTrades}
            historyRows={historyRows}
            onShareTrade={onShareTrade}
          />

          <ProfilePositionsList positions={positions} onOpenMarket={onOpenMarket} />

        </div>
      </div>

      <AnimatePresence>
        {lootboxVideoOpen && (
          <ProfileLootboxVideo
            videoSrc={LOOTBOX_OPEN_VIDEO_SRC}
            onClose={() => setLootboxVideoOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default ProfilePanel
