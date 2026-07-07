import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, X, Eye, Heart, Share2 } from 'lucide-react'
import { detectContentPlatform, resolveContentLink } from '../../utils/resolveContentLink'
import { executeTrade, CURRENT_USER_HANDLE } from '../../data/appStore'
import { formatCompactNumber } from '../../utils/formatCompact'
import {
  buildOpenBets,
  DEFAULT_PROMOTION_THRESHOLD,
  formatResolutionDate,
  formatTimeLeftFromTimestamp,
  getRandomPhoneThumbnailUrl,
  mulberry32
} from '../../data/discoveryMock'
import type { BatchPreviewItem, Wager } from '../../types/discovery'
import './CreateWagerView.css'
import '../DiscoveryPanel.css'

/** -------------------------------------------------------------------------
 * Create Wager overlay — a centered modal dialog rendered by the parent
 * Layout on top of whatever page is open (main or discovery). UI-only:
 * publishing hands the new Wager back via onPublish.
 * --------------------------------------------------------------------- */
export const CreateWagerView = ({ onClose, onPublish }: { onClose: () => void; onPublish: (w: Wager) => void }) => {
  type ViralityMetric = 'views' | 'likes' | 'shares'
  type WagerLink = {
    id: string
    url: string
    platform: 'tiktok' | 'instagram' | 'youtube' | 'other'
    thumbnailUrl: string
    thumbnailLoading?: boolean
    importance: number
    views: number | null
    likes: number | null
    shares: number | null
  }

  const [title, setTitle] = useState('')
  const [linkInput, setLinkInput] = useState('')
  const [links, setLinks] = useState<WagerLink[]>([])
  const [isAddingLink, setIsAddingLink] = useState(false)
  const [side, setSide] = useState<'yes' | 'no'>('yes')
  const [yesOdds, setYesOdds] = useState(50)
  const [buyAmount, setBuyAmount] = useState(50)
  const [goalMetric, setGoalMetric] = useState<ViralityMetric>('views')
  const [goalMultiplier, setGoalMultiplier] = useState(5)
  const [resolutionDate, setResolutionDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    return d.toISOString().slice(0, 10)
  })

  const noOdds = 100 - yesOdds
  const trimmedTitle = title.trim()
  const canPublish =
    trimmedTitle.length >= 4 &&
    links.length >= 1 &&
    !isAddingLink &&
    !links.some(l => l.thumbnailLoading)

  const GOAL_MULTIPLIERS = [2, 5, 10, 25]
  const METRIC_META: Record<ViralityMetric, { label: string; Icon: typeof Eye }> = {
    views: { label: 'Views', Icon: Eye },
    likes: { label: 'Likes', Icon: Heart },
    shares: { label: 'Shares', Icon: Share2 }
  }
  const combinedCurrent = links.reduce((s, l) => s + (l[goalMetric] ?? 0), 0)
  const goalTarget = Math.round(combinedCurrent * goalMultiplier)

  const platformLabel = (p: WagerLink['platform']) =>
    ({ tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube / Shorts', other: 'Link' }[p])

  const addLink = async () => {
    const url = linkInput.trim()
    if (!url || isAddingLink) return

    const id = `lnk-${Date.now()}-${links.length}`
    const platform = detectContentPlatform(url)
    setLinks(prev => [
      ...prev,
      {
        id,
        url,
        platform,
        thumbnailUrl: '',
        thumbnailLoading: true,
        importance: 50,
        views: null,
        likes: null,
        shares: null
      }
    ])
    setLinkInput('')
    setIsAddingLink(true)

    try {
      const resolved = await resolveContentLink(url)
      setLinks(prev =>
        prev.map(l =>
          l.id === id
            ? {
                ...l,
                platform: resolved.platform,
                thumbnailUrl: resolved.thumbnailUrl,
                thumbnailLoading: false,
                views: resolved.views ?? null,
                likes: resolved.likes ?? null,
                shares: resolved.shares ?? null
              }
            : l
        )
      )
    } catch {
      setLinks(prev =>
        prev.map(l =>
          l.id === id
            ? {
                ...l,
                thumbnailUrl: getRandomPhoneThumbnailUrl(Date.now() % 100000),
                thumbnailLoading: false
              }
            : l
        )
      )
    } finally {
      setIsAddingLink(false)
    }
  }

  const removeLink = (id: string) => setLinks(prev => prev.filter(l => l.id !== id))
  const setImportance = (id: string, value: number) =>
    setLinks(prev => prev.map(l => (l.id === id ? { ...l, importance: value } : l)))

  const handlePublish = () => {
    if (!canPublish) return
    const resolutionTimestamp = new Date(resolutionDate + 'T05:00:00').getTime() || Date.now() + 7 * 24 * 60 * 60 * 1000
    const id = `wager-new-${Date.now()}`
    const rng = mulberry32(Date.now() & 0xffffffff)
    const buy = Math.max(0, Math.round(buyAmount))
    // Each linked video becomes a preview; its share of the bundle volume is
    // weighted by how important its virality is to the wager.
    const totalImportance = links.reduce((s, l) => s + Math.max(1, l.importance), 0) || 1
    const previews: BatchPreviewItem[] = links.map((l, i) => ({
      id: `${id}-vid-${i + 1}`,
      sourceUrl: l.url,
      thumbnailUrl: l.thumbnailUrl || getRandomPhoneThumbnailUrl(i + Date.now()),
      volume: Math.max(1, Math.round((buy * Math.max(1, l.importance)) / totalImportance))
    }))
    // Create open bets centered around the creator's chosen odds.
    const openBets = buildOpenBets(buy, yesOdds, rng)
    const goalQuestion = `Hit ${formatCompactNumber(goalTarget)} combined ${goalMetric} by ${formatResolutionDate(resolutionTimestamp)}?`
    const wager: Wager = {
      id,
      name: trimmedTitle,
      question: goalQuestion,
      openBets,
      pool: openBets.reduce((s, b) => s + b.volume, 0),
      promotionThreshold: DEFAULT_PROMOTION_THRESHOLD,
      createdAtTimestamp: Date.now(),
      resolutionTimestamp,
      resolutionDateLabel: formatResolutionDate(resolutionTimestamp),
      timeLeftLabel: formatTimeLeftFromTimestamp(resolutionTimestamp),
      previews,
      friendBuys: [],
      creatorHandle: CURRENT_USER_HANDLE
    }
    if (buy > 0) {
      executeTrade({
        marketId: id,
        marketName: trimmedTitle,
        side: side === 'yes' ? 'long' : 'short',
        action: 'buy',
        usdAmount: buy,
        price: (side === 'yes' ? yesOdds : noOdds) / 100,
        source: 'wager'
      })
    }
    onPublish(wager)
  }

  return (
    <motion.div
      className="create-wager-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
    >
      <motion.div
        className="discovery-create-view create-wager-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Create a wager"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
      <div className="discovery-create-head">
        <button type="button" className="discovery-back" onClick={onClose} aria-label="Close">
          <ArrowLeft size={20} color="var(--betski-orange)" />
        </button>
        <div className="discovery-create-title">Create a wager</div>
        <div className="discovery-create-subtitle">
          Fixed-odds bet. Promotes to a Market with a live chart once volume hits the threshold.
        </div>
      </div>

      <div className="discovery-create-body">
        <div className="discovery-create-col">
          <label className="discovery-field">
            <span className="discovery-field-label">Title</span>
            <input
              className="discovery-field-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Bitcoin closes above $200K by EOY"
              maxLength={120}
            />
          </label>

          <div className="discovery-field">
            <span className="discovery-field-label">Content</span>
            <div className="discovery-link-add">
              <input
                className="discovery-field-input"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }}
                placeholder="Paste a TikTok, Reels, or Shorts link…"
              />
              <button
                type="button"
                className="discovery-link-add-btn"
                onClick={addLink}
                disabled={!linkInput.trim() || isAddingLink}
              >
                <Plus size={14} strokeWidth={3} />
                {isAddingLink ? 'Adding…' : 'Add'}
              </button>
            </div>
            <span className="discovery-field-hint">
              Paste video links — thumbnails are fetched automatically (TikTok, Reels, Shorts).
            </span>

            {links.length > 0 && (
              <div className="discovery-link-list">
                {links.map(l => (
                  <div key={l.id} className="discovery-link-card">
                    <div
                      className={`discovery-link-thumb ${l.thumbnailLoading ? 'is-loading' : ''}`}
                      style={l.thumbnailUrl ? { backgroundImage: `url(${l.thumbnailUrl})` } : undefined}
                    />
                    <div className="discovery-link-body">
                      <div className="discovery-link-top">
                        <div className="discovery-link-meta">
                          <span className="discovery-link-platform">{platformLabel(l.platform)}</span>
                          <span className="discovery-link-url">{l.url}</span>
                        </div>
                        <button
                          type="button"
                          className="discovery-link-remove"
                          onClick={() => removeLink(l.id)}
                          aria-label="Remove this video"
                        >
                          <X size={14} strokeWidth={3} />
                        </button>
                      </div>
                      <div className="discovery-link-stats">
                        <span className="discovery-link-stat" title="Views">
                          <Eye size={12} strokeWidth={2.5} />
                          {l.views != null ? formatCompactNumber(l.views) : '—'}
                        </span>
                        <span className="discovery-link-stat" title="Likes">
                          <Heart size={12} strokeWidth={2.5} />
                          {l.likes != null ? formatCompactNumber(l.likes) : '—'}
                        </span>
                        <span className="discovery-link-stat" title="Shares">
                          <Share2 size={12} strokeWidth={2.5} />
                          {l.shares != null ? formatCompactNumber(l.shares) : '—'}
                        </span>
                      </div>
                      <div className="discovery-link-importance">
                        <div className="discovery-link-importance-head">
                          <span>Virality importance</span>
                          <span className="discovery-link-importance-val">{l.importance}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={l.importance}
                          onChange={(e) => setImportance(l.id, Number(e.target.value))}
                          className="discovery-odds-slider discovery-importance-slider"
                          aria-label={`Virality importance for ${l.url}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="discovery-field">
            <span className="discovery-field-label">Consensus odds</span>
            <div className="discovery-odds-row">
              <div className="discovery-odds-side discovery-odds-side--yes">
                <span className="discovery-odds-side-label">YES</span>
                <span className="discovery-odds-side-value">{yesOdds}¢</span>
              </div>
              <input
                type="range"
                min={5}
                max={95}
                step={1}
                value={yesOdds}
                onChange={(e) => setYesOdds(Number(e.target.value))}
                className="discovery-odds-slider"
                aria-label="Consensus YES odds"
              />
              <div className="discovery-odds-side discovery-odds-side--no">
                <span className="discovery-odds-side-label">NO</span>
                <span className="discovery-odds-side-value">{noOdds}¢</span>
              </div>
            </div>
            <div className="discovery-field-hint">
              Buyers can place bets anywhere from 1¢ to 99¢ on the odds strip.
              Your buy seeds liquidity around {yesOdds}¢ YES.
            </div>
          </div>
        </div>

        <div className="discovery-create-col">
          <div className="discovery-field">
            <span className="discovery-field-label">Virality goal</span>
            <div className="discovery-goal">
              <div className="discovery-goal-metrics" role="group" aria-label="Goal metric">
                {(Object.keys(METRIC_META) as ViralityMetric[]).map(m => {
                  const { label, Icon } = METRIC_META[m]
                  return (
                    <button
                      key={m}
                      type="button"
                      className={`discovery-goal-metric ${goalMetric === m ? 'active' : ''}`}
                      onClick={() => setGoalMetric(m)}
                    >
                      <Icon size={13} strokeWidth={2.5} />
                      {label}
                    </button>
                  )
                })}
              </div>
              <div className="discovery-goal-targets" role="group" aria-label="Goal target">
                {GOAL_MULTIPLIERS.map(mult => (
                  <button
                    key={mult}
                    type="button"
                    className={`discovery-goal-chip ${goalMultiplier === mult ? 'active' : ''}`}
                    onClick={() => setGoalMultiplier(mult)}
                  >
                    ×{mult}
                  </button>
                ))}
              </div>
              <div className="discovery-goal-summary">
                <div className="discovery-goal-stat">
                  <span className="discovery-goal-stat-label">Current</span>
                  <span className="discovery-goal-stat-val">{formatCompactNumber(combinedCurrent)}</span>
                </div>
                <span className="discovery-goal-arrow" aria-hidden="true">→</span>
                <div className="discovery-goal-stat">
                  <span className="discovery-goal-stat-label">Goal</span>
                  <span className="discovery-goal-stat-val discovery-goal-stat-val--target">
                    {formatCompactNumber(goalTarget)}
                  </span>
                </div>
              </div>
            </div>
            <span className="discovery-field-hint">
              {links.length === 0
                ? 'Add content links to set a virality goal.'
                : `Resolves YES if the bundle reaches ${formatCompactNumber(goalTarget)} combined ${METRIC_META[goalMetric].label.toLowerCase()} by the resolution date.`}
            </span>
          </div>

          <label className="discovery-field">
            <span className="discovery-field-label">Resolution date</span>
            <input
              type="date"
              className="discovery-field-input"
              value={resolutionDate}
              onChange={(e) => setResolutionDate(e.target.value)}
            />
          </label>

          <label className="discovery-field">
            <span className="discovery-field-label">Your buy</span>
            <div className="discovery-field-prefix">
              <span className="discovery-field-prefix-text">$</span>
              <input
                type="number"
                className="discovery-field-input"
                value={buyAmount}
                min={0}
                max={100_000}
                onChange={(e) => setBuyAmount(Number(e.target.value) || 0)}
              />
            </div>
            <span className="discovery-field-hint">Your opening stake — starts the wager's pool.</span>
          </label>

          <div className="discovery-field">
            <span className="discovery-field-label">Your position</span>
            <div className="discovery-side-toggle" role="group" aria-label="Your position">
              <button
                type="button"
                className={`discovery-side-btn discovery-side-btn--yes ${side === 'yes' ? 'active' : ''}`}
                onClick={() => setSide('yes')}
              >
                YES · {yesOdds}¢
              </button>
              <button
                type="button"
                className={`discovery-side-btn discovery-side-btn--no ${side === 'no' ? 'active' : ''}`}
                onClick={() => setSide('no')}
              >
                NO · {noOdds}¢
              </button>
            </div>
            <span className="discovery-field-hint">
              You're seeding the pool on {side === 'yes' ? 'YES' : 'NO'} at {side === 'yes' ? yesOdds : noOdds}¢.
            </span>
          </div>
        </div>
      </div>

      <div className="discovery-create-footer">
        <button type="button" className="discovery-create-cancel" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="discovery-create-submit"
          onClick={handlePublish}
          disabled={!canPublish}
        >
          <Plus size={14} strokeWidth={3} />
          Publish wager
        </button>
      </div>
      </motion.div>
    </motion.div>
  )
}
