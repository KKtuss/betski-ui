import { useEffect, useRef, useState, type PointerEvent, type SyntheticEvent } from 'react'
import { getDisplayThumbnailUrl } from '../../utils/thumbnailProxy'
import { repairPreviewThumbnail } from '../../data/discoveryStore'
import type { BatchPreviewItem } from '../../types/discovery'
import { clamp } from '../../utils/math'
import './BatchPreviewCards.css'

export type { BatchPreviewItem } from '../../types/discovery'

const PreviewCardImage = ({ item }: { item: BatchPreviewItem }) => {
  const repairingRef = useRef(false)

  const handleError = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (img.dataset.fallback !== '1') {
      img.dataset.fallback = '1'
      img.onerror = null
      img.src = '/Stems/BetskiPEFFPEE.png'
    }

    const sourceUrl = item.sourceUrl?.trim()
    if (!sourceUrl || repairingRef.current) return
    repairingRef.current = true
    void repairPreviewThumbnail(item.id, sourceUrl).finally(() => {
      repairingRef.current = false
    })
  }

  return (
    <img
      src={getDisplayThumbnailUrl(item.thumbnailUrl)}
      alt=""
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
      draggable={false}
      onError={handleError}
    />
  )
}

type FanSlot = { left: number; rotate: number; zIndex: number }

/** Idle pack — tight overlap so slim rows keep title room. */
const FAN_BY_COUNT: FanSlot[][] = [
  [{ left: 50, rotate: 0, zIndex: 5 }],
  [
    { left: 46, rotate: -5, zIndex: 3 },
    { left: 54, rotate: 5, zIndex: 5 }
  ],
  [
    { left: 44, rotate: -6, zIndex: 2 },
    { left: 50, rotate: 0, zIndex: 5 },
    { left: 56, rotate: 6, zIndex: 3 }
  ],
  [
    { left: 42, rotate: -7, zIndex: 1 },
    { left: 47, rotate: -3, zIndex: 3 },
    { left: 53, rotate: 3, zIndex: 5 },
    { left: 58, rotate: 7, zIndex: 2 }
  ],
  [
    { left: 40, rotate: -7, zIndex: 1 },
    { left: 45, rotate: -3.5, zIndex: 2 },
    { left: 50, rotate: 0, zIndex: 5 },
    { left: 55, rotate: 3.5, zIndex: 3 },
    { left: 60, rotate: 7, zIndex: 2 }
  ]
]

/** Extra px the active card pulls out of the pack (and neighbors yield). */
const POP_GAP_PX = 10
const NEIGHBOR_YIELD_PX = 4

const indexFromClientX = (el: HTMLElement, clientX: number, count: number) => {
  const rect = el.getBoundingClientRect()
  const relativeX = clientX - rect.left
  const stackWidth = rect.width || 1
  const estimated = Math.round((relativeX / stackWidth) * (count - 1))
  return clamp(estimated, 0, count - 1)
}

const defaultFrontIndex = (count: number) => {
  if (count <= 1) return 0
  if (count === 2) return 1
  return Math.floor((count - 1) / 2)
}

const cardMotion = (idx: number, frontIndex: number, count: number, hot: boolean) => {
  const mid = (count - 1) / 2
  const side = idx === mid ? 0 : idx < mid ? -1 : 1

  if (!hot) {
    return { popX: 0, popY: 0, scale: idx === frontIndex ? 1 : 0.97, rotateFactor: 1 }
  }

  if (idx === frontIndex) {
    // Pull the toggled card clear of the pack.
    const popX = side === 0 ? 0 : side * POP_GAP_PX
    return { popX, popY: -7, scale: 1.12, rotateFactor: 0.15 }
  }

  // Neighbors slide away from the front card to open a gap.
  const away = idx < frontIndex ? -1 : 1
  return {
    popX: away * NEIGHBOR_YIELD_PX,
    popY: 1,
    scale: 0.9,
    rotateFactor: 1.15
  }
}

export const BatchPreviewCards = ({ items }: { items: BatchPreviewItem[] }) => {
  const displayItems = items.slice(0, 5)
  const count = displayItems.length
  const fan = FAN_BY_COUNT[count - 1] ?? FAN_BY_COUNT[4]
  const [frontIndex, setFrontIndex] = useState(() => defaultFrontIndex(count))
  const [hot, setHot] = useState(false)
  const scrubRef = useRef<{
    pointerId: number
    startX: number
    moved: boolean
  } | null>(null)
  const blockClickRef = useRef(false)

  useEffect(() => {
    setFrontIndex(defaultFrontIndex(count))
    setHot(false)
  }, [count, items[0]?.id])

  const setFrontFromEvent = (el: HTMLElement, clientX: number) => {
    if (count <= 1) return
    const idx = indexFromClientX(el, clientX, count)
    setFrontIndex((prev) => (prev === idx ? prev : idx))
  }

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (count <= 1) return
    if (e.pointerType === 'mouse') return
    blockClickRef.current = false
    setHot(true)
    scrubRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      moved: false
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    setFrontFromEvent(e.currentTarget, e.clientX)
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (count <= 1) return

    if (e.pointerType === 'mouse') {
      if (!hot) setHot(true)
      setFrontFromEvent(e.currentTarget, e.clientX)
      return
    }

    const scrub = scrubRef.current
    if (!scrub || scrub.pointerId !== e.pointerId) return
    if (Math.abs(e.clientX - scrub.startX) > 6) {
      scrub.moved = true
      blockClickRef.current = true
    }
    if (scrub.moved) {
      e.preventDefault()
      e.stopPropagation()
    }
    setFrontFromEvent(e.currentTarget, e.clientX)
  }

  const endScrub = (e: PointerEvent<HTMLDivElement>) => {
    const scrub = scrubRef.current
    if (!scrub || scrub.pointerId !== e.pointerId) return
    if (scrub.moved) {
      e.preventDefault()
      e.stopPropagation()
      blockClickRef.current = true
    }
    scrubRef.current = null
    setHot(false)
    setFrontIndex(defaultFrontIndex(count))
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      // ignore
    }
  }

  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (blockClickRef.current) {
      e.preventDefault()
      e.stopPropagation()
      blockClickRef.current = false
    }
  }

  if (count === 0) return null

  return (
    <div
      className={`discovery-preview-cards${hot ? ' is-hot' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endScrub}
      onPointerCancel={endScrub}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') setHot(true)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') {
          setHot(false)
          setFrontIndex(defaultFrontIndex(count))
        }
      }}
      onClickCapture={handleClickCapture}
      role="group"
      aria-label={`${count} video preview${count === 1 ? '' : 's'}. Hover or slide to browse.`}
    >
      {displayItems.map((item, idx) => {
        const style = fan[idx] ?? fan[fan.length - 1]
        const active = idx === frontIndex
        const motion = cardMotion(idx, frontIndex, count, hot)
        const rotate = style.rotate * motion.rotateFactor
        return (
          <div
            key={`${item.id}-${idx}`}
            className={`discovery-preview-card${active && hot ? ' is-front' : ''}`}
            style={{
              left: `${style.left}%`,
              transform: `translateX(calc(-50% + ${motion.popX}px)) translateY(${motion.popY}px) rotate(${rotate}deg) scale(${motion.scale})`,
              zIndex: active ? 999 : style.zIndex
            }}
          >
            <PreviewCardImage item={item} />
          </div>
        )
      })}
    </div>
  )
}
