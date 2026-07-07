import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  LOOTBOX_CHIP_IMAGE_SRC,
  LOOTBOX_ITEMS,
  LOOTBOX_LOCK_REST_SRC
} from '../../data/profileLootboxes'
import './ProfileLootboxesStrip.css'

type ProfileLootboxesStripProps = {
  onOpenLootbox: () => void
}

const ProfileLootboxesStrip = ({ onOpenLootbox }: ProfileLootboxesStripProps) => {
  const lootboxesRowRef = useRef<HTMLDivElement>(null)
  const [canScrollLootboxesLeft, setCanScrollLootboxesLeft] = useState(false)
  const [canScrollLootboxesRight, setCanScrollLootboxesRight] = useState(false)

  const updateLootboxesScrollState = () => {
    const el = lootboxesRowRef.current
    if (!el) return
    const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth)
    const epsilon = 0.5
    setCanScrollLootboxesLeft(el.scrollLeft > epsilon)
    setCanScrollLootboxesRight(el.scrollLeft < (maxScrollLeft - epsilon))
  }

  useEffect(() => {
    const el = lootboxesRowRef.current
    if (!el) return

    // Ensure we always start at the true left-most position.
    el.scrollLeft = 0
    updateLootboxesScrollState()
    const ro = new ResizeObserver(() => updateLootboxesScrollState())
    ro.observe(el)
    window.addEventListener('resize', updateLootboxesScrollState)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateLootboxesScrollState)
    }
  }, [])

  return (
    <div className="profile-lootboxes-panel profile-lootboxes-panel--half">
      <div className="profile-lootboxes-strip">
        <button
          type="button"
          className={`lootboxes-nav lootboxes-nav-left ${canScrollLootboxesLeft ? '' : 'hidden'}`}
          aria-label="Scroll lootboxes left"
          onClick={() => {
            lootboxesRowRef.current?.scrollBy({ left: -200, behavior: 'smooth' })
            requestAnimationFrame(updateLootboxesScrollState)
            setTimeout(updateLootboxesScrollState, 260)
          }}
        >
          <ChevronLeft size={16} />
        </button>
        <div className="profile-lootboxes-row" ref={lootboxesRowRef} onScroll={updateLootboxesScrollState}>
          {LOOTBOX_ITEMS.map(({ index: i, isAvailable }) => (
            <button
              key={i}
              type="button"
              className={`lootbox-chip ${isAvailable ? 'available' : 'locked'}`}
              disabled={!isAvailable}
              onClick={() => {
                if (!isAvailable) return
                onOpenLootbox()
              }}
              aria-label={isAvailable ? `Open lootbox ${i + 1}` : `Lootbox ${i + 1} locked`}
            >
              <img className="lootbox-img" src={LOOTBOX_CHIP_IMAGE_SRC} alt="" />
              {!isAvailable && (
                <div className="lootbox-lock" aria-hidden="true">
                  <img className="lootbox-lock-img" src={LOOTBOX_LOCK_REST_SRC} alt="" />
                </div>
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`lootboxes-nav lootboxes-nav-right ${canScrollLootboxesRight ? '' : 'hidden'}`}
          aria-label="Scroll lootboxes right"
          onClick={() => {
            lootboxesRowRef.current?.scrollBy({ left: 200, behavior: 'smooth' })
            requestAnimationFrame(updateLootboxesScrollState)
            setTimeout(updateLootboxesScrollState, 260)
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

export default ProfileLootboxesStrip
