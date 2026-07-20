import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, TrendingUp, Sparkles, Coins, Plus, ChevronDown } from 'lucide-react'
import { useMarketTick } from '../hooks/useMarketTick'
import { loadDiscoveryCatalog, subscribeDiscoveryCatalog, saveDiscoveryCatalog, ensureDiscoveryThumbnails } from '../data/discoveryStore'
import {
  buildFriendBuys,
  consensusYesFromBets,
  formatTimeLeftFromTimestamp,
  promoteWagerToBatch
} from '../data/discoveryMock'
import { emitWagerPromotionNotification } from '../utils/notificationEmitter'
import type {
  Batch,
  MarketSortKey,
  Wager,
  WagerSortKey
} from '../types/discovery'
import MarketRow from './discovery/MarketRow'
import WagerRow from './discovery/WagerRow'
import { clamp } from '../utils/math'
import './Panel.css'
import './DiscoveryPanel.css'

interface DiscoveryPanelProps {
  onBack: () => void
  onCreateWager?: () => void
  injectWager?: Wager | null
  onWagerInjected?: () => void
  onOpenMarket?: (marketId: string) => void
  onExecuteTrade?: (params: {
    marketId: string
    marketName: string
    side: 'yes' | 'no'
    usdAmount: number
    price: number
  }) => void
  onViewProfile?: (handle: string) => void
  walletBalance?: number
  isVisible?: boolean
}
const LIST_CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 }
  }
}

const DiscoveryPanel = ({
  onBack,
  onCreateWager,
  injectWager,
  onWagerInjected,
  onOpenMarket,
  onExecuteTrade,
  onViewProfile,
  isVisible = true
}: DiscoveryPanelProps) => {
  const [batches, setBatches] = useState<Batch[]>(() => loadDiscoveryCatalog().batches)
  const [wagers, setWagers] = useState<Wager[]>(() => loadDiscoveryCatalog().wagers)

  useEffect(() => {
    if (!isVisible) return
    void ensureDiscoveryThumbnails()
  }, [isVisible])

  useEffect(() => {
    return subscribeDiscoveryCatalog(() => {
      const catalog = loadDiscoveryCatalog()
      setBatches(catalog.batches)
      setWagers(catalog.wagers)
    })
  }, [])
  // Top-level mode swaps between the Markets, Wagers, and Both tables.
  // Every surface uses the same sort dropdown selector and shares the
  // header layout, panel content area, and quickbuy controls.
  const [mode, setMode] = useState<'markets' | 'wagers' | 'both'>('markets')
  const [marketSort, setMarketSort] = useState<MarketSortKey>('trending')
  const [quickBuyUsd, setQuickBuyUsd] = useState(25)
  const [wagerSort, setWagerSort] = useState<WagerSortKey>('active')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)

  // Close sort menu on outside click
  useEffect(() => {
    if (!sortMenuOpen) return
    const handle = (e: MouseEvent) => {
      if (!sortMenuRef.current?.contains(e.target as Node)) setSortMenuOpen(false)
    }
    window.addEventListener('mousedown', handle)
    return () => window.removeEventListener('mousedown', handle)
  }, [sortMenuOpen])

  // When the parent publishes a wager via the creation overlay, jump to Wagers view.
  useEffect(() => {
    if (!injectWager) return
    setMode('wagers')
    setWagerSort('newest')
    onWagerInjected?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [injectWager])

  // Persist live discovery state (sim ticks, promotions, edits) to localStorage.
  const skipPersistRef = useRef(true)
  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false
      return
    }
    const timer = window.setTimeout(() => {
      saveDiscoveryCatalog({ version: 1, batches, wagers })
    }, 700)
    return () => window.clearTimeout(timer)
  }, [batches, wagers])

  // Slightly slower than the main heartbeat â€” discovery is a "lobby" view.
  const tick = useMarketTick(3200)

  // Evolve non-price discovery metadata without forking canonical chart history.
  useEffect(() => {
    if (tick.idx === 0) return
    setBatches(prev =>
      prev.map((b, i) => {
        const rng = tick.rng
        const vol = 0.55 + ((i * 1009 + 7) % 13) / 12 * 1.25

        let next: Batch = b

        if (rng() < 0.18 + vol * 0.16) {
          const volumeBump = Math.round(rng() * 110 * vol + (rng() < 0.1 ? rng() * 700 * vol : 0))
          next = {
            ...next,
            volume: b.volume + volumeBump,
            volume24h: b.volume24h + volumeBump
          }
        }

        // Holders drift on their own slow schedule â€” independent of the
        // price update, so even "calm" batches occasionally gain a follower.
        if (rng() < 0.06 * vol) {
          next = { ...next, holders: next.holders + (rng() < 0.7 ? 1 : 2) }
        }

        return next
      })
    )
    // tick.idx is the only stable dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick.idx])

  // Evolve wagers per tick: each has its own "interest" factor that drives
  // open-bet volume growth (which animates the liquidity strip) + friend buy creep.
  // Promote any wager whose total pool crosses its `promotionThreshold`
  // into a freshly-seeded Batch (Market).
  useEffect(() => {
    if (tick.idx === 0) return
    const rng = tick.rng
    const promoted: Batch[] = []
    setWagers(prev => {
      const next: Wager[] = []
      for (let i = 0; i < prev.length; i++) {
        const w = prev[i]
        // Personality: 0.45 (sleepy) .. 1.7 (active), stable per wager position.
        const interest = 0.45 + ((i * 911 + 13) % 11) / 10 * 1.25
        const buyChance = 0.16 + interest * 0.18

        let openBets = w.openBets
        let friendBuys = w.friendBuys

        if (rng() < buyChance) {
          // Pick a target bet weighted by volume (popular bets attract more)
          // or create a new bet at a random nearby odds.
          const total = openBets.reduce((s, b) => s + b.volume, 0) || 1
          const whale = rng() < 0.08
          const buy = whale
            ? Math.round(220 + rng() * 720) * interest
            : Math.round(8 + rng() * 95) * interest

          if (rng() < 0.7 && openBets.length > 0) {
            // Fill an existing bet
            const draw = rng() * total
            let acc = 0
            let target = 0
            for (let k = 0; k < openBets.length; k++) {
              acc += openBets[k].volume
              if (draw <= acc) { target = k; break }
            }
            openBets = openBets.map((b, k) => k === target ? { ...b, volume: Math.round(b.volume + buy) } : b)
          } else {
            // Create a new bet at nearby odds
            const consensus = consensusYesFromBets(openBets)
            const newOdds = Math.round(clamp(consensus + (rng() - 0.5) * 40, 3, 97))
            const existing = openBets.find(b => b.yesOdds === newOdds)
            if (existing) {
              openBets = openBets.map(b => b.yesOdds === newOdds ? { ...b, volume: Math.round(b.volume + buy) } : b)
            } else {
              openBets = [...openBets, { yesOdds: newOdds, volume: Math.round(buy) }].sort((a, b) => a.yesOdds - b.yesOdds)
            }
          }
        }

        const pool = openBets.reduce((s, b) => s + b.volume, 0)

        // Friend buys creep up rarely.
        if (rng() < 0.04 * interest) {
          friendBuys = buildFriendBuys(rng, consensusYesFromBets(openBets))
        }

        const updated: Wager = {
          ...w,
          openBets,
          pool,
          friendBuys,
          timeLeftLabel: formatTimeLeftFromTimestamp(w.resolutionTimestamp)
        }

        if (pool >= w.promotionThreshold) {
          const batch = promoteWagerToBatch(updated, rng)
          promoted.push(batch)
          emitWagerPromotionNotification({
            wagerId: w.id,
            wagerName: w.name,
            newBatchId: batch.id
          })
          continue
        }
        next.push(updated)
      }
      return next
    })
    if (promoted.length > 0) {
      setBatches(prev => [...promoted, ...prev])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick.idx])

  const visibleBatchKey = useMemo(
    () => batches.filter((b) => !b.hidden).map((b) => b.id).join('|'),
    [batches]
  )

  // Freeze the visible order based on a snapshot taken whenever the sort or
  // visible market set changes, so live volume changes don't reshuffle rows.
  const orderedIds = useMemo(() => {
    const copy = batches.filter((b) => !b.hidden)
    if (marketSort === 'expiring') {
      copy.sort((a, b) => a.resolutionTimestamp - b.resolutionTimestamp)
    } else if (marketSort === 'newest') {
      copy.sort((a, b) => b.resolutionTimestamp - a.resolutionTimestamp)
    } else {
      copy.sort((a, b) => b.volume - a.volume)
    }
    return copy.map(b => b.id)
    // intentionally NOT depending on all of `batches` â€” re-sort only when the
    // visible set changes, not on each live tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketSort, visibleBatchKey])

  const sortedBatches = useMemo(() => {
    const byId = new Map(batches.map(b => [b.id, b]))
    return orderedIds.map(id => byId.get(id)).filter((b): b is Batch => Boolean(b))
  }, [batches, orderedIds])

  // Wager ordering is also frozen on tab/sort changes so live pool updates
  // don't make the table shuffle around. The IDs of newly-published wagers
  // (added at the top of the list) are included so they appear immediately.
  const orderedWagerIds = useMemo(() => {
    const copy = wagers.filter((w) => !w.hidden)
    if (wagerSort === 'promotion') {
      copy.sort((a, b) => (b.pool / b.promotionThreshold) - (a.pool / a.promotionThreshold))
    } else if (wagerSort === 'newest') {
      copy.sort((a, b) => b.createdAtTimestamp - a.createdAtTimestamp)
    } else if (wagerSort === 'expiring') {
      copy.sort((a, b) => a.resolutionTimestamp - b.resolutionTimestamp)
    } else {
      copy.sort((a, b) => b.pool - a.pool)
    }
    return copy.map(w => w.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wagerSort, mode, wagers.length, injectWager?.id])

  const sortedWagers = useMemo(() => {
    const byId = new Map(wagers.map(w => [w.id, w]))
    return orderedWagerIds.map(id => byId.get(id)).filter((w): w is Wager => Boolean(w))
  }, [wagers, orderedWagerIds])

  // "Both" view: weave wagers and markets into one stream so the two bet
  // types are genuinely mixed rather than shown in separate sections.
  const mixedItems = useMemo(() => {
    const out: ({ kind: 'wager'; wager: Wager } | { kind: 'market'; batch: Batch })[] = []
    const max = Math.max(sortedWagers.length, sortedBatches.length)
    for (let i = 0; i < max; i++) {
      if (i < sortedWagers.length) out.push({ kind: 'wager', wager: sortedWagers[i] })
      if (i < sortedBatches.length) out.push({ kind: 'market', batch: sortedBatches[i] })
    }
    return out
  }, [sortedWagers, sortedBatches])

  const wagerSortOptions: { id: WagerSortKey; label: string }[] = [
    { id: 'active', label: 'Most active' },
    { id: 'promotion', label: 'Closest to promotion' },
    { id: 'newest', label: 'Newest' },
    { id: 'expiring', label: 'Expiring soon' },
  ]

  const marketSortOptions: { id: MarketSortKey; label: string }[] = [
    { id: 'trending', label: 'Trending' },
    { id: 'expiring', label: 'Expiring soon' },
    { id: 'newest', label: 'Newest' },
  ]

  // Wagers get their own sort keys; Markets and the mixed "Both" view share
  // the market sort keys. Both surfaces use the same dropdown selector.
  const isWagerSort = mode === 'wagers'
  const sortOptions = isWagerSort ? wagerSortOptions : marketSortOptions
  const activeSortValue: string = isWagerSort ? wagerSort : marketSort
  const activeSortLabel =
    sortOptions.find(o => o.id === activeSortValue)?.label ?? sortOptions[0].label
  const handleSortSelect = (id: string) => {
    if (isWagerSort) setWagerSort(id as WagerSortKey)
    else setMarketSort(id as MarketSortKey)
    setSortMenuOpen(false)
  }

  return (
    <motion.div
      className="panel discovery-panel"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ scale: 1 }}
    >
      <div className="panel-header discovery-header">
        <div className="discovery-left">
          <button type="button" className="betski-back discovery-back" onClick={onBack} aria-label="Back">
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <div className="discovery-title discovery-title--gradient">DISCOVERY</div>
          <div className="discovery-mode-toggle discovery-mode-toggle--tri" role="tablist" aria-label="Bet type">
            <motion.div
              className="discovery-mode-thumb"
              animate={{ x: mode === 'markets' ? '0%' : mode === 'wagers' ? '100%' : '200%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'markets'}
              className={`discovery-mode-option ${mode === 'markets' ? 'active' : ''}`}
              onClick={() => setMode('markets')}
            >
              <TrendingUp size={13} strokeWidth={2.5} />
              <span>Markets</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'wagers'}
              className={`discovery-mode-option ${mode === 'wagers' ? 'active' : ''}`}
              onClick={() => setMode('wagers')}
            >
              <Coins size={13} strokeWidth={2.5} />
              <span>Wagers</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'both'}
              className={`discovery-mode-option ${mode === 'both' ? 'active' : ''}`}
              onClick={() => setMode('both')}
            >
              <Sparkles size={13} strokeWidth={2.5} />
              <span>Both</span>
            </button>
          </div>
        </div>
        <div className="discovery-header-tools">
          <div className="discovery-tabs discovery-tabs--wagers">
            <div className="discovery-sort" ref={sortMenuRef}>
              <button
                type="button"
                className="discovery-sort-trigger"
                onClick={() => setSortMenuOpen(prev => !prev)}
                aria-haspopup="listbox"
                aria-expanded={sortMenuOpen}
              >
                <span className="discovery-sort-label">Sort: </span>
                <span className="discovery-sort-value">{activeSortLabel}</span>
                <ChevronDown size={14} />
              </button>
              <AnimatePresence>
                {sortMenuOpen && (
                  <motion.ul
                    className="discovery-sort-menu"
                    role="listbox"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.14 }}
                  >
                    {sortOptions.map(opt => (
                      <li key={opt.id} role="option" aria-selected={activeSortValue === opt.id}>
                        <button
                          type="button"
                          className={`discovery-sort-option ${activeSortValue === opt.id ? 'active' : ''}`}
                          onClick={() => handleSortSelect(opt.id)}
                        >
                          {opt.label}
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="discovery-header-actions">
            {mode !== 'markets' && (
              <button
                type="button"
                className="discovery-create-wager"
                onClick={() => onCreateWager?.()}
                aria-label="Create a new wager"
              >
                <Plus size={14} strokeWidth={3} />
                <span>Create wager</span>
              </button>
            )}
            <div className="discovery-quickbuy">
              <div className="discovery-quickbuy-label">Quick buy</div>
              <div className="discovery-quickbuy-pills" role="group" aria-label="Quick buy amount">
                {[10, 25, 50, 100].map(v => (
                  <button
                    key={v}
                    type="button"
                    className={`discovery-quickbuy-pill ${quickBuyUsd === v ? 'active' : ''}`}
                    onClick={() => setQuickBuyUsd(v)}
                  >
                    ${v}
                  </button>
                ))}
                <input
                  className="discovery-quickbuy-input"
                  value={String(quickBuyUsd)}
                  onChange={(e) => {
                    const n = Math.max(1, Math.min(10_000, Number(e.target.value.replace(/[^\d]/g, '')) || 0))
                    setQuickBuyUsd(n)
                  }}
                  inputMode="numeric"
                  aria-label="Custom quick buy amount"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel-content discovery-content">
        {mode === 'wagers' ? (
          <motion.div
            className="discovery-list"
            variants={LIST_CONTAINER_VARIANTS}
            initial="hidden"
            animate="show"
          >
            <div className="discovery-list-inner">
              <AnimatePresence initial={false}>
                {sortedWagers.map(wager => (
                  <WagerRow
                    key={wager.id}
                    wager={wager}
                    quickBuyUsd={quickBuyUsd}
                    onOpenMarket={onOpenMarket}
                    onExecuteTrade={onExecuteTrade}
                    onViewProfile={onViewProfile}
                  />
                ))}
              </AnimatePresence>
              {sortedWagers.length === 0 && (
                <div className="discovery-empty">
                  No wagers yet — be the first to launch one.
                </div>
              )}
            </div>
          </motion.div>
        ) : mode === 'markets' ? (
        <motion.div 
          className="discovery-list"
          variants={LIST_CONTAINER_VARIANTS}
          initial="hidden"
          animate="show"
        >
          <div className="discovery-list-inner">
            {sortedBatches.map(batch => (
              <MarketRow
                key={batch.id}
                batch={batch}
                quickBuyUsd={quickBuyUsd}
                onOpenMarket={onOpenMarket}
                onExecuteTrade={onExecuteTrade}
                onViewProfile={onViewProfile}
              />
            ))}
          </div>
        </motion.div>
        ) : (
          <motion.div
            className="discovery-list discovery-list--mixed"
            variants={LIST_CONTAINER_VARIANTS}
            initial="hidden"
            animate="show"
          >
            <div className="discovery-list-inner">
              <AnimatePresence initial={false}>
                {mixedItems.map(entry => (
                  entry.kind === 'wager' ? (
                    <WagerRow
                      key={entry.wager.id}
                      wager={entry.wager}
                      quickBuyUsd={quickBuyUsd}
                      onOpenMarket={onOpenMarket}
                      onExecuteTrade={onExecuteTrade}
                      onViewProfile={onViewProfile}
                    />
                  ) : (
                    <MarketRow
                      key={entry.batch.id}
                      batch={entry.batch}
                      quickBuyUsd={quickBuyUsd}
                      onOpenMarket={onOpenMarket}
                      onExecuteTrade={onExecuteTrade}
                      onViewProfile={onViewProfile}
                    />
                  )
                ))}
              </AnimatePresence>
              {mixedItems.length === 0 && (
                <div className="discovery-empty">Nothing to show yet.</div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default DiscoveryPanel
