import { useState, useRef, type SyntheticEvent } from 'react'
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
      img.src = '/Stems/betskuu.png'
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
      onError={handleError}
    />
  )
}

export const BatchPreviewCards = ({ items }: { items: BatchPreviewItem[] }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const displayItems = items.slice(0, 5)
  const transforms = [
    { left: 15, top: 0, rotate: 0, zIndex: 5, opacity: 1 },
    { left: 27, top: 0, rotate: 0, zIndex: 4, opacity: 1 },
    { left: 40, top: 0, rotate: 0, zIndex: 3, opacity: 1 },
    { left: 52, top: 0, rotate: 0, zIndex: 2, opacity: 1 },
    { left: 64, top: 0, rotate: 0, zIndex: 1, opacity: 1 }
  ]

  const handleMouseMoveCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (displayItems.length <= 1) return
    const rect = e.currentTarget.getBoundingClientRect()
    const relativeX = e.clientX - rect.left
    const stackWidth = rect.width || 1
    const estimatedIndex = Math.round((relativeX / stackWidth) * (displayItems.length - 1))
    const idx = clamp(estimatedIndex, 0, displayItems.length - 1)
    if (hoveredIndex !== idx) setHoveredIndex(idx)
  }

  return (
    <div
      className="discovery-preview-cards"
      onMouseMoveCapture={handleMouseMoveCapture}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      {displayItems.map((item, idx) => {
        const style = transforms[idx] ?? transforms[transforms.length - 1]
        const activeIndex = hoveredIndex ?? 0
        const active = idx === activeIndex
        const effectiveZ = hoveredIndex != null && active ? 999 : style.zIndex
        const scale = active ? 1.18 : 1
        return (
          <div
            key={`${item.id}-${idx}`}
            className="discovery-preview-card"
            style={{
              left: `${style.left}%`,
              top: `${style.top}px`,
              transform: `rotate(${style.rotate}deg) scale(${scale})`,
              zIndex: effectiveZ,
              opacity: style.opacity
            }}
          >
            <PreviewCardImage item={item} />
          </div>
        )
      })}
    </div>
  )
}
