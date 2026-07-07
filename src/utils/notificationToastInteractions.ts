import type { PanInfo } from 'framer-motion'
import {
  TOAST_SWIPE_DISMISS_OFFSET_PX,
  TOAST_SWIPE_DISMISS_VELOCITY
} from '../constants/notificationToast'

/** Returns true when a horizontal swipe should dismiss the toast (mobile). */
export const shouldDismissToastSwipe = (info: PanInfo): boolean => {
  const { offset, velocity } = info
  const absOffset = Math.abs(offset.x)
  const absVelocity = Math.abs(velocity.x)
  return absOffset >= TOAST_SWIPE_DISMISS_OFFSET_PX || absVelocity >= TOAST_SWIPE_DISMISS_VELOCITY
}

/** Ignore tap-after-drag ghost clicks on mobile. */
export const shouldSuppressToastTap = (didSwipe: boolean): boolean => didSwipe
