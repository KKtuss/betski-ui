import { useEffect, type RefObject } from 'react'

type UseToastClickOutsideDismissOptions = {
  enabled: boolean
  stackRef: RefObject<HTMLElement | null>
  hasToasts: boolean
  onDismissAll: () => void
}

/**
 * Desktop-only: pointer down outside the toast stack dismisses all visible toasts.
 */
export const useToastClickOutsideDismiss = ({
  enabled,
  stackRef,
  hasToasts,
  onDismissAll
}: UseToastClickOutsideDismissOptions): void => {
  useEffect(() => {
    if (!enabled || !hasToasts) return

    const onPointerDown = (event: PointerEvent) => {
      const stack = stackRef.current
      if (!stack) return
      if (stack.contains(event.target as Node)) return
      onDismissAll()
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [enabled, hasToasts, onDismissAll, stackRef])
}
