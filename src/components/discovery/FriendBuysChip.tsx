import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import type { FriendBuy } from '../../types/discovery'
import './FriendBuysChip.css'

const canHover = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

/**
 * Compact stack of up to three overlapping friend avatars, with a popover
 * that lists each friend's position (YES/NO + $size + when).
 *
 * Desktop: hover/focus. Phone: tap to toggle (hover devices keep hover).
 * Popover is portaled to `document.body` so row `overflow: hidden` can't clip it.
 */
export const FriendBuysChip = ({
  buys,
  onViewProfile
}: {
  buys: FriendBuy[]
  onViewProfile?: (handle: string) => void
}) => {
  const chipRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const updatePos = useCallback(() => {
    const rect = chipRef.current?.getBoundingClientRect()
    if (!rect) return
    const popoverWidth = Math.min(320, window.innerWidth - 24)
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

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (chipRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open])

  const list = buys ?? []
  const isEmpty = list.length === 0
  const visible = list.slice(0, 3)
  const extra = list.length - visible.length

  const handleOpen = () => {
    if (isEmpty) return
    updatePos()
    setOpen(true)
  }
  const handleClose = () => setOpen(false)

  const handleChipClick = (e: MouseEvent) => {
    e.stopPropagation()
    if (isEmpty) return
    // Fine-pointer hover already drives open/close; tap devices toggle.
    if (canHover()) return
    e.preventDefault()
    if (open) handleClose()
    else handleOpen()
  }

  const popover = open && pos && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={popoverRef}
          className="discovery-friends-popover discovery-friends-popover--portal"
          style={{ top: pos.top, left: pos.left }}
          role="dialog"
          aria-label="Friendskis in this market"
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={() => {
            if (canHover()) setOpen(true)
          }}
          onMouseLeave={() => {
            if (canHover()) handleClose()
          }}
        >
          <div className="discovery-friends-popover-head">Friendskis in this market</div>
          <ul className="discovery-friends-list">
            {list.map((f, i) => (
              <li key={`${f.handle}-row-${i}`} className="discovery-friends-row">
                <img
                  className="discovery-friends-row-avatar"
                  src={f.avatar}
                  alt=""
                  onError={(e) => {
                    const img = e.currentTarget
                    img.onerror = null
                    img.src = '/Stems/BetskiPEFFPEE.png'
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
      className={`discovery-friends${isEmpty ? ' discovery-friends--empty' : ''}${open ? ' is-open' : ''}`}
      tabIndex={isEmpty ? -1 : 0}
      role="button"
      aria-expanded={isEmpty ? undefined : open}
      aria-haspopup={isEmpty ? undefined : 'dialog'}
      aria-label={
        isEmpty
          ? 'No friendskis bought this market'
          : `${list.length} friendskis bought this market`
      }
      onClick={handleChipClick}
      onMouseEnter={() => {
        if (canHover()) handleOpen()
      }}
      onMouseLeave={() => {
        if (canHover()) handleClose()
      }}
      onKeyDown={(e) => {
        if (isEmpty) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          if (open) handleClose()
          else handleOpen()
        } else if (e.key === 'Escape' && open) {
          e.preventDefault()
          handleClose()
        }
      }}
    >
      <div className="discovery-friends-stack" aria-hidden="true">
        {isEmpty ? (
          <div className="discovery-friends-avatar discovery-friends-avatar--empty" />
        ) : (
          visible.map((f, i) => (
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
                  img.src = '/Stems/BetskiPEFFPEE.png'
                }}
              />
            </div>
          ))
        )}
        {extra > 0 && (
          <div className="discovery-friends-extra" style={{ zIndex: 0 }}>+{extra}</div>
        )}
      </div>
      <span className="discovery-friends-label">
        {list.length === 1 ? '1 friendski bought' : `${list.length} friendskis bought`}
      </span>
      {popover}
    </div>
  )
}
