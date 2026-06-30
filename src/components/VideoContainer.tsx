import { useRef, useState, useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Send, Volume2, VolumeX } from 'lucide-react'
import MediaCard, { type MediaSlide } from './MediaCard'
import type { Market } from '../data/marketCatalog'
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
  const previews = market.previews.length > 0 ? market.previews : [{ id: `${market.id}-fallback`, thumbnailUrl: '/Stems/betskuu.png', volume: 0 }]
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
  onMediaResolved
}: VideoContainerProps) => {
  const slides = useMemo(() => marketToSlides(market), [market])
  const containerRef = useRef<HTMLDivElement>(null)
  const mainStageRef = useRef<HTMLDivElement>(null)
  const stageRowRef = useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [showPositions, setShowPositions] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const snapTimerRef = useRef<number | null>(null)
  const isSnappingRef = useRef(false)
  const desiredCenterXRef = useRef<number | null>(null)
  const currentIndexRef = useRef(0)
  const gestureAnchorRef = useRef({ scrollLeft: 0, index: 0 })
  const gestureActiveRef = useRef(false)
  const gestureSettledRef = useRef(true)
  const momentumSettleTimerRef = useRef<number | null>(null)

  const isMobileMainScroller = () =>
    Boolean(containerRef.current?.closest('.layout--mobile-main'))

  const getSnapScrollBehavior = (): ScrollBehavior =>
    isMobileMainScroller() ? 'auto' : 'smooth'

  const finishSnap = () => {
    isSnappingRef.current = false
    syncMobileCardLayout()
    const container = containerRef.current
    if (container && isMobileMainScroller()) {
      gestureAnchorRef.current = {
        scrollLeft: container.scrollLeft,
        index: currentIndexRef.current
      }
      gestureActiveRef.current = false
      gestureSettledRef.current = true
    }
  }

  const clearMomentumSettleTimer = () => {
    if (momentumSettleTimerRef.current != null) {
      window.clearTimeout(momentumSettleTimerRef.current)
      momentumSettleTimerRef.current = null
    }
  }

  const beginSnap = () => {
    isSnappingRef.current = true
    clearMomentumSettleTimer()
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

  const getVideoCards = () => {
    const container = containerRef.current
    if (!container) return []
    return Array.from(container.querySelectorAll('.video-card')) as HTMLElement[]
  }

  const getControlRailOffset = () => {
    const container = containerRef.current
    if (!container?.closest('.layout--mobile-main')) return 0
    const controls = container
      .closest('.video-stage-row')
      ?.querySelector('.container-controls') as HTMLElement | null
    if (!controls) return 0
    return controls.offsetWidth + 6
  }

  const syncMobileCardLayout = () => {
    const container = containerRef.current
    const mainStage = mainStageRef.current
    const stageRow = stageRowRef.current
    if (!container || !mainStage || !stageRow) return

    const clearSyncedLayout = () => {
      mainStage.style.removeProperty('--overlay-sync-left')
      mainStage.style.removeProperty('--overlay-sync-bottom')
      mainStage.style.removeProperty('--overlay-sync-width')
      stageRow.style.removeProperty('--mobile-controls-left')
    }

    if (!container.closest('.layout--mobile-main')) {
      clearSyncedLayout()
      return
    }

    const activeCard = container.querySelector('.video-card.active') as HTMLElement | null
    if (!activeCard) return

    const stageRect = mainStage.getBoundingClientRect()
    const rowRect = stageRow.getBoundingClientRect()
    const cardRect = activeCard.getBoundingClientRect()

    const edgeInset = 10
    const bottomInset = 10
    const engagementGutter = 52
    const controlGap = 4

    const overlayLeft = cardRect.left - stageRect.left + edgeInset
    const overlayBottom = stageRect.bottom - cardRect.bottom + bottomInset
    const overlayWidth = Math.max(120, cardRect.width - edgeInset * 2 - engagementGutter)

    mainStage.style.setProperty('--overlay-sync-left', `${overlayLeft}px`)
    mainStage.style.setProperty('--overlay-sync-bottom', `${overlayBottom}px`)
    mainStage.style.setProperty('--overlay-sync-width', `${overlayWidth}px`)

    const controlsEl = stageRow.querySelector('.container-controls') as HTMLElement | null
    const controlsWidth = controlsEl?.offsetWidth ?? 68
    const desiredControlsLeft = cardRect.right - rowRect.left + controlGap
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
      return rect.left + (rect.width - railOffset) / 2 - 3
    }
    return desiredCenterXRef.current ?? rect.left + rect.width / 2 - 3
  }

  const computeDesiredCenterXFromFirstCard = (): number | null => {
    const container = containerRef.current
    if (!container) return null
    const railOffset = getControlRailOffset()
    if (railOffset > 0) {
      const rect = container.getBoundingClientRect()
      return rect.left + (rect.width - railOffset) / 2 - 3
    }
    const cards = getVideoCards()
    const firstCard = cards[0]
    if (!firstCard) return null
    const firstRect = firstCard.getBoundingClientRect()
    return firstRect.left + container.scrollLeft + firstRect.width / 2 - 3
  }

  const getMobileStepTargetIndex = () => {
    const container = containerRef.current
    const cards = getVideoCards()
    if (!container || cards.length === 0) return 0

    const { scrollLeft: startScroll, index: startIndex } = gestureAnchorRef.current
    const delta = container.scrollLeft - startScroll
    const cardStep =
      cards[1] && cards[0]
        ? Math.max(48, cards[1].offsetLeft - cards[0].offsetLeft)
        : Math.max(48, container.clientWidth * 0.18)
    const threshold = Math.min(cardStep * 0.18, 48)

    if (Math.abs(delta) < threshold) return startIndex
    if (delta > 0) return Math.min(startIndex + 1, cards.length - 1)
    return Math.max(startIndex - 1, 0)
  }

  const settleMobileGesture = () => {
    if (!isMobileMainScroller()) return
    if (!gestureActiveRef.current || gestureSettledRef.current || isSnappingRef.current) return

    gestureSettledRef.current = true
    clearMomentumSettleTimer()
    scrollToIndex(getMobileStepTargetIndex(), 'auto')
  }

  const scheduleMomentumSettleFallback = () => {
    if (!isMobileMainScroller() || gestureSettledRef.current) return
    clearMomentumSettleTimer()
    momentumSettleTimerRef.current = window.setTimeout(() => {
      momentumSettleTimerRef.current = null
      settleMobileGesture()
    }, 320)
  }

  const settleScroller = () => {
    if (isSnappingRef.current) return
    if (isMobileMainScroller()) {
      settleMobileGesture()
      return
    }
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
    if (containerRef.current) {
      const container = containerRef.current
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
      container.scrollTo({ left: targetScrollLeft, behavior })
      setCurrentIndex(index)
      onPreviewChange?.(index)
      if (behavior === 'auto') {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(finishSnap)
        })
      } else {
        window.setTimeout(finishSnap, 320)
      }
    }
  }

  const handleScroll = () => {
    if (isSnappingRef.current) return
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

  const beginMobileGesture = (target: HTMLDivElement) => {
    if (isSnappingRef.current) return
    clearMomentumSettleTimer()
    gestureActiveRef.current = true
    gestureSettledRef.current = false
    gestureAnchorRef.current = {
      scrollLeft: target.scrollLeft,
      index: currentIndexRef.current
    }
  }

  const handleScrollerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobileMainScroller()) return
    beginMobileGesture(e.currentTarget)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleScrollerPointerUp = () => {
    if (!isMobileMainScroller()) return
    scheduleMomentumSettleFallback()
  }

  const handleScrollerPointerCancel = () => {
    if (!isMobileMainScroller()) return
    scheduleMomentumSettleFallback()
  }

  useEffect(() => {
    currentIndexRef.current = currentIndex
  }, [currentIndex])

  useEffect(() => {
    syncMobileCardLayout()
  }, [currentIndex, market.id])

  useEffect(() => {
    setCurrentIndex(0)
    onPreviewChange?.(0)
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0
      gestureAnchorRef.current = { scrollLeft: 0, index: 0 }
      gestureActiveRef.current = false
      gestureSettledRef.current = true
      clearMomentumSettleTimer()
    }
  }, [market.id])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const onScrollEnd = () => {
      if (isMobileMainScroller()) {
        settleMobileGesture()
        return
      }
      scheduleSettle()
    }
    container.addEventListener('scrollend', onScrollEnd)
    gestureAnchorRef.current = { scrollLeft: container.scrollLeft, index: currentIndexRef.current }
    return () => {
      container.removeEventListener('scrollend', onScrollEnd)
      clearMomentumSettleTimer()
    }
  }, [slides.length, market.id])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let raf: number | null = null
    const recompute = () => {
      if (raf != null) window.cancelAnimationFrame(raf)
      raf = window.requestAnimationFrame(() => {
        if (
          isMobileMainScroller() &&
          gestureActiveRef.current &&
          !gestureSettledRef.current
        ) {
          return
        }
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
      clearMomentumSettleTimer()
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
    if (requestedIndex !== currentIndex) scrollToIndex(requestedIndex)
    onRequestedIndexHandled?.()
  }, [requestedIndex, slides.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentIndex < slides.length - 1) {
        e.preventDefault()
        scrollToIndex(currentIndex + 1)
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault()
        scrollToIndex(currentIndex - 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, slides.length])

  const creator = market.legacyCreator ?? (market.creatorHandle ? `@${market.creatorHandle}` : '@Betski')
  const description = market.legacyDescription ?? market.question ?? market.name
  const avatar = market.legacyAvatar ?? '/Stems/betskuu.png'

  return (
    <div className="video-container-wrapper">
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

      <div className="video-stage-row" ref={stageRowRef}>
        <div className="video-main-stage" ref={mainStageRef}>
          <div
            ref={containerRef}
            className="video-scroller"
            onScroll={handleScroll}
            onPointerDown={handleScrollerPointerDown}
            onPointerUp={handleScrollerPointerUp}
            onPointerCancel={handleScrollerPointerCancel}
          >
            <div className="video-scroll-wrapper">
              {slides.map((slide, index) => (
                <MediaCard
                  key={slide.id}
                  slide={slide}
                  isActive={index === currentIndex}
                  index={index}
                  currentIndex={currentIndex}
                  totalSlides={slides.length}
                  onMediaResolved={onMediaResolved}
                />
              ))}
            </div>
          </div>

          <motion.div
            className="video-overlay-info"
            key={`info-${market.id}-${currentIndex}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="creator-profile">
              <div className="creator-header">
                <div className="creator-avatar">
                  <img src={avatar} alt="creator" referrerPolicy="no-referrer" />
                </div>
                <h3 className="creator-name">{creator}</h3>
              </div>
              <div className="creator-details">
                <p className="market-description">{description}</p>
                <p className="market-description" style={{ opacity: 0.7, fontSize: '12px', marginTop: 4 }}>
                  {livePrice.toFixed(1)}¢ YES · {market.timeLeftLabel} left
                </p>
              </div>
            </div>
          </motion.div>
        </div>

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
          whileHover={{ scale: 1.1, boxShadow: '0 8px 20px rgba(45, 213, 110, 0.4)' }}
          whileTap={{ scale: 0.95 }}
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
                <span className="market-action-price">{livePrice.toFixed(2)}¢</span>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <motion.button
          className="action-button short-button"
          onClick={() => onShortClick?.()}
          aria-label={market.type === 'wager' ? 'No' : 'Short'}
          whileHover={{ scale: 1.1, boxShadow: '0 8px 20px rgba(255, 77, 77, 0.4)' }}
          whileTap={{ scale: 0.95 }}
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
                <span className="market-action-price">{(100 - livePrice).toFixed(2)}¢</span>
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
  )
}

export default VideoContainer
