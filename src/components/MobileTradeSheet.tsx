import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, type PanInfo } from 'framer-motion'
import './MobileTradeSheet.css'

type SheetPage = 0 | 1 | 2

interface MobileTradeSheetProps {
  open: boolean
  /** 0 = Rules, 1 = Trade, 2 = Activity */
  initialPage?: SheetPage
  onClose: () => void
  rules: ReactNode
  trade: ReactNode
  activity: ReactNode
  tradeLabel?: string
}

const PAGES: { key: SheetPage; label: string }[] = [
  { key: 0, label: 'Rules' },
  { key: 1, label: 'Trade' },
  { key: 2, label: 'Activity' }
]

/**
 * Phone-only bottom sheet that slides up to ~2/3 of the screen (TikTok/Instagram
 * comments style). Horizontally swipeable between Rules · Trade · Activity, and
 * dismissible by dragging the grab handle down or tapping the backdrop.
 */
const MobileTradeSheet = ({
  open,
  initialPage = 1,
  onClose,
  rules,
  trade,
  activity,
  tradeLabel
}: MobileTradeSheetProps) => {
  const [page, setPage] = useState<SheetPage>(initialPage)
  const [width, setWidth] = useState(0)
  const viewportRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef(initialPage)
  const blockSwipeRef = useRef(false)
  const x = useMotionValue(0)

  useEffect(() => {
    pageRef.current = page
  }, [page])

  useEffect(() => {
    if (open) setPage(initialPage)
  }, [open, initialPage])

  useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  useEffect(() => {
    if (width <= 0) return
    const controls = animate(x, -page * width, {
      type: 'spring',
      stiffness: 420,
      damping: 40
    })
    return () => controls.stop()
  }, [page, width, x])

  const handleHorizontalDragEnd = (_e: unknown, info: PanInfo) => {
    if (width <= 0) return
    if (blockSwipeRef.current) {
      blockSwipeRef.current = false
      animate(x, -pageRef.current * width, {
        type: 'spring',
        stiffness: 420,
        damping: 40
      })
      return
    }
    const currentPage = pageRef.current
    const threshold = Math.max(48, width * 0.2)
    if (info.offset.x <= -threshold && currentPage < 2) {
      setPage((currentPage + 1) as SheetPage)
      return
    }
    if (info.offset.x >= threshold && currentPage > 0) {
      setPage((currentPage - 1) as SheetPage)
    }
  }

  const handleVerticalDragEnd = (_e: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 700) onClose()
  }

  const labelFor = (key: SheetPage) => (key === 1 && tradeLabel ? tradeLabel : PAGES[key].label)
  const pageWidth = width > 0 ? width : undefined

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="mts-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="mts-sheet"
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
          >
            <motion.div
              className="mts-handle-zone"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={handleVerticalDragEnd}
            >
              <div className="mts-grab" aria-hidden="true" />
              <div className="mts-tabs" role="tablist">
                {PAGES.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    role="tab"
                    aria-selected={page === p.key}
                    className={`mts-tab${page === p.key ? ' is-active' : ''}`}
                    onClick={() => setPage(p.key)}
                  >
                    {labelFor(p.key)}
                  </button>
                ))}
              </div>
            </motion.div>

            <div
              className="mts-viewport"
              ref={viewportRef}
              onPointerDownCapture={(e) => {
                blockSwipeRef.current =
                  e.target instanceof Element &&
                  Boolean(e.target.closest('[data-sheet-no-swipe]'))
              }}
            >
              {pageWidth ? (
                <motion.div
                  className="mts-track"
                  style={{ x }}
                  drag="x"
                  dragDirectionLock
                  dragConstraints={{ left: -2 * pageWidth, right: 0 }}
                  dragElastic={0.14}
                  onDragStart={(e) => {
                    blockSwipeRef.current =
                      e.target instanceof Element &&
                      Boolean(e.target.closest('[data-sheet-no-swipe]'))
                  }}
                  onDrag={(_e, _info) => {
                    if (blockSwipeRef.current && width > 0) {
                      x.set(-pageRef.current * width)
                    }
                  }}
                  onDragEnd={handleHorizontalDragEnd}
                >
                  <div className="mts-page" style={{ width: pageWidth }}>
                    {rules}
                  </div>
                  <div className="mts-page" style={{ width: pageWidth }}>
                    {trade}
                  </div>
                  <div className="mts-page" style={{ width: pageWidth }}>
                    {activity}
                  </div>
                </motion.div>
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default MobileTradeSheet
