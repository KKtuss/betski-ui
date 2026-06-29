import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { FriendBuy } from '../../types/discovery'
import './FriendBuysChip.css'

/**
 * Compact stack of up to three overlapping friend avatars, with a popover
 * that lists each friend's position (YES/NO + $size + when) on hover/focus.
 *
 * The popover is rendered through a portal to `document.body` and positioned
 * with `position: fixed` so it isn't clipped by the discovery row's
 * `overflow: hidden`.
 */
export const FriendBuysChip = ({
  buys,
  onViewProfile
}: {
  buys: FriendBuy[]
  onViewProfile?: (handle: string) => void
}) => {
  const chipRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const updatePos = useCallback(() => {
    const rect = chipRef.current?.getBoundingClientRect()
    if (!rect) return
    // Anchor below the chip; clamp inside the viewport with a 12px margin
    // and an estimated popover width of 320px.
    const popoverWidth = 320
    const margin = 12
    const left = Math.min(
      Math.max(rect.left, margin),
      Math.max(margin, window.innerWidth - popoverWidth - margin)
    )
    setPos({ top: rect.bottom + 8, left })
  }, [])

  useEffect(() => {
    if (!open) return
    const handle = () => updatePos()
    window.addEventListener('scroll', handle, true)
    window.addEventListener('resize', handle)
    return () => {
      window.removeEventListener('scroll', handle, true)
      window.removeEventListener('resize', handle)
    }
  }, [open, updatePos])

  if (!buys || buys.length === 0) return null
  const visible = buys.slice(0, 3)
  const extra = buys.length - visible.length

  const handleOpen = () => {
    updatePos()
    setOpen(true)
  }
  const handleClose = () => setOpen(false)

  const popover = open && pos && typeof document !== 'undefined'
    ? createPortal(
        <div
          className="discovery-friends-popover discovery-friends-popover--portal"
          style={{ top: pos.top, left: pos.left }}
          role="tooltip"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={handleClose}
        >
          <div className="discovery-friends-popover-head">Friendskis in this market</div>
          <ul className="discovery-friends-list">
            {buys.map((f, i) => (
              <li key={`${f.handle}-row-${i}`} className="discovery-friends-row">
                <img
                  className="discovery-friends-row-avatar"
                  src={f.avatar}
                  alt=""
                  onError={(e) => {
                    const img = e.currentTarget
                    img.onerror = null
                    img.src = '/Stems/betskuu.png'
                  }}
                />
                <div className="discovery-friends-row-meta">
                  <button
                    type="button"
                    className="discovery-friends-row-name discovery-friends-row-name--link"
                    onClick={(e) => {
                      e.stopPropagation()
                      onViewProfile?.(f.handle)
                    }}
                  >
                    {f.handle}
                  </button>
                  <span className="discovery-friends-row-time">{f.ago}</span>
                </div>
                <span className={`discovery-friends-row-side discovery-friends-row-side--${f.side === 'YES' ? 'yes' : 'no'}`}>
                  {f.side}
                </span>
                <span className="discovery-friends-row-odds" aria-label={`bought at ${f.oddsAt} cents`}>
                  @ {f.oddsAt}¢
                </span>
                <span className="discovery-friends-row-amount">${f.amountUsd}</span>
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )
    : null

  return (
    <div
      ref={chipRef}
      className="discovery-friends"
      tabIndex={0}
      role="group"
      aria-label={`${buys.length} friendskis bought this market`}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      onFocus={handleOpen}
      onBlur={handleClose}
    >
      <div className="discovery-friends-stack" aria-hidden="true">
        {visible.map((f, i) => (
          <div
            key={`${f.handle}-${i}`}
            className={`discovery-friends-avatar discovery-friends-avatar--${f.side === 'YES' ? 'yes' : 'no'}`}
            style={{ zIndex: visible.length - i }}
          >
            <img
              src={f.avatar}
              alt=""
              onError={(e) => {
                const img = e.currentTarget
                img.onerror = null
                img.src = '/Stems/betskuu.png'
              }}
            />
          </div>
        ))}
        {extra > 0 && (
          <div className="discovery-friends-extra" style={{ zIndex: 0 }}>+{extra}</div>
        )}
      </div>
      <span className="discovery-friends-label">
        {buys.length === 1 ? '1 friendski bought' : `${buys.length} friendskis bought`}
      </span>
      {popover}
    </div>
  )
}
