import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, Bell, Pencil, Settings } from 'lucide-react'
import { useAppStore } from '../hooks/useAppStore'
import { useDiscoveryCatalog } from '../hooks/useDiscoveryCatalog'
import { CURRENT_USER_HANDLE } from '../data/appStore'
import { buildMarketCatalog, type Market } from '../data/marketCatalog'
import type { MarketId } from '../data/appStore'
import type { ProfileTrade } from '../data/profileMock'
import { tradeRecordsToProfileTrades } from '../utils/tradeHistory'
import { onAvatarError, resolveProfileAvatar } from '../utils/avatarUrl'
import {
  PROFILE_GAMIFICATION,
  PROFILE_TIME_WINDOWS,
  type ProfileTimeWindow
} from '../data/profileConstants'
import {
  LOOTBOX_OPEN_VIDEO_SRC
} from '../data/profileLootboxes'
import { useHomeMobileLayout } from '../hooks/useHomeMobileLayout'
import { formatUsd, formatUsdSigned } from '../utils/profileFormat'
import ProfileEquityChart from './profile/ProfileEquityChart'
import ProfileHighlightsGrid from './profile/ProfileHighlightsGrid'
import ProfileLootboxesStrip from './profile/ProfileLootboxesStrip'
import ProfileLootboxVideo from './profile/ProfileLootboxVideo'
import ProfilePositionsList, { type ProfilePosition } from './profile/ProfilePositionsList'
import ProfileTradeTape from './profile/ProfileTradeTape'
import NotificationSettingsSection from './NotificationSettingsSection'
import './Panel.css'
import './ProfilePanel.css'

type ProfileMobileSection = 'profile' | 'trading'

const ProfilePanel = ({
  onShareTrade,
  viewingHandle = null,
  onBackToSelfProfile,
  onOpenMarket
}: {
  onShareTrade?: (trade: {
    marketId?: string
    title: string
    side: 'YES' | 'NO'
    entry: number
    exit: number
    pnlUsd: number
    pnlPct: number
    chart: { value: number; timestamp: number }[]
    thumbnailUrls?: string[]
    thumbnailSrc?: string
    thumbnailFallbackSrc?: string
  }) => void
  viewingHandle?: string | null
  onBackToSelfProfile?: () => void
  onOpenMarket?: (marketId: MarketId) => void
}) => {
  const appState = useAppStore()
  const catalog = useDiscoveryCatalog()
  const markets = useMemo(() => buildMarketCatalog(), [catalog])
  const marketById = useMemo(() => new Map<string, Market>(markets.map((m) => [m.id, m])), [markets])
  const marketByName = useMemo(() => new Map<string, Market>(markets.map((m) => [m.name, m])), [markets])
  const marketThumb = (m: Market | undefined) => m?.previews.find((p) => p.thumbnailUrl)?.thumbnailUrl
  const isSelf = !viewingHandle || viewingHandle === CURRENT_USER_HANDLE
  const profileUser = isSelf
    ? appState.users[CURRENT_USER_HANDLE]
    : appState.users[viewingHandle] ?? appState.users[CURRENT_USER_HANDLE]

  const rawPfpSrc = resolveProfileAvatar(profileUser?.handle ?? '', profileUser?.avatar)
  const displayName = profileUser?.displayName ?? CURRENT_USER_HANDLE
  const [profileTimeWindow, setProfileTimeWindow] = useState<ProfileTimeWindow>('30d')
  const [tapeView, setTapeView] = useState<'activity' | 'history'>('activity')
  const [lootboxVideoOpen, setLootboxVideoOpen] = useState(false)
  const isMobileLayout = useHomeMobileLayout()
  const [notifSettingsOpen, setNotifSettingsOpen] = useState(false)
  const [mobileSection, setMobileSection] = useState<ProfileMobileSection>('profile')
  const mobileProfileSectionRef = useRef<HTMLDivElement>(null)
  const mobileTradingSectionRef = useRef<HTMLDivElement>(null)

  const setMobileSectionAndScrollTop = (section: ProfileMobileSection) => {
    setMobileSection(section)
    requestAnimationFrame(() => {
      const el = section === 'profile' ? mobileProfileSectionRef.current : mobileTradingSectionRef.current
      el?.scrollTo({ top: 0 })
    })
  }

  const trades = useMemo<ProfileTrade[]>(() => {
    if (!isSelf) {
      return (profileUser?.trades ?? []).map((t) => {
        const m = marketByName.get(t.market)
        return {
          id: t.id,
          timestamp: t.timestamp,
          timestampMs: t.timestampMs,
          market: m?.name ?? t.market,
          marketId: m?.id,
          thumbnailUrl: marketThumb(m),
          side: t.side,
          price: t.price,
          sizeUsd: t.sizeUsd,
          pnlUsd: t.pnlUsd,
          pairId: t.pairId,
          outcome: t.outcome
        }
      })
    }

    return tradeRecordsToProfileTrades(appState.trades, (marketId) => {
      const m = marketById.get(marketId)
      return { name: m?.name, thumbnailUrl: marketThumb(m) }
    })
  }, [isSelf, profileUser?.trades, appState.trades, marketById, marketByName])

  const windowedTrades = useMemo(() => {
    const now    = Date.now()
    const DAY_MS = 24 * 60 * 60 * 1000
    const cutoff =
      profileTimeWindow === '1d'  ? now -  1 * DAY_MS
      : profileTimeWindow === '7d'  ? now -  7 * DAY_MS
      : profileTimeWindow === '30d' ? now - 30 * DAY_MS
      : 0
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
      marketId?: string
      thumbnailUrl?: string
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
        marketId: buy.marketId,
        thumbnailUrl: buy.thumbnailUrl,
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

  const topTradeHighlights = useMemo(() => {
    const map = new Map<string, { buy?: ProfileTrade; sell?: ProfileTrade }>()
    for (const t of trades) {
      const cur = map.get(t.pairId) ?? {}
      if (t.side === 'buy') cur.buy = t
      else cur.sell = t
      map.set(t.pairId, cur)
    }
    const rows: { market: string; thumbnailUrl?: string; buyPrice: number; sellPrice: number; pnlUsd: number }[] = []
    for (const { buy, sell } of map.values()) {
      if (!buy || !sell) continue
      rows.push({
        market: buy.market,
        thumbnailUrl: buy.thumbnailUrl,
        buyPrice: buy.price,
        sellPrice: sell.price,
        pnlUsd: sell.pnlUsd
      })
    }
    rows.sort((a, b) => b.pnlUsd - a.pnlUsd)
    return rows.slice(0, 3).map((row) => ({
      displayTitle: row.market,
      thumbnailUrl: row.thumbnailUrl,
      buyPrice: row.buyPrice,
      sellPrice: row.sellPrice,
      pnlUsd: row.pnlUsd
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
    const pairCount  = sellTrades.length
    const totalPnl   = sellTrades.reduce((acc, t) => acc + t.pnlUsd, 0)
    const buyVolume  = windowedTrades.reduce((acc, t) => acc + (t.side === 'buy'  ? t.sizeUsd : 0), 0)
    const sellVolume = windowedTrades.reduce((acc, t) => acc + (t.side === 'sell' ? t.sizeUsd : 0), 0)
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

  const positions = useMemo<ProfilePosition[]>(() => {
    if (!isSelf) {
      return (profileUser?.positions ?? []).map((p) => ({
        id: p.id,
        marketId: p.marketId,
        market: marketById.get(p.marketId)?.name ?? p.marketName,
        side: p.side,
        fillPrice: p.fillPrice,
        heldUsd: p.heldUsd,
        pnlPct: p.pnlPct
      }))
    }

    return Object.values(appState.positions).map((pos) => {
      const market = marketById.get(pos.marketId)
      const odds = pos.side === 'long' ? market?.yesOdds ?? 50 : market?.noOdds ?? 50
      const currentPrice = odds / 100
      const heldUsd = pos.shares * currentPrice
      const rawPnl = ((currentPrice - pos.avgEntry) / Math.max(pos.avgEntry, 0.001)) * 100
      return {
        id: pos.marketId,
        marketId: pos.marketId,
        market: market?.name ?? pos.marketName,
        side: pos.side === 'long' ? 'YES' : 'NO',
        fillPrice: pos.avgEntry,
        heldUsd: Number(heldUsd.toFixed(0)),
        pnlPct: Number((pos.side === 'long' ? rawPnl : -rawPnl).toFixed(1))
      }
    })
  }, [isSelf, profileUser?.positions, appState.positions, marketById])

  const openLootbox = () => setLootboxVideoOpen(true)

  const profileCard = (
    <div className="profile-card">
      {isSelf && (
        <button type="button" className="profile-edit-btn" title="Edit profile" aria-label="Edit profile">
          <Pencil size={13} />
        </button>
      )}

      <div className="profile-avatar">
        <img className="profile-avatar-img" src={rawPfpSrc} alt="Profile" onError={onAvatarError} />
      </div>

      <div className="profile-identity-name-row">
        <span className="profile-card-name">{displayName}</span>
        <BadgeCheck className="profile-verified-icon" size={14} aria-hidden />
      </div>

      <div className="profile-identity-meta">
        <span className="profile-trader-badge">{PROFILE_GAMIFICATION.badge}</span>
        <span className="profile-level">Level {PROFILE_GAMIFICATION.level}</span>
      </div>

      <div className="profile-xp-block">
        <div className="profile-xp-track" role="progressbar" aria-valuenow={PROFILE_GAMIFICATION.xpCurrent} aria-valuemin={0} aria-valuemax={PROFILE_GAMIFICATION.xpMax} aria-label="XP progress">
          <div
            className="profile-xp-fill"
            style={{ width: `${(PROFILE_GAMIFICATION.xpCurrent / PROFILE_GAMIFICATION.xpMax) * 100}%` }}
          />
        </div>
        <div className="profile-xp-label">
          {PROFILE_GAMIFICATION.xpCurrent.toLocaleString()} / {PROFILE_GAMIFICATION.xpMax.toLocaleString()} XP
        </div>
      </div>

      <div className="profile-social-stats">
        <div className="profile-social-stat-row">
          <span className="profile-social-label">Followers</span>
          <span className="profile-social-value">{socialStats.followers.toLocaleString()}</span>
        </div>
        <div className="profile-social-stat-row">
          <span className="profile-social-label">Following</span>
          <span className="profile-social-value">{socialStats.following.toLocaleString()}</span>
        </div>
        <div className="profile-social-stat-row">
          <span className="profile-social-label">Markets</span>
          <span className="profile-social-value">{socialStats.markets.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )

  const tradingBlock = (
    <div className="profile-trading">
      <div className="profile-trading-top">
        <div className="profile-section-title">Trading Data</div>
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
  )

  const lootboxesStrip = <ProfileLootboxesStrip onOpenLootbox={openLootbox} />

  const highlightsGrid = <ProfileHighlightsGrid rows={topTradeHighlights} />

  const equityChart = (
    <ProfileEquityChart trades={trades} profileTimeWindow={profileTimeWindow} />
  )

  const tradeTape = (
    <ProfileTradeTape
      tapeView={tapeView}
      onTapeViewChange={setTapeView}
      windowedTrades={windowedTrades}
      historyRows={historyRows}
      onShareTrade={onShareTrade}
    />
  )

  const positionsList = (
    <ProfilePositionsList positions={positions} onOpenMarket={onOpenMarket} />
  )

  const notificationSettingsPopup =
    isSelf && notifSettingsOpen ? (
      <div
        className="profile-notif-settings-overlay"
        role="presentation"
        onClick={() => setNotifSettingsOpen(false)}
      >
        <div
          id="profile-notif-settings"
          className="profile-notif-settings-popup"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notif-settings-heading"
          onClick={(e) => e.stopPropagation()}
        >
          <NotificationSettingsSection onClose={() => setNotifSettingsOpen(false)} />
        </div>
      </div>
    ) : null

  useEffect(() => {
    if (!notifSettingsOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNotifSettingsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [notifSettingsOpen])

  return (
    <motion.div
      className="panel profile-panel"
      initial={isMobileLayout ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: isMobileLayout ? 0 : 0.25 }}
      whileHover={{ scale: 1 }}
    >
      <div className="panel-header profile-header">
        <div className="profile-header-left">
          {!isSelf && onBackToSelfProfile && (
            <button type="button" className="betski-back profile-back-btn" onClick={onBackToSelfProfile} aria-label="Back to your profile">
              <ArrowLeft size={20} strokeWidth={2} />
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
        <div className="profile-header-right">
          {isSelf && (
            <button
              type="button"
              className={`profile-notif-bell-btn${notifSettingsOpen ? ' is-active' : ''}`}
              onClick={() => setNotifSettingsOpen((open) => !open)}
              aria-label="Notification settings"
              aria-expanded={notifSettingsOpen}
              aria-controls="profile-notif-settings"
            >
              <span className="profile-notif-settings-icon" aria-hidden>
                <Bell size={17} strokeWidth={2} />
                <Settings size={9} strokeWidth={2.5} className="profile-notif-settings-gear" />
              </span>
            </button>
          )}
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
      </div>

      <div className="panel-content profile-content">
        {isMobileLayout ? (
          <>
            <div className="profile-mobile-nav" role="tablist" aria-label="Profile sections">
              <button
                type="button"
                role="tab"
                aria-selected={mobileSection === 'profile'}
                className={`profile-mobile-nav-btn ${mobileSection === 'profile' ? 'active' : ''}`}
                onClick={() => setMobileSectionAndScrollTop('profile')}
              >
                Profile
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobileSection === 'trading'}
                className={`profile-mobile-nav-btn ${mobileSection === 'trading' ? 'active' : ''}`}
                onClick={() => setMobileSectionAndScrollTop('trading')}
              >
                Trading
              </button>
            </div>

            <div className="profile-mobile-body">
              <div
                ref={mobileProfileSectionRef}
                className={`profile-mobile-section ${mobileSection === 'profile' ? 'is-active' : ''}`}
              >
                {profileCard}
                {lootboxesStrip}
              </div>
              <div
                ref={mobileTradingSectionRef}
                className={`profile-mobile-section profile-mobile-section--trading ${mobileSection === 'trading' ? 'is-active' : ''}`}
              >
                {tradingBlock}
                {equityChart}
                {highlightsGrid}
                {tradeTape}
                {positionsList}
              </div>
            </div>
          </>
        ) : (
          <div className="profile-grid">
            {profileCard}
            {tradingBlock}
            {equityChart}
            <div className="profile-center-bottom-row">
              {highlightsGrid}
              {lootboxesStrip}
            </div>
            {tradeTape}
            {positionsList}
          </div>
        )}
      </div>

      {notificationSettingsPopup}

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
