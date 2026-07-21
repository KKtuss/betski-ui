import { useRef, useState, useEffect, useLayoutEffect, useMemo, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Send, Volume2, VolumeX } from 'lucide-react'
import { MOTION_ACTION_BUTTON } from '../utils/motionPresets'
import MediaCard, { type MediaSlide } from './MediaCard'
import type { Market } from '../data/marketCatalog'
import { getAdjacentMarketId, getMarketById } from '../data/marketCatalog'
import { onAvatarError, resolveProfileAvatar } from '../utils/avatarUrl'
import {
  extractTikTokVideoId,
  extractYoutubeVideoId,
  getTikTokEmbedUrl,
  getYoutubeEmbedUrl
} from '../utils/resolveContentLink'
import { RouletteStat } from './shared/RouletteStat'
import './VideoContainer.css'

interface VideoContainerProps {
  market: Market
  livePrice: number
  priceChange: number
  longUsd: number
  shortUsd: number
  onLongClick?: () => void
  onShortClick?: () => void
  onShareClick?: () => void
  onPreviewChange?: (index: number) => void
  requestedIndex?: number | null
  onRequestedIndexHandled?: () => void
  onMediaResolved?: (previewId: string, patch: Partial<MediaSlide>) => void
  /** Vertical feed: -1 previous market, +1 next market. */
  onNavigateMarket?: (delta: -1 | 1) => void
  /** Bumped on vertical market hop — drives casino-style stat reels. */
  statsShuffleKey?: number
  statsSpinDir?: -1 | 1
}

const marketToSlides = (market: Market): MediaSlide[] => {
  if (market.type === 'legacy' && market.legacyVideoUrl) {
    return [
      {
        id: `${market.id}-main`,
        legacyMp4: market.legacyVideoUrl,
        thumbnailUrl: market.previews[0]?.thumbnailUrl,
        sourceUrl: market.legacyVideoUrl
      }
    ]
  }
  const previews = market.previews.length > 0 ? market.previews : [{ id: `${market.id}-fallback`, thumbnailUrl: '/Stems/BetskiPEFFPEE.png', volume: 0 }]
  return previews.map((p) => ({
    id: p.id,
    sourceUrl: p.sourceUrl,
    thumbnailUrl: p.thumbnailUrl,
    videoUrl: (p as MediaSlide).videoUrl,
    embedUrl: (p as MediaSlide).embedUrl
  }))
}

const VideoContainer = ({
  market,
  livePrice,
  longUsd,
  shortUsd,
  onLongClick,
  onShortClick,
  onShareClick,
  onPreviewChange,
  requestedIndex,
  onRequestedIndexHandled,
  onMediaResolved,
  onNavigateMarket,
  statsShuffleKey,
  statsSpinDir = 1
}: VideoContainerProps) => {
  const slides = useMemo(() => marketToSlides(market), [market])
  const containerRef = useRef<HTMLDivElement>(null)
  const mainStageRef = useRef<HTMLDivElement>(null)
  const stageRowRef = useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [slideMeta, setSlideMeta] = useState<Record<string, Partial<MediaSlide>>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [showPositions, setShowPositions] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  /** Vertical market transition offset (0 = resting). */
  const [feedY, setFeedY] = useState(0)
  const [feedMotion, setFeedMotion] = useState<'idle' | 'exit' | 'enter'>('idle')
  const snapTimerRef = useRef<number | null>(null)
  const isSnappingRef = useRef(false)
  const desiredCenterXRef = useRef<number | null>(null)
  const currentIndexRef = useRef(0)
  const marketNavCooldownRef = useRef(0)
  const navAnimTimerRef = useRef<number | null>(null)
  const feedSettlingRef = useRef(false)
  const stageHRef = useRef(0)
  const onNavigateMarketRef = useRef(onNavigateMarket)
  onNavigateMarketRef.current = onNavigateMarket

  const marketPeek = useMemo(() => {
    const prevId = getAdjacentMarketId(market.id, -1)
    const nextId = getAdjacentMarketId(market.id, 1)
    const prev = prevId ? getMarketById(prevId) : undefined
    const next = nextId ? getMarketById(nextId) : undefined
    const embedFor = (sourceUrl?: string) => {
      if (!sourceUrl) return undefined
      const tiktokId = extractTikTokVideoId(sourceUrl)
      // Mute so hidden warm iframes stay silent; player assets still warm.
      if (tiktokId) return getTikTokEmbedUrl(tiktokId, { muted: true })
      const youtubeId = extractYoutubeVideoId(sourceUrl)
      if (youtubeId) return getYoutubeEmbedUrl(youtubeId, { muted: true })
      return undefined
    }
    return {
      hasPrev: Boolean(prev),
      hasNext: Boolean(next),
      prevEmbed: embedFor(prev?.previews[0]?.sourceUrl),
      nextEmbed: embedFor(next?.previews[0]?.sourceUrl)
    }
  }, [market.id])

  // Warm adjacent-market players so a vertical swipe isn't a cold TikTok boot.
  const [warmEmbeds, setWarmEmbeds] = useState<string[]>([])
  useEffect(() => {
    const next = [marketPeek.prevEmbed, marketPeek.nextEmbed].filter(
      (url): url is string => Boolean(url)
    )
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(() => setWarmEmbeds(next), { timeout: 1600 })
      return () => w.cancelIdleCallback?.(id)
    }
    const t = window.setTimeout(() => setWarmEmbeds(next), 500)
    return () => window.clearTimeout(t)
  }, [marketPeek.prevEmbed, marketPeek.nextEmbed])

  const prevMarketIdRef = useRef(market.id)

  const getStageHeight = () =>
    stageHRef.current ||
    mainStageRef.current?.clientHeight ||
    Math.round(window.innerHeight * 0.55)

  /**
   * Shared vertical transition for arrows, wheel, and phone swipe.
   * Next (swipe up / ↓): current exits up, new enters from below.
   * Prev (swipe down / ↑): current exits down, new enters from above.
   */
  const enterFromRef = useRef(0)
  const requestMarketNavigate = useCallback((delta: -1 | 1) => {
    const nav = onNavigateMarketRef.current
    if (!nav || feedSettlingRef.current) return
    if (delta === 1 && !marketPeek.hasNext) return
    if (delta === -1 && !marketPeek.hasPrev) return
    const now = performance.now()
    if (now - marketNavCooldownRef.current < 420) return
    marketNavCooldownRef.current = now

    const h = getStageHeight()
    if (h <= 0) {
      nav(delta)
      return
    }

    // Next: exit toward -y (up), enter from +y (below). Prev: opposite.
    const exitTo = delta === 1 ? -h : h
    const enterFrom = delta === 1 ? h : -h

    feedSettlingRef.current = true
    if (navAnimTimerRef.current != null) window.clearTimeout(navAnimTimerRef.current)

    setFeedMotion('exit')
    setFeedY(exitTo)

    navAnimTimerRef.current = window.setTimeout(() => {
      // Park the incoming page on the opposite edge, then remount via market.id.
      enterFromRef.current = enterFrom
      setFeedMotion('enter')
      setFeedY(0)
      nav(delta)
      navAnimTimerRef.current = window.setTimeout(() => {
        feedSettlingRef.current = false
        setFeedMotion('idle')
        enterFromRef.current = 0
        navAnimTimerRef.current = null
        window.requestAnimationFrame(() => syncMobileCardLayout(0))
      }, 280)
    }, 240)
  }, [marketPeek.hasNext, marketPeek.hasPrev])

  useEffect(() => {
    return () => {
      if (navAnimTimerRef.current != null) window.clearTimeout(navAnimTimerRef.current)
    }
  }, [])

  useLayoutEffect(() => {
    const el = mainStageRef.current
    if (!el) return
    const measure = () => {
      stageHRef.current = el.clientHeight
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (prevMarketIdRef.current === market.id) return
    prevMarketIdRef.current = market.id
    // Vertical feed navigation owns the offset while settling.
    if (feedSettlingRef.current) return
    setFeedMotion('idle')
    setFeedY(0)
  }, [market.id])

  const mobileSwipeRef = useRef<{
    pointerId: number | null
    startX: number
    startY: number
    startScroll: number
    startIndex: number
    minScroll: number
    maxScroll: number
    axis: 'x' | 'y' | null
    lastX: number
    lastY: number
    lastT: number
    velocityX: number
    velocityY: number
    capturing: boolean
  } | null>(null)

  const isMobileMainScroller = () =>
    Boolean(containerRef.current?.closest('.layout--mobile-main'))

  const getSnapScrollBehavior = (): ScrollBehavior =>
    isMobileMainScroller() ? 'auto' : 'smooth'

  const finishSnap = (layoutIndex?: number) => {
    isSnappingRef.current = false
    syncScrollEdgePadding()
    syncMobileCardLayout(layoutIndex ?? currentIndexRef.current)
    mobileSwipeRef.current = null
  }

  const beginSnap = () => {
    isSnappingRef.current = true
    if (snapTimerRef.current != null) {
      window.clearTimeout(snapTimerRef.current)
      snapTimerRef.current = null
    }
  }

  const formatAmount = (value: number) => {
    const compact = new Intl.NumberFormat(undefined, {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: value >= 1000 ? 1 : 0
    }).format(value)
    return compact.endsWith('.0') ? `$${compact.slice(0, -2)}` : `$${compact}`
  }

  const handleMediaResolved = useCallback(
    (id: string, patch: Partial<MediaSlide>) => {
      setSlideMeta((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
      onMediaResolved?.(id, patch)
    },
    [onMediaResolved]
  )

  const getVideoCards = () => {
    const container = containerRef.current
    if (!container) return []
    return Array.from(container.querySelectorAll('.video-card')) as HTMLElement[]
  }

  const getControlRailOffset = () => {
    const container = containerRef.current
    if (!container) return 0
    const stageRow = container.closest('.video-stage-row') as HTMLElement | null
    const controls = stageRow?.querySelector('.container-controls') as HTMLElement | null
    if (!controls) return 0

    const isMobileMain = Boolean(container.closest('.layout--mobile-main'))
    if (isMobileMain) {
      return controls.offsetWidth + 6
    }

    // Desktop: YES/NO sit in an absolute right-edge anchor. Reserve their
    // footprint (+ gap) so the carousel centers in the remaining lane and
    // cards stop overlapping the buttons.
    const stage = mainStageRef.current
    if (!stage) return controls.offsetWidth + 12
    const stageRect = stage.getBoundingClientRect()
    const controlsRect = controls.getBoundingClientRect()
    const gap = 10
    return Math.max(0, stageRect.right - controlsRect.left + gap)
  }

  const syncMobileCardLayout = (activeIndex?: number) => {
    // Keep YES/NO + overlays planted while the user is dragging videos or markets.
    if (mobileSwipeRef.current?.axis) return

    const container = containerRef.current
    const mainStage = mainStageRef.current
    const stageRow = stageRowRef.current
    if (!container || !mainStage || !stageRow) return

    const isMobileMain = Boolean(container.closest('.layout--mobile-main'))

    const cards = getVideoCards()
    const index = activeIndex ?? currentIndexRef.current
    const activeCard =
      (cards[index] as HTMLElement | undefined) ??
      (container.querySelector('.video-card.active') as HTMLElement | null)
    if (!activeCard) return

    const stageRect = mainStage.getBoundingClientRect()
    const rowRect = stageRow.getBoundingClientRect()
    // Visual rect may be scale(0.92); layout center == visual center with
    // transform-origin:center, so recover the full layout edges from offset size.
    const visual = activeCard.getBoundingClientRect()
    const layoutWidth = activeCard.offsetWidth
    const centerX = visual.left + visual.width / 2
    const layoutLeft = centerX - layoutWidth / 2
    const layoutRight = centerX + layoutWidth / 2
    const layoutBottom = visual.top + visual.height / 2 + activeCard.offsetHeight / 2

    const visibleLeft = Math.max(layoutLeft, stageRect.left)
    const visibleRight = Math.min(layoutRight, stageRect.right)
    const visibleBottom = Math.min(layoutBottom, stageRect.bottom)
    const visibleWidth = Math.max(0, visibleRight - visibleLeft)

    // Desktop gets a slightly roomier inset; phone stays tight for SE widths.
    const edgeInset = isMobileMain ? 10 : 12
    const bottomInset = isMobileMain ? 14 : 16
    const engagementGutter = isMobileMain ? 52 : 64
    const controlGap = 4

    const overlayLeft = visibleLeft - stageRect.left + edgeInset
    const overlayBottom = Math.max(bottomInset, stageRect.bottom - visibleBottom + bottomInset)
    const overlayWidth = Math.max(120, visibleWidth - edgeInset * 2 - engagementGutter)

    // Pin Betski copy to the measured card on both desktop and phone.
    // Desktop CSS calc drifted (left-bias + scale gutters); phone was already synced.
    mainStage.style.setProperty('--overlay-sync-left', `${overlayLeft}px`)
    mainStage.style.setProperty('--overlay-sync-bottom', `${overlayBottom}px`)
    mainStage.style.setProperty('--overlay-sync-width', `${overlayWidth}px`)

    if (!isMobileMain) {
      stageRow.style.removeProperty('--mobile-controls-left')
      return
    }

    const controlsEl = stageRow.querySelector('.container-controls') as HTMLElement | null
    const controlsWidth = controlsEl?.offsetWidth ?? 68
    // Center the rail inside the gutter between the card's right edge and the
    // stage edge — on square phones the gutter widens, hugging the card looked off.
    const gutterStart = visibleRight - rowRect.left
    const gutterWidth = Math.max(0, rowRect.width - gutterStart)
    const desiredControlsLeft = gutterStart + Math.max(controlGap, (gutterWidth - controlsWidth) / 2)
    const clampedControlsLeft = Math.min(
      Math.max(0, desiredControlsLeft),
      Math.max(0, rowRect.width - controlsWidth)
    )
    stageRow.style.setProperty('--mobile-controls-left', `${clampedControlsLeft}px`)
  }

  const getDesiredCenterX = () => {
    const container = containerRef.current
    if (!container) return 0
    const rect = container.getBoundingClientRect()
    const railOffset = getControlRailOffset()
    if (railOffset > 0) {
      const wrapper = container.closest('.video-container-wrapper') as HTMLElement | null
      // Phone keeps a left inset so the card edge isn't clipped; desktop uses full lane.
      const leftInset = wrapper?.closest('.layout--mobile-main')
        ? parseFloat(getComputedStyle(wrapper).getPropertyValue('--video-mobile-left-inset')) || 6
        : 0
      return rect.left + leftInset + (rect.width - railOffset - leftInset) / 2
    }
    return desiredCenterXRef.current ?? rect.left + rect.width / 2
  }

  const computeDesiredCenterXFromFirstCard = (): number | null => {
    const container = containerRef.current
    if (!container) return null
    const railOffset = getControlRailOffset()
    if (railOffset > 0) {
      const rect = container.getBoundingClientRect()
      const wrapper = container.closest('.video-container-wrapper') as HTMLElement | null
      const leftInset = wrapper?.closest('.layout--mobile-main')
        ? parseFloat(getComputedStyle(wrapper).getPropertyValue('--video-mobile-left-inset')) || 6
        : 0
      return rect.left + leftInset + (rect.width - railOffset - leftInset) / 2
    }
    const cards = getVideoCards()
    const firstCard = cards[0]
    if (!firstCard) return null
    const firstRect = firstCard.getBoundingClientRect()
    return firstRect.left + container.scrollLeft + firstRect.width / 2
  }

  const getScrollLeftForIndex = (index: number) => {
    const container = containerRef.current
    const cards = getVideoCards()
    const card = cards[index]
    if (!container || !card) return 0
    const desiredCenterX = getDesiredCenterX()
    const cardRect = card.getBoundingClientRect()
    const cardCenterX = cardRect.left + cardRect.width / 2
    const delta = cardCenterX - desiredCenterX
    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth)
    return Math.max(0, Math.min(container.scrollLeft + delta, maxScrollLeft))
  }

  /**
   * First/last cards need extra scroll-wrapper padding so they can actually
   * reach the desired center. Without trailing padding, the last slide clamps
   * left of center and the previous card peeks forever.
   */
  const syncScrollEdgePadding = () => {
    const container = containerRef.current
    const wrapper = container?.querySelector('.video-scroll-wrapper') as HTMLElement | null
    const cards = getVideoCards()
    if (!container || !wrapper || cards.length === 0) return

    const desiredCenterX = getDesiredCenterX()
    const containerRect = container.getBoundingClientRect()
    const centerInContainer = desiredCenterX - containerRect.left

    const first = cards[0]
    const last = cards[cards.length - 1]
    const firstMarginLeft = parseFloat(getComputedStyle(first).marginLeft) || 0
    const lastMarginRight = parseFloat(getComputedStyle(last).marginRight) || 0

    const paddingLeft = Math.max(0, centerInContainer - firstMarginLeft - first.offsetWidth / 2)
    const paddingRight = Math.max(
      0,
      container.clientWidth - centerInContainer - last.offsetWidth / 2 - lastMarginRight
    )

    const leftPx = `${Math.round(paddingLeft)}px`
    const rightPx = `${Math.round(paddingRight)}px`
    if (wrapper.style.paddingLeft !== leftPx) wrapper.style.paddingLeft = leftPx
    if (wrapper.style.paddingRight !== rightPx) wrapper.style.paddingRight = rightPx
  }

  const settleScroller = () => {
    if (isSnappingRef.current) return
    if (isMobileMainScroller()) return
    scrollToIndex(getNearestIndex(), getSnapScrollBehavior())
  }

  const scheduleSettle = () => {
    if (isSnappingRef.current || isMobileMainScroller()) return
    if (snapTimerRef.current != null) window.clearTimeout(snapTimerRef.current)
    snapTimerRef.current = window.setTimeout(() => {
      snapTimerRef.current = null
      settleScroller()
    }, 120)
  }

  const getNearestIndex = () => {
    const container = containerRef.current
    if (!container) return 0
    const cards = getVideoCards()
    if (cards.length === 0) return 0
    let nearestIndex = 0
    let nearestDistance = Number.POSITIVE_INFINITY
    const desiredCenterX = getDesiredCenterX()
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]
      const cardRect = card.getBoundingClientRect()
      const cardCenterX = cardRect.left + cardRect.width / 2
      const distance = Math.abs(desiredCenterX - cardCenterX)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = i
      }
    }
    return nearestIndex
  }

  const scrollToIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
    const container = containerRef.current
    if (!container) return
    syncScrollEdgePadding()
    const cards = getVideoCards()
    const card = cards[index]
    if (!card) return
    const desiredCenterX = getDesiredCenterX()
    const cardRect = card.getBoundingClientRect()
    const cardCenterX = cardRect.left + cardRect.width / 2
    const delta = cardCenterX - desiredCenterX
    const maxScrollLeft = container.scrollWidth - container.clientWidth
    const targetScrollLeft = Math.max(0, Math.min(container.scrollLeft + delta, maxScrollLeft))
    beginSnap()
    setCurrentIndex(index)
    onPreviewChange?.(index)
    if (behavior === 'auto') {
      // Instant scroll + sync in the same turn — no mid-frame settle jitter.
      container.scrollLeft = targetScrollLeft
      syncMobileCardLayout(index)
      finishSnap(index)
    } else {
      container.scrollTo({ left: targetScrollLeft, behavior })
      window.setTimeout(() => finishSnap(index), 340)
    }
  }

  const handleScroll = () => {
    if (isSnappingRef.current || mobileSwipeRef.current) return
    syncMobileCardLayout()
    if (!isMobileMainScroller()) {
      const index = getNearestIndex()
      if (index !== currentIndex) {
        setCurrentIndex(index)
        onPreviewChange?.(index)
      }
      scheduleSettle()
    }
  }

  const releaseSwipeCapture = (pointerId: number | null) => {
    if (pointerId == null) return
    const el = stageRowRef.current
    if (!el) return
    try {
      if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId)
    } catch {
      // ignore
    }
  }

  /** Always land on a whole card — never leave the scroller mid-drag. */
  const commitMobileSwipe = (clientX?: number) => {
    const swipe = mobileSwipeRef.current
    const scroller = containerRef.current
    if (!swipe || !scroller) return

    const home = swipe.startScroll
    const cur = scroller.scrollLeft
    const spanNext = Math.max(0, swipe.maxScroll - home)
    const spanPrev = Math.max(0, home - swipe.minScroll)
    const towardNext = spanNext > 1 ? (cur - home) / spanNext : 0
    const towardPrev = spanPrev > 1 ? (home - cur) / spanPrev : 0

    const dx = clientX != null ? clientX - swipe.startX : swipe.lastX - swipe.startX
    const flickedNext = swipe.velocityX < -0.28
    const flickedPrev = swipe.velocityX > 0.28
    const COMMIT = 0.14
    const DISTANCE_PX = 36

    let target = swipe.startIndex
    if (flickedNext || towardNext >= COMMIT || dx < -DISTANCE_PX) {
      target = Math.min(swipe.startIndex + 1, getVideoCards().length - 1)
    } else if (flickedPrev || towardPrev >= COMMIT || dx > DISTANCE_PX) {
      target = Math.max(swipe.startIndex - 1, 0)
    }

    const pointerId = swipe.pointerId
    mobileSwipeRef.current = null
    releaseSwipeCapture(pointerId)

    // Incomplete swipe → smooth snap home; completed step → snap to neighbor.
    // Use auto on mobile commits so the next swipe isn't blocked for ~340ms.
    scrollToIndex(target, target === swipe.startIndex ? 'smooth' : 'auto')
  }

  /** Vertical swipe → same page transition as ArrowUp / ArrowDown. */
  const commitVerticalMarketSwipe = (clientY?: number) => {
    const swipe = mobileSwipeRef.current
    if (!swipe) return
    const dy = clientY != null ? clientY - swipe.startY : swipe.lastY - swipe.startY
    const flickedUp = swipe.velocityY < -0.35
    const flickedDown = swipe.velocityY > 0.35
    const h = getStageHeight()
    const DISTANCE_PX = Math.max(48, h * 0.12)
    const pointerId = swipe.pointerId
    mobileSwipeRef.current = null
    releaseSwipeCapture(pointerId)

    // Finger up → next (ArrowDown); finger down → previous (ArrowUp).
    if (flickedUp || dy < -DISTANCE_PX) {
      requestMarketNavigate(1)
    } else if (flickedDown || dy > DISTANCE_PX) {
      requestMarketNavigate(-1)
    }
  }

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobileMainScroller()) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (feedSettlingRef.current) return
    const target = e.target as HTMLElement | null
    if (target?.closest('input, textarea, a, button')) return

    // Let a new swipe interrupt an in-progress snap (feels stuck otherwise).
    if (isSnappingRef.current) {
      isSnappingRef.current = false
      if (snapTimerRef.current != null) {
        window.clearTimeout(snapTimerRef.current)
        snapTimerRef.current = null
      }
    }

    const scroller = containerRef.current
    if (!scroller) return

    syncScrollEdgePadding()

    const startIndex = currentIndexRef.current
    // Lock to a true resting position before measuring neighbors.
    const homeScroll = getScrollLeftForIndex(startIndex)
    scroller.scrollLeft = homeScroll

    const prevScroll = startIndex > 0 ? getScrollLeftForIndex(startIndex - 1) : homeScroll
    const nextScroll =
      startIndex < getVideoCards().length - 1 ? getScrollLeftForIndex(startIndex + 1) : homeScroll

    mobileSwipeRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startScroll: homeScroll,
      startIndex,
      minScroll: Math.min(homeScroll, prevScroll),
      maxScroll: Math.max(homeScroll, nextScroll),
      axis: null,
      lastX: e.clientX,
      lastY: e.clientY,
      lastT: performance.now(),
      velocityX: 0,
      velocityY: 0,
      // Delay capture until axis intent — keeps YES/NO taps clickable
      capturing: false
    }
  }

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const swipe = mobileSwipeRef.current
    if (!swipe || swipe.pointerId !== e.pointerId || isSnappingRef.current) return
    const scroller = containerRef.current
    if (!scroller) return

    const dx = e.clientX - swipe.startX
    const dy = e.clientY - swipe.startY

    if (!swipe.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      swipe.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'
      swipe.capturing = true
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // ignore
      }
    }

    const now = performance.now()
    const dt = Math.max(1, now - swipe.lastT)

    if (swipe.axis === 'y') {
      e.preventDefault()
      swipe.velocityY = (e.clientY - swipe.lastY) / dt
      swipe.lastY = e.clientY
      swipe.lastT = now
      // No finger-follow — commit uses the same settle animation as arrow up/down.
      return
    }

    if (swipe.axis !== 'x') return
    e.preventDefault()

    swipe.velocityX = (e.clientX - swipe.lastX) / dt
    swipe.lastX = e.clientX
    swipe.lastY = e.clientY
    swipe.lastT = now

    // Move ONLY the video scroller. Do not sync overlays/controls mid-drag —
    // that made YES/NO (and the whole chrome) slide with the card.
    const unclamped = swipe.startScroll - dx
    scroller.scrollLeft = Math.max(swipe.minScroll, Math.min(swipe.maxScroll, unclamped))
  }

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const swipe = mobileSwipeRef.current
    if (!swipe || swipe.pointerId !== e.pointerId) return
    const scroller = containerRef.current

    if (swipe.axis === 'y') {
      commitVerticalMarketSwipe(e.clientY)
      return
    }

    // Tap / no horizontal drag — release and let button onClick fire normally.
    if (swipe.axis !== 'x') {
      const pointerId = swipe.pointerId
      const homeIndex = swipe.startIndex
      const homeScroll = swipe.startScroll
      mobileSwipeRef.current = null
      releaseSwipeCapture(pointerId)
      if (scroller && Math.abs(scroller.scrollLeft - homeScroll) > 1) {
        scrollToIndex(homeIndex, 'smooth')
      }
      return
    }

    commitMobileSwipe(e.clientX)
  }

  const handleStagePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const swipe = mobileSwipeRef.current
    if (!swipe || swipe.pointerId !== e.pointerId) return
    const homeIndex = swipe.startIndex
    const pointerId = swipe.pointerId
    const wasVertical = swipe.axis === 'y'
    mobileSwipeRef.current = null
    releaseSwipeCapture(pointerId)
    if (wasVertical) {
      return
    }
    if (swipe.axis === 'x') scrollToIndex(homeIndex, 'smooth')
  }

  const handleStageLostPointerCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    const swipe = mobileSwipeRef.current
    if (!swipe || swipe.pointerId !== e.pointerId) return
    if (swipe.axis === 'x') commitMobileSwipe(swipe.lastX)
    else if (swipe.axis === 'y') commitVerticalMarketSwipe(swipe.lastY)
    else mobileSwipeRef.current = null
  }

  useEffect(() => {
    currentIndexRef.current = currentIndex
  }, [currentIndex])

  useEffect(() => {
    // After swipe/market change, cards may not have layout on the first paint.
    const run = () => syncMobileCardLayout()
    run()
    const raf = window.requestAnimationFrame(() => {
      run()
      window.requestAnimationFrame(run)
    })
    return () => window.cancelAnimationFrame(raf)
  }, [currentIndex, market.id, slides.length])

  useEffect(() => {
    setCurrentIndex(0)
    setSlideMeta({})
    onPreviewChange?.(0)
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0
      mobileSwipeRef.current = null
    }
    window.requestAnimationFrame(() => {
      syncScrollEdgePadding()
      scrollToIndex(0, 'auto')
      syncMobileCardLayout(0)
    })
  }, [market.id])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const onScrollEnd = () => {
      if (isMobileMainScroller()) return
      scheduleSettle()
    }
    container.addEventListener('scrollend', onScrollEnd)
    return () => {
      container.removeEventListener('scrollend', onScrollEnd)
    }
  }, [slides.length, market.id])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let raf: number | null = null
    const recompute = () => {
      if (raf != null) window.cancelAnimationFrame(raf)
      raf = window.requestAnimationFrame(() => {
        if (isMobileMainScroller() && (mobileSwipeRef.current || isSnappingRef.current)) {
          return
        }
        syncScrollEdgePadding()
        const x = computeDesiredCenterXFromFirstCard()
        if (x == null) return
        desiredCenterXRef.current = x
        scrollToIndex(currentIndexRef.current, 'auto')
        syncMobileCardLayout()
      })
    }
    recompute()
    const observer = new ResizeObserver(recompute)
    observer.observe(container)
    if (mainStageRef.current) observer.observe(mainStageRef.current)
    return () => {
      observer.disconnect()
      if (raf != null) window.cancelAnimationFrame(raf)
    }
  }, [slides.length])

  useEffect(() => {
    return () => {
      if (snapTimerRef.current != null) window.clearTimeout(snapTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (longUsd <= 0 && shortUsd <= 0) {
      setShowPositions(false)
      return
    }
    const interval = window.setInterval(() => {
      setShowPositions((current) => !current)
    }, 3200)
    return () => window.clearInterval(interval)
  }, [longUsd > 0, shortUsd > 0])

  useEffect(() => {
    if (requestedIndex == null) return
    if (requestedIndex < 0 || requestedIndex >= slides.length) {
      onRequestedIndexHandled?.()
      return
    }
    if (requestedIndex !== currentIndex) scrollToIndex(requestedIndex, getSnapScrollBehavior())
    onRequestedIndexHandled?.()
  }, [requestedIndex, slides.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return

      if (e.key === 'ArrowRight' && currentIndex < slides.length - 1) {
        e.preventDefault()
        scrollToIndex(currentIndex + 1, getSnapScrollBehavior())
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault()
        scrollToIndex(currentIndex - 1, getSnapScrollBehavior())
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        requestMarketNavigate(1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        requestMarketNavigate(-1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, slides.length, requestMarketNavigate])

  useEffect(() => {
    const stage = stageRowRef.current
    if (!stage || !onNavigateMarket) return
    const onWheel = (e: WheelEvent) => {
      // Prefer vertical intent; ignore mostly-horizontal trackpad pans (bundle swipe).
      if (Math.abs(e.deltaY) < 18 || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return
      e.preventDefault()
      requestMarketNavigate(e.deltaY > 0 ? 1 : -1)
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [onNavigateMarket, requestMarketNavigate, market.id])

  // Betski market/wager creator — not the social video author.
  const creatorHandle = (
    market.creatorHandle ||
    market.legacyCreator ||
    'Betski'
  ).replace(/^@/, '')
  const creator = `@${creatorHandle}`
  const description = market.legacyDescription || market.question || market.name
  const avatar = resolveProfileAvatar(creatorHandle, market.legacyAvatar)

  return (
    <div className="video-container-wrapper">
      {warmEmbeds.length > 0 ? (
        <div className="video-embed-warmup" aria-hidden>
          {warmEmbeds.map((src) => (
            <iframe
              key={src}
              src={src}
              title=""
              tabIndex={-1}
              loading="eager"
              referrerPolicy="no-referrer"
              allow="autoplay; encrypted-media"
            />
          ))}
        </div>
      ) : null}
      <motion.div
        className="video-search-bar"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
          }}
          className="search-form"
        >
          <button type="submit" className="search-icon-btn" aria-label="Search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={market.name}
            className="search-input"
          />
        </form>
      </motion.div>

      <div
        className="video-stage-row"
        ref={stageRowRef}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerCancel={handleStagePointerCancel}
        onLostPointerCapture={handleStageLostPointerCapture}
      >
        <div className="video-main-stage" ref={mainStageRef}>
          <motion.div
            key={market.id}
            className="video-feed-page"
            initial={{ y: enterFromRef.current }}
            animate={{ y: feedY }}
            transition={
              feedMotion === 'idle'
                ? { duration: 0 }
                : {
                    duration: feedMotion === 'exit' ? 0.24 : 0.28,
                    ease: [0.22, 1, 0.36, 1]
                  }
            }
          >
            <div ref={containerRef} className="video-scroller" onScroll={handleScroll}>
              <div className="video-scroll-wrapper">
                {slides.map((slide, index) => (
                  <MediaCard
                    key={slide.id}
                    slide={{ ...slide, ...slideMeta[slide.id] }}
                    isActive={index === currentIndex}
                    index={index}
                    currentIndex={currentIndex}
                    totalSlides={slides.length}
                    soundEnabled={soundEnabled}
                    onSoundChange={setSoundEnabled}
                    onMediaResolved={handleMediaResolved}
                  />
                ))}
              </div>
            </div>

            {/* Betski market / socials copy — always keep on bottom-left */}
            <div className="video-overlay-info">
              <div className="creator-profile">
                <div className="creator-header">
                  <div className="creator-avatar">
                    <img
                      key={`${market.id}-${avatar}`}
                      src={avatar}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={onAvatarError}
                    />
                  </div>
                  <h3 className="creator-name">{creator}</h3>
                </div>
                <div className="creator-details">
                  <p className="market-description">{description}</p>
                  {/* Single text node — no reels here; they were splitting this row off-baseline. */}
                  <p className="market-description--meta">
                    {`${livePrice.toFixed(1)}¢ YES · ${market.timeLeftLabel} left`}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="container-controls-anchor">
        <motion.div
          className="container-controls"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
        <motion.button
          className="action-button long-button"
          onClick={() => onLongClick?.()}
          aria-label={market.type === 'wager' ? 'Yes' : 'Long'}
          {...MOTION_ACTION_BUTTON}
          whileHover={{
            ...MOTION_ACTION_BUTTON.whileHover,
            boxShadow: '0 8px 20px rgba(45, 213, 110, 0.4)',
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {showPositions && longUsd > 0 ? (
              <motion.span
                key="long-position"
                className="market-action-face market-action-face--position"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <span className="market-action-label">POSITION</span>
                <span className="position-amount">{formatAmount(longUsd)}</span>
              </motion.span>
            ) : (
              <motion.span
                key="long-market"
                className="market-action-face"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <span className="market-action-side">YES</span>
                <span className="market-action-price">
                  <RouletteStat
                    value={livePrice}
                    format={(v) => `${Number(v).toFixed(2)}¢`}
                    shuffleKey={statsShuffleKey}
                    spinDir={statsSpinDir}
                    delayMs={0}
                    spinMs={620}
                  />
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <motion.button
          className="action-button short-button"
          onClick={() => onShortClick?.()}
          aria-label={market.type === 'wager' ? 'No' : 'Short'}
          {...MOTION_ACTION_BUTTON}
          whileHover={{
            ...MOTION_ACTION_BUTTON.whileHover,
            boxShadow: '0 8px 20px rgba(255, 77, 77, 0.4)',
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {showPositions && shortUsd > 0 ? (
              <motion.span
                key="short-position"
                className="market-action-face market-action-face--position"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <span className="market-action-label">POSITION</span>
                <span className="position-amount">{formatAmount(shortUsd)}</span>
              </motion.span>
            ) : (
              <motion.span
                key="short-market"
                className="market-action-face"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <span className="market-action-side">NO</span>
                <span className="market-action-price">
                  <RouletteStat
                    value={100 - livePrice}
                    format={(v) => `${Number(v).toFixed(2)}¢`}
                    shuffleKey={statsShuffleKey}
                    spinDir={statsSpinDir}
                    delayMs={55}
                    spinMs={640}
                  />
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <motion.div className="share-controls" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          <button type="button" className="share-icon-button" aria-label="Share" onClick={() => onShareClick?.()}>
            <Send size={26} strokeWidth={2.25} />
          </button>
          <button
            type="button"
            className={`sound-toggle-button ${soundEnabled ? 'active' : ''}`}
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-label={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </motion.div>
      </motion.div>
        </div>
      </div>
    </div>
  )
}

export default VideoContainer
