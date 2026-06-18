import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  ChevronLeft,
  Crosshair,
  Flame,
  Radio,
  Send,
  Sparkles,
  TrendingUp,
  Trophy,
  UserRound,
  Zap
} from 'lucide-react'
import MarketShareCard from './MarketShareCard'
import { clamp } from '../utils/math'
import { mulberry32 } from '../utils/random'
import './Panel.css'
import './HomePanel.css'

export type HomePanelVariant = 'fullscreen' | 'rail'

type FeedItem =
  | {
      kind: 'friend_trade'
      id: string
      friend: string
      market: string
      side: 'YES' | 'NO'
      notionalUsd: number
      ago: string
    }
  | {
      kind: 'wallet_spotlight'
      id: string
      label: 'Insider' | 'KOL' | 'Whale'
      handle: string
      pnlUsd: number
      winRate: number
      tag: string
    }
  | {
      kind: 'meme_article'
      id: string
      title: string
      subtitle: string
      mood: 'chaos' | 'degen' | 'meta'
    }
  | {
      kind: 'sniper'
      id: string
      source: string
      headline: string
      videoId: number
      fresh: boolean
    }
  | {
      kind: 'market_pulse'
      id: string
      videoId: number
      title: string
      yesOdds: number
      chart: { value: number; timestamp: number }[]
      timeLeftLabel: string
    }
  | {
      kind: 'viral_burst'
      id: string
      heat: number
      title: string
      body: string
      videoId: number
    }
  | {
      kind: 'group_ping'
      id: string
      group: string
      text: string
    }

type PodiumTriple = {
  second: { name: string; score: string; detail: string }
  first: { name: string; score: string; detail: string }
  third: { name: string; score: string; detail: string }
}

const shuffle = <T,>(arr: T[], rng: () => number) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const formatUsd = (value: number) => {
  const sign = value < 0 ? '-' : '+'
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`
  return `${sign}$${abs.toFixed(0)}`
}

const quickShare = (snippet: string) => {
  const text = `Betski — ${snippet}`
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text).catch(() => {})
  }
}

const ShareIconButton = ({ label, title = 'Share' }: { label: string; title?: string }) => (
  <button type="button" className="home-share-btn" title={title} aria-label={title} onClick={() => quickShare(label)}>
    <Send size={14} strokeWidth={2.25} />
  </button>
)

/** Podium layout: 2nd — 1st — 3rd (same neutral styling; #1 emphasized slightly) */
const PodiumTop3 = ({ triple }: { triple: PodiumTriple }) => (
  <div className="home-podium" role="list">
    <div className="home-podium-slot home-podium-slot--2" role="listitem">
      <div className="home-podium-rank" aria-hidden>
        2
      </div>
      <div className="home-podium-body">
        <div className="home-podium-name">{triple.second.name}</div>
        <div className="home-podium-score">{triple.second.score}</div>
        <div className="home-podium-detail">{triple.second.detail}</div>
      </div>
      <div className="home-podium-pedestal home-podium-pedestal--2" aria-hidden />
    </div>

    <div className="home-podium-slot home-podium-slot--1" role="listitem">
      <div className="home-podium-rank home-podium-rank--lead" aria-hidden>
        1
      </div>
      <div className="home-podium-body home-podium-body--lead">
        <div className="home-podium-name">{triple.first.name}</div>
        <div className="home-podium-score">{triple.first.score}</div>
        <div className="home-podium-detail">{triple.first.detail}</div>
      </div>
      <div className="home-podium-pedestal home-podium-pedestal--1" aria-hidden />
    </div>

    <div className="home-podium-slot home-podium-slot--3" role="listitem">
      <div className="home-podium-rank" aria-hidden>
        3
      </div>
      <div className="home-podium-body">
        <div className="home-podium-name">{triple.third.name}</div>
        <div className="home-podium-score">{triple.third.score}</div>
        <div className="home-podium-detail">{triple.third.detail}</div>
      </div>
      <div className="home-podium-pedestal home-podium-pedestal--3" aria-hidden />
    </div>
  </div>
)

const LEADER_MARKETS: PodiumTriple = {
  first: { name: 'Skibidi Toilet still #1?', score: 'King of the hill', detail: '$2.4M vol · 24h' },
  second: { name: 'NPC stream comeback in 48h?', score: 'Challenger', detail: '$1.9M vol' },
  third: { name: 'GRWM: Clean Girl 2.0', score: 'Heating up', detail: '$1.1M vol' }
}

const LEADER_WALLETS: PodiumTriple = {
  first: { name: '@MacroMuse', score: '+$186K · 7d', detail: 'KOL · 71% WR' },
  second: { name: 'desk.sol', score: '+$142K · 7d', detail: 'Whale' },
  third: { name: '0x7a…4c1', score: '+$98K · 7d', detail: 'Insider' }
}

const LEADER_ARTICLES: PodiumTriple = {
  first: { name: 'Meme radar: the ticker that won’t die', score: '1.2M views', detail: 'Last 48h' },
  second: { name: 'POV: you fade the rip again', score: '840K views', detail: 'Culture' },
  third: { name: 'Girl dinner meta is back (?)', score: '612K views', detail: 'Meta' }
}

function buildFeedPool(rng: () => number): FeedItem[] {
  const friends = ['MarkDiTob', 'BenBetski', 'moggorrr', 'epstein', 'DeskWhale', 'ClipQueen']
  const mkChart = (seed: number) => {
    const now = Date.now()
    return Array.from({ length: 24 }, (_, i) => ({
      value: clamp(22 + Math.sin((i + seed) * 0.33) * 20 + (i % 5) * 1.2, 1, 99),
      timestamp: now - (23 - i) * 60 * 60 * 1000
    }))
  }

  const friendTrades: FeedItem[] = Array.from({ length: 10 }, (_, i) => ({
    kind: 'friend_trade',
    id: `ft-${i}`,
    friend: friends[i % friends.length],
    market: [
      'NPC stream comeback in 48h?',
      'Skibidi Toilet still #1?',
      'GRWM: Clean Girl 2.0 still trending?',
      'Taylor Swift Eras Tour clips flood?',
      'Girl Dinner still viral?'
    ][i % 5],
    side: rng() > 0.45 ? 'YES' : 'NO',
    notionalUsd: Math.round(400 + rng() * 5200),
    ago: `${5 + Math.floor(rng() * 55)}m ago`
  }))

  const wallets: FeedItem[] = Array.from({ length: 8 }, (_, i) => {
    const labels: Array<'Insider' | 'KOL' | 'Whale'> = ['Insider', 'KOL', 'Whale']
    return {
      kind: 'wallet_spotlight',
      id: `w-${i}`,
      label: labels[i % 3],
      handle: ['0x7a…4c1', '@MacroMuse', 'desk.sol', '0xWhale…9f', '@ChainBanter', 'vault.eth', '@KOLDesk', '0x99…aa'][i % 8],
      pnlUsd: Math.round(12000 + rng() * 180000),
      winRate: Math.round(52 + rng() * 38),
      tag: ['On fire', 'New', 'Tracked', 'Top 10', 'Sniper', 'Hot', 'Alpha', 'OG'][i % 8]
    } as FeedItem
  })

  const memes: FeedItem[] = [
    { kind: 'meme_article', id: 'm0', title: 'Meme radar: the ticker that won’t die', subtitle: 'Volume + chatter spiking in the last hour', mood: 'chaos' as const },
    { kind: 'meme_article', id: 'm1', title: 'POV: you fade the rip again', subtitle: 'Narrative velocity vs. actual fills', mood: 'degen' as const },
    { kind: 'meme_article', id: 'm2', title: 'Girl dinner meta is back (?)', subtitle: 'Sentiment split 58/42 on the tape', mood: 'meta' as const },
    { kind: 'meme_article', id: 'm3', title: 'Random frog coin mentions +420%', subtitle: 'Classic weekend casino behaviour', mood: 'chaos' as const },
    { kind: 'meme_article', id: 'm4', title: '“Trust the process” — which process?', subtitle: 'Crowd laughs, order book doesn’t', mood: 'degen' as const }
  ]

  const snipers: FeedItem[] = [
    { kind: 'sniper', id: 's0', source: 'X / @MacroMuse', headline: 'Breaking: unexpected collab clip — market incoming', videoId: 2, fresh: true },
    { kind: 'sniper', id: 's1', source: 'IG / reels', headline: 'Viral 12s loop — sentiment flipping fast', videoId: 1, fresh: true },
    { kind: 'sniper', id: 's2', source: 'X / @ChainBanter', headline: 'KOL quote-tweet storm on the same ticker', videoId: 4, fresh: false },
    { kind: 'sniper', id: 's3', source: 'TikTok / follow', headline: 'Sound went viral — derivative clips everywhere', videoId: 3, fresh: true },
    { kind: 'sniper', id: 's4', source: 'YT / Shorts', headline: 'Thumbnail bait → odds repricing in 6m', videoId: 5, fresh: false }
  ]

  const markets: FeedItem[] = [
    {
      kind: 'market_pulse',
      id: 'mp1',
      videoId: 1,
      title: 'Skibidi Toilet still #1 this week?',
      yesOdds: 68,
      chart: mkChart(2),
      timeLeftLabel: '36h 18m'
    },
    {
      kind: 'market_pulse',
      id: 'mp2',
      videoId: 3,
      title: 'NPC stream comeback in 48h?',
      yesOdds: 44,
      chart: mkChart(5),
      timeLeftLabel: '12h 04m'
    }
  ]

  const virals: FeedItem[] = [
    {
      kind: 'viral_burst',
      id: 'v0',
      heat: 96,
      title: 'Viral right now',
      body: '“Will this clip hit 10M views before resolution?” — odds moving fast.',
      videoId: 2
    },
    {
      kind: 'viral_burst',
      id: 'v1',
      heat: 88,
      title: 'Tape is loud',
      body: 'Same ticker, three platforms — sentiment converging.',
      videoId: 1
    }
  ]

  const pings: FeedItem[] = [
    { kind: 'group_ping', id: 'g0', group: 'Betskiing', text: 'Pinned: entry levels + risk caps for today' },
    { kind: 'group_ping', id: 'g1', group: 'Liquidity Lounge', text: 'New playbook: fade the first rip, buy the dip' },
    { kind: 'group_ping', id: 'g2', group: 'Alpha Desk', text: 'Someone just swept YES on Video 3' }
  ]

  return [...friendTrades, ...wallets, ...memes, ...snipers, ...markets, ...virals, ...pings]
}

type HomePanelProps = {
  variant?: HomePanelVariant
  onOpenMarket?: (videoId: number) => void
  onViewProfile?: (handle: string) => void
  onCollapse?: () => void
  side?: 'left' | 'right'
  onToggleSide?: () => void
  /** Monotonic heartbeat from Layout. New items pop in periodically when this advances. */
  tickIdx?: number
}

/** Add a new item to the top of the live mix every N ticks (slow market feel). */
const HOME_FEED_TICKS_PER_INSERT = 4
/** Cap the live items pool so memory doesn't grow unbounded. */
const HOME_FEED_LIVE_MAX = 10

const HomePanel = ({ variant = 'fullscreen', onOpenMarket, onViewProfile, onCollapse, side = 'left', onToggleSide, tickIdx = 0 }: HomePanelProps) => {
  const [extraFeedBlocks, setExtraFeedBlocks] = useState(0)
  const [liveItems, setLiveItems] = useState<FeedItem[]>([])
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const scrollRootRef = useRef<HTMLDivElement | null>(null)

  const isRail = variant === 'rail'

  const mixedFeed = useMemo(() => {
    const rng = mulberry32(77209)
    const pool = buildFeedPool(rng)
    return shuffle(pool, rng)
  }, [])

  // Prepend a fresh item to the "Live mix" section every few ticks.
  useEffect(() => {
    if (tickIdx === 0 || tickIdx % HOME_FEED_TICKS_PER_INSERT !== 0) return
    const rng = mulberry32(900_000 + tickIdx * 9973)
    const pool = buildFeedPool(rng)
    const fresh = pool[Math.floor(rng() * pool.length)]
    const next: FeedItem = { ...fresh, id: `${fresh.id}-live-${tickIdx}` }
    setLiveItems(prev => [next, ...prev].slice(0, HOME_FEED_LIVE_MAX))
  }, [tickIdx])

  const extraItems = useMemo(() => {
    if (extraFeedBlocks === 0) return [] as FeedItem[]
    const rng = mulberry32(77209 + extraFeedBlocks * 9973)
    const pool = buildFeedPool(rng)
    return shuffle(pool, rng).slice(0, 6).map((item, j) => ({
      ...item,
      id: `${item.id}-x${extraFeedBlocks}-${j}`
    }))
  }, [extraFeedBlocks])

  const loadCooldownRef = useRef(false)

  useEffect(() => {
    const root = scrollRootRef.current
    const target = sentinelRef.current
    if (!root || !target) return
    const obs = new IntersectionObserver(
      entries => {
        if (!entries.some(e => e.isIntersecting)) return
        if (loadCooldownRef.current) return
        loadCooldownRef.current = true
        setExtraFeedBlocks(n => (n >= 10 ? n : n + 1))
        window.setTimeout(() => {
          loadCooldownRef.current = false
        }, 450)
      },
      { root, rootMargin: '240px', threshold: 0 }
    )
    obs.observe(target)
    return () => obs.disconnect()
  }, [])

  const renderCard = (item: FeedItem, index: number) => {
    // Live-inserted items get id ending in "-live-<n>"; they should land
    // immediately, while initial mount cards keep their cascaded delay.
    const isLive = typeof item.id === 'string' && item.id.includes('-live-')
    const delay = isLive ? 0 : Math.min(index * 0.035, 1)
    const pop = {
      layout: 'position' as const,
      initial: { opacity: 0, y: -10 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 6 },
      transition: { duration: 0.32, delay, ease: [0.22, 1, 0.36, 1] as const }
    }

    switch (item.kind) {
      case 'friend_trade':
        return (
          <motion.article key={item.id} className="home-post-card home-post-card--friend" {...pop}>
            <div className="home-post-top">
              <span className="home-post-kind">
                <UserRound size={12} aria-hidden /> Friend trade
              </span>
              <ShareIconButton label={`${item.friend} ${item.side} ${item.market}`} />
            </div>
            <p className="home-activity-text">
              <button
                type="button"
                className="home-friend-link"
                onClick={() => onViewProfile?.(item.friend)}
              >
                <strong>{item.friend}</strong>
              </button>
              {' '}· {item.ago}
            </p>
            <p className="home-post-title" style={{ marginTop: 6 }}>
              {item.market}
            </p>
            <div className="home-friend-trade-meta">
              <span className={`home-feed-side home-feed-side--${item.side === 'YES' ? 'yes' : 'no'}`}>{item.side}</span>
              <span className="home-leader-score">{formatUsd(item.notionalUsd)}</span>
            </div>
          </motion.article>
        )
      case 'wallet_spotlight':
        return (
          <motion.article key={item.id} className="home-post-card home-post-card--kol" {...pop}>
            <div className="home-post-top">
              <span className="home-post-kind">
                <Sparkles size={12} aria-hidden /> {item.label}
              </span>
              <ShareIconButton label={`${item.label} ${item.handle} ${formatUsd(item.pnlUsd)}`} />
            </div>
            <div className="home-leader-row" style={{ gridTemplateColumns: '1fr auto auto', background: 'transparent', border: 'none', padding: 0 }}>
              <span className="home-leader-name">{item.handle}</span>
              <span className="home-leader-score">{formatUsd(item.pnlUsd)}</span>
              <span className="home-leader-tag">{item.tag}</span>
            </div>
            <p className="home-post-sub" style={{ marginBottom: 0 }}>
              WR {item.winRate}%
            </p>
          </motion.article>
        )
      case 'meme_article':
        return (
          <motion.article key={item.id} className="home-post-card home-post-card--meme" {...pop}>
            <div className="home-post-top">
              <span className="home-post-kind">Meme / culture</span>
              <ShareIconButton label={item.title} />
            </div>
            <h3 className="home-post-title">{item.title}</h3>
            <p className="home-post-sub">{item.subtitle}</p>
            <button type="button" className="home-post-cta" onClick={() => onOpenMarket?.(1)}>
              Read the tape
              <ArrowUpRight size={14} />
            </button>
          </motion.article>
        )
      case 'sniper':
        return (
          <motion.article key={item.id} className="home-sniper-row" {...pop}>
            <div className="home-sniper-main">
              <div className="home-sniper-source">
                {item.fresh && <span className="home-fresh-dot" aria-hidden />}
                {item.source}
              </div>
              <p className="home-sniper-headline">{item.headline}</p>
            </div>
            <div className="home-sniper-actions">
              <ShareIconButton label={item.headline} />
              <button type="button" className="home-bet-btn" onClick={() => onOpenMarket?.(item.videoId)}>
                Open
                <ArrowUpRight size={14} />
              </button>
            </div>
          </motion.article>
        )
      case 'market_pulse':
        return (
          <motion.article key={item.id} className="home-market-tile" {...pop}>
            <div className="home-market-tile-head">
              <span className="home-post-kind" style={{ marginRight: 'auto' }}>
                <TrendingUp size={12} aria-hidden /> Market
              </span>
              <button type="button" className="home-tile-cta" onClick={() => onOpenMarket?.(item.videoId)} aria-label="Open market">
                <ArrowUpRight size={16} />
              </button>
            </div>
            <div className="home-market-mini">
              <MarketShareCard
                title={item.title}
                yesOdds={item.yesOdds}
                chart={item.chart}
                timeLeftLabel={item.timeLeftLabel}
                thumbnailFallbackSrc="/Stems/betskuu.png"
                onViewMarket={() => onOpenMarket?.(item.videoId)}
              />
            </div>
          </motion.article>
        )
      case 'viral_burst':
        return (
          <motion.article key={item.id} className="home-viral-card" {...pop}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <span className="home-post-kind">
                <Flame size={12} aria-hidden /> Viral
              </span>
              <ShareIconButton label={item.title} />
            </div>
            <div className="home-viral-heat">{item.heat} heat</div>
            <div className="home-viral-title">{item.title}</div>
            <p className="home-viral-body">{item.body}</p>
            <div className="home-viral-actions">
              <button type="button" className="home-bet-btn" onClick={() => onOpenMarket?.(item.videoId)}>
                Ride it
                <ArrowUpRight size={14} />
              </button>
            </div>
          </motion.article>
        )
      case 'group_ping':
        return (
          <motion.article key={item.id} className="home-post-card home-post-card--group" {...pop}>
            <div className="home-post-top">
              <span className="home-post-kind">
                <Zap size={12} aria-hidden /> {item.group}
              </span>
              <ShareIconButton label={item.text} />
            </div>
            <p className="home-activity-text" style={{ margin: 0 }}>
              {item.text}
            </p>
          </motion.article>
        )
      default:
        return null
    }
  }

  return (
    <motion.div
      className={`panel home-panel home-panel--${variant}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="panel-header home-header">
        <div className="home-header-left">
          {isRail && (
            <button type="button" className="home-collapse-btn" onClick={onCollapse} title="Hide feed" aria-label="Hide feed">
              <ChevronLeft size={18} strokeWidth={2.25} />
            </button>
          )}
          <span className="home-header-title">Home feed</span>
        </div>
        <div className="home-header-actions">
          <span className="home-live-pill">
            <Radio size={12} className="home-live-dot" aria-hidden />
            Live
          </span>
          <ShareIconButton label="Home feed snapshot" />
          {isRail && onToggleSide && (
            <button
              type="button"
              className="home-side-toggle"
              onClick={onToggleSide}
              title={side === 'left' ? 'Move feed to the right' : 'Move feed to the left'}
              aria-label={side === 'left' ? 'Move feed to the right' : 'Move feed to the left'}
            >
              <ArrowLeftRight size={16} strokeWidth={2.25} />
            </button>
          )}
        </div>
      </div>

      <div className="panel-content home-content">
        <div className="home-scroll" ref={scrollRootRef}>
          <section className="home-section" aria-label="Desk snapshot">
            <div className="home-hero">
              <div>
                <div className="home-hero-kicker">Your desk · 7d</div>
                <div className="home-hero-pnl-big">
                  <span className="pos">+18.4%</span>
                  <span className="home-hero-pnl-note">Blended tape</span>
                </div>
                <div className="home-hero-meta">
                  <span className="pill">Sharpe 1.82</span>
                  <span className="pill">Win 64%</span>
                </div>
              </div>
              <div aria-hidden>
                <svg className="home-hero-chart" viewBox="0 0 200 72" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="homeHeroFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(255,153,102,0.35)" />
                      <stop offset="100%" stopColor="rgba(255,94,98,0)" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,52 L16,48 L32,55 L48,38 L64,44 L80,28 L96,34 L112,22 L128,30 L144,18 L160,26 L176,14 L192,20 L200,16 L200,72 L0,72 Z"
                    fill="url(#homeHeroFill)"
                  />
                  <path
                    d="M0,52 L16,48 L32,55 L48,38 L64,44 L80,28 L96,34 L112,22 L128,30 L144,18 L160,26 L176,14 L192,20 L200,16"
                    fill="none"
                    stroke="rgba(255,153,102,0.9)"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
          </section>

          <section className="home-section" aria-labelledby="home-lb-markets">
            <div className="home-section-head">
              <div>
                <span className="home-section-title" id="home-lb-markets">
                  <Trophy className="home-section-icon" size={16} aria-hidden />
                  King of the hill · markets
                </span>
                <p className="home-section-sub">Top volume in the last 24h — who holds the crown.</p>
              </div>
              <ShareIconButton label="King of the hill markets" />
            </div>
            <PodiumTop3 triple={LEADER_MARKETS} />
          </section>

          <section className="home-section" aria-labelledby="home-lb-wallets">
            <div className="home-section-head">
              <div>
                <span className="home-section-title" id="home-lb-wallets">
                  <BarChart3 className="home-section-icon" size={16} aria-hidden />
                  Wallets &amp; KOLs
                </span>
                <p className="home-section-sub">Best 7d PnL among tracked wallets and public KOLs.</p>
              </div>
              <ShareIconButton label="Wallet leaderboard" />
            </div>
            <PodiumTop3 triple={LEADER_WALLETS} />
          </section>

          <section className="home-section" aria-labelledby="home-lb-articles">
            <div className="home-section-head">
              <div>
                <span className="home-section-title" id="home-lb-articles">
                  <BookOpen className="home-section-icon" size={16} aria-hidden />
                  Most read articles
                </span>
                <p className="home-section-sub">By views — memes, explainers, and tape posts.</p>
              </div>
              <ShareIconButton label="Article leaderboard" />
            </div>
            <PodiumTop3 triple={LEADER_ARTICLES} />
          </section>

          <section className="home-section" aria-label="Mixed feed">
            <div className="home-section-head">
              <div>
                <span className="home-section-title">
                  <Crosshair className="home-section-icon" size={16} aria-hidden />
                  Live mix
                </span>
                <p className="home-section-sub">Friends, wallets, snipers, markets — shuffled as it happens.</p>
              </div>
            </div>
            <div className="home-post-grid" role="feed">
              <AnimatePresence initial={false}>
                {liveItems.map((item, i) => renderCard(item, i))}
              </AnimatePresence>
              {mixedFeed.map((item, i) => renderCard(item, liveItems.length + i))}
              {extraFeedBlocks > 0 && extraItems.map((item, j) => renderCard(item, liveItems.length + mixedFeed.length + j))}
            </div>
          </section>

          <div ref={sentinelRef} className="home-feed-sentinel" aria-hidden />
        </div>
      </div>
    </motion.div>
  )
}

export default HomePanel
