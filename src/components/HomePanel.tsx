import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeftRight, ChevronLeft, Send, TrendingUp } from 'lucide-react'
import { buildMarketCatalog } from '../data/marketCatalog'
import { useDiscoveryCatalog } from '../hooks/useDiscoveryCatalog'
import { useAppStore } from '../hooks/useAppStore'
import { CURRENT_USER_HANDLE, type MarketId } from '../data/appStore'
import './Panel.css'
import './HomePanel.css'

export type HomePanelVariant = 'fullscreen' | 'rail'

type HomePanelProps = {
  variant?: HomePanelVariant
  onOpenMarket?: (marketId: MarketId) => void
  onViewProfile?: (handle: string) => void
  onCollapse?: () => void
  side?: 'left' | 'right'
  onToggleSide?: () => void
  tickIdx?: number
}

const fmtPnl = (v: number) => {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : '+'
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(abs >= 100_000 ? 0 : 2)}K`
  return `${sign}$${Math.round(abs)}`
}

const fmtVol = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`
  return `$${Math.round(v)}`
}

const MiniSparkline = ({
  data,
  positive = true,
  width = 80,
  height = 28,
}: {
  data: number[]
  positive?: boolean
  width?: number
  height?: number
}) => {
  if (data.length < 2) return <svg width={width} height={height} aria-hidden />
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = Math.max(max - min, 0.001)
  const pad = 2
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2)
    const y = pad + (1 - (v - min) / range) * (height - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const color = positive ? '#2DD56E' : '#FF5E62'
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path
        d={`M ${pts.join(' L ')}`}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const HomePanel = ({
  variant = 'fullscreen',
  onOpenMarket,
  onViewProfile,
  onCollapse,
  side = 'left',
  onToggleSide,
}: HomePanelProps) => {
  const isRail = variant === 'rail'
  const catalog = useDiscoveryCatalog()
  const appState = useAppStore()

  // Real markets — exclude legacy video captions, sort by total volume.
  const markets = useMemo(
    () =>
      buildMarketCatalog()
        .filter((m) => m.type !== 'legacy')
        .sort((a, b) => b.volume - a.volume),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog],
  )

  // TOP PERFORMING WALLETS — top 4 users by cumulative PnL, excluding self.
  const wallets = useMemo(
    () =>
      Object.values(appState.users)
        .filter((u) => u.handle !== CURRENT_USER_HANDLE)
        .map((u) => {
          const sorted = [...u.trades].sort((a, b) => a.timestampMs - b.timestampMs)
          let running = 0
          const equity: number[] = []
          for (const t of sorted) {
            if (t.side === 'sell') running += t.pnlUsd
            equity.push(running)
          }
          const pnl = running
          return { ...u, pnl, equity: equity.length >= 2 ? equity : [0, pnl || 1] }
        })
        .sort((a, b) => b.pnl - a.pnl)
        .slice(0, 4),
    [appState.users],
  )

  // TRENDING MARKETS — top 4 by volume.
  const trendingMarkets = useMemo(() => markets.slice(0, 4), [markets])

  // TRENDING ARTICLES — generated from top markets so they feel connected.
  const articles = useMemo(() => {
    const cats = ['GLOBAL', 'CULTURE', 'VIRAL', 'PLATFORM'] as const
    const times = ['2h ago', '4h ago', '6h ago', '8h ago']
    return markets.slice(0, 4).map((m, i) => {
      const first3 = m.name.split(' ').slice(0, 3).join(' ')
      const titles = [
        `${first3}: virality bets heat up`,
        `Why ${m.name.split(' ')[0]} clips are taking over`,
        `The ${m.name.split(' ')[0].toLowerCase()} phenomenon explained`,
        `Virality market trends this week`,
      ]
      return {
        id: `article-${m.id}`,
        category: cats[i],
        title: titles[i],
        timeAgo: times[i],
        thumbnailUrl: m.previews[0]?.thumbnailUrl,
        marketId: m.id,
      }
    })
  }, [markets])

  // FRIENDSKIS ACTIVITY — 5 most recent trades across all friendskis.
  const friendActivity = useMemo(() => {
    const now = Date.now()
    const fmtAgo = (ms: number) => {
      const d = now - ms
      const mins = Math.round(d / 60_000)
      if (mins < 60) return `${mins}m ago`
      const hrs = Math.round(d / 3_600_000)
      if (hrs < 24) return `${hrs}h ago`
      return `${Math.round(hrs / 24)}d ago`
    }
    type Item = {
      key: string
      timestampMs: number
      handle: string
      avatar: string
      action: string
      market: string
      outcome: string
      outcomeClass: 'pos' | 'neg' | 'yes' | 'no'
      amount: string
      timeAgo: string
      marketId?: MarketId
    }
    const items: Item[] = []
    for (const user of Object.values(appState.users)) {
      if (user.handle === CURRENT_USER_HANDLE) continue
      for (const t of user.trades.slice(0, 4)) {
        const isSell = t.side === 'sell'
        const isProfit = t.pnlUsd > 0
        const action = isSell
          ? isProfit
            ? 'Took profit on'
            : 'Cut losses on'
          : t.outcome === 'YES'
            ? 'Placed a YES bet on'
            : 'Placed a NO bet on'
        const outcome = isSell
          ? `${isProfit ? '+' : ''}${fmtVol(Math.abs(t.pnlUsd))}`
          : `${t.outcome} ${(t.price * 100).toFixed(1)}¢`
        const outcomeClass: Item['outcomeClass'] = isSell
          ? isProfit
            ? 'pos'
            : 'neg'
          : t.outcome === 'YES'
            ? 'yes'
            : 'no'
        const amount =
          isSell && isProfit
            ? `$${Math.round(t.sizeUsd - t.pnlUsd)} → $${Math.round(t.sizeUsd)}`
            : `$${Math.round(t.sizeUsd)}`
        const mkt = markets.find((m) => m.name === t.market)
        const marketShort = t.market.length > 24 ? t.market.slice(0, 24) + '…' : t.market
        items.push({
          key: t.id,
          timestampMs: t.timestampMs,
          handle: user.handle,
          avatar: user.avatar,
          action,
          market: marketShort,
          outcome,
          outcomeClass,
          amount,
          timeAgo: fmtAgo(t.timestampMs),
          marketId: mkt?.id,
        })
      }
    }
    return items.sort((a, b) => b.timestampMs - a.timestampMs).slice(0, 5)
  }, [appState.users, markets])

  const selfUser = appState.users[CURRENT_USER_HANDLE]

  return (
    <motion.div
      className={`panel home-panel home-panel--${variant}`}
      style={{ height: '100%', minHeight: 0 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      {/* ── Header ── */}
      <div className="panel-header home-header">
        <div className="home-header-left">
          {isRail && (
            <button
              type="button"
              className="home-collapse-btn"
              onClick={onCollapse}
              aria-label="Hide feed"
            >
              <ChevronLeft size={18} strokeWidth={2.25} />
            </button>
          )}
          <div className="home-header-title-group">
            <span className="home-header-wordmark">HOME</span>
            <span className="home-header-sub">
              {isRail ? (
                <>
                  @{CURRENT_USER_HANDLE}
                  <span className="home-notif-badge" aria-label="1 notification">
                    1
                  </span>
                </>
              ) : (
                <>
                  Welcome back, {CURRENT_USER_HANDLE}
                  <span className="home-notif-badge" aria-label="1 notification">
                    1
                  </span>
                </>
              )}
            </span>
          </div>
        </div>
        <div className="home-header-actions">
          <button
            type="button"
            className="home-profile-btn"
            onClick={() => onViewProfile?.(CURRENT_USER_HANDLE)}
            aria-label="View profile"
          >
            <img
              src={selfUser?.avatar ?? '/Stems/betskuu.png'}
              alt=""
              className="home-profile-icon"
            />
          </button>
          {isRail && onToggleSide && (
            <button
              type="button"
              className="home-side-toggle"
              onClick={onToggleSide}
              title={side === 'left' ? 'Move feed to right' : 'Move feed to left'}
              aria-label="Toggle feed side"
            >
              <ArrowLeftRight size={16} strokeWidth={2.25} />
            </button>
          )}
        </div>
      </div>

      {/* ── Composer bar ── */}
      <div className="home-composer">
        <img
          src={selfUser?.avatar ?? '/Stems/betskuu.png'}
          alt=""
          className="home-composer-avatar"
        />
        <span className="home-composer-placeholder">What's happening in markets?</span>
        <button type="button" className="home-composer-send" aria-label="Post">
          <Send size={15} strokeWidth={2} />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="panel-content home-content">
        <div className="home-scroll">

          {/* ── TOP PERFORMING WALLETS ── */}
          <section className="home-sect" aria-label="Top performing wallets">
            <div className="home-sect-head">
              <span className="home-sect-title">TOP PERFORMING WALLETS</span>
              <button type="button" className="home-view-all">View all</button>
            </div>
            <div className="home-wallets-track">
              {wallets.map((w, rank) => (
                <button
                  key={w.handle}
                  type="button"
                  className="home-wallet-card"
                  onClick={() => onViewProfile?.(w.handle)}
                  aria-label={`View ${w.handle}`}
                >
                  <span className="home-wallet-rank">{rank + 1}</span>
                  <img src={w.avatar} alt="" className="home-wallet-avatar" />
                  <span className="home-wallet-name">{w.handle}</span>
                  <span className="home-wallet-wagers">{w.markets} wagers</span>
                  <span className={`home-wallet-pnl ${w.pnl >= 0 ? 'pos' : 'neg'}`}>
                    {fmtPnl(w.pnl)}
                  </span>
                  <span className="home-wallet-pnl-label">24h PNL</span>
                  <MiniSparkline data={w.equity} positive={w.pnl >= 0} width={96} height={22} />
                </button>
              ))}
            </div>
          </section>

          {/* ── TRENDING MARKETS ── */}
          <section className="home-sect" aria-label="Trending markets">
            <div className="home-sect-head">
              <span className="home-sect-title">TRENDING MARKETS</span>
              <button
                type="button"
                className="home-view-all"
                onClick={() => markets[0] && onOpenMarket?.(markets[0].id)}
              >
                View all
              </button>
            </div>
            <div className="home-markets-list">
              {trendingMarkets.map((m) => {
                const chartData =
                  m.chart.length > 1 ? m.chart.map((p) => p.value) : [m.yesOdds, m.yesOdds]
                const positive = chartData[chartData.length - 1] >= chartData[0]
                return (
                  <button
                    key={m.id}
                    type="button"
                    className="home-market-row"
                    onClick={() => onOpenMarket?.(m.id)}
                    aria-label={`Open ${m.name}`}
                  >
                    <img
                      src={m.previews[0]?.thumbnailUrl ?? '/Stems/betskuu.png'}
                      alt=""
                      className="home-market-thumb"
                      loading="lazy"
                    />
                    <div className="home-market-info">
                      <div className="home-market-name">{m.name}</div>
                      <div className="home-market-subprice">
                        {m.yesOdds.toFixed(1)}¢ YES · {m.noOdds.toFixed(1)}¢ NO
                      </div>
                    </div>
                    <span className="home-market-spark" aria-hidden>
                      <MiniSparkline data={chartData} positive={positive} width={56} height={22} />
                    </span>
                    <div className="home-market-vol">
                      <span className="home-market-vol-amt">{fmtVol(m.volume24h)}</span>
                      <span className="home-market-vol-label">Vol.</span>
                    </div>
                    <div className="home-market-pills">
                      <div className="home-price-pill">
                        <span className="home-price-pill-val">{Math.round(m.yesOdds)}¢</span>
                        <span className="home-price-pill-tag yes">YES</span>
                      </div>
                      <div className="home-price-pill">
                        <span className="home-price-pill-val">{Math.round(m.noOdds)}¢</span>
                        <span className="home-price-pill-tag no">NO</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* ── TRENDING ARTICLES ── */}
          <section className="home-sect" aria-label="Trending articles">
            <div className="home-sect-head">
              <span className="home-sect-title">TRENDING ARTICLES</span>
              <button type="button" className="home-view-all">View all</button>
            </div>
            <div className="home-articles-track">
              {articles.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="home-article-card"
                  onClick={() => a.marketId && onOpenMarket?.(a.marketId)}
                >
                  <img
                    src={a.thumbnailUrl ?? '/Stems/betskuu.png'}
                    alt=""
                    className="home-article-bg"
                    loading="lazy"
                  />
                  <div className="home-article-overlay" aria-hidden />
                  <span className="home-article-tag">{a.category}</span>
                  <p className="home-article-title">{a.title}</p>
                  <span className="home-article-time">{a.timeAgo}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ── FRIENDSKIS ACTIVITY ── */}
          <section className="home-sect" aria-label="Friendskis activity">
            <div className="home-sect-head">
              <span className="home-sect-title">FRIENDSKIS ACTIVITY</span>
              <button type="button" className="home-view-all">View all</button>
            </div>
            <div className="home-activity-list">
              {friendActivity.map((item) => (
                <div key={item.key} className="home-activity-row">
                  <button
                    type="button"
                    className="home-activity-avatar-btn"
                    onClick={() => onViewProfile?.(item.handle)}
                    aria-label={`View ${item.handle}`}
                  >
                    <img src={item.avatar} alt="" className="home-activity-avatar" />
                  </button>
                  <button
                    type="button"
                    className="home-activity-body"
                    onClick={() => item.marketId && onOpenMarket?.(item.marketId)}
                  >
                    <span className="home-activity-handle">{item.handle}</span>
                    <span className="home-activity-desc">
                      {item.action} {item.market}
                    </span>
                    <span className="home-activity-meta">
                      {item.amount} · {item.timeAgo}
                    </span>
                  </button>
                  <span className={`home-activity-outcome home-activity-outcome--${item.outcomeClass}`}>
                    {item.outcome}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Explore CTA ── */}
          <div className="home-explore-wrap">
            <button
              type="button"
              className="home-explore-cta"
              onClick={() => markets[0] && onOpenMarket?.(markets[0].id)}
            >
              <TrendingUp size={15} strokeWidth={2.2} className="home-explore-icon" />
              <span className="home-explore-label">Explore all markets</span>
            </button>
          </div>

        </div>
      </div>
    </motion.div>
  )
}

export default HomePanel
