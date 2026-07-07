/** Shared Framer Motion presets — subtle press/hover without layout shift. */
export const MOTION_PRESS = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.98 },
  transition: { type: 'tween' as const, duration: 0.15, ease: 'easeOut' as const },
}

export const MOTION_ACTION_BUTTON = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.98 },
  transition: { type: 'tween' as const, duration: 0.15, ease: 'easeOut' as const },
}
