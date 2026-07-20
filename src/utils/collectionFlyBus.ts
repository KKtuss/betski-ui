export type CollectionFlyPayload = {
  thumbnails: string[]
}

type Listener = (payload: CollectionFlyPayload) => void

const listeners = new Set<Listener>()
let lastTriggerAt = 0
const MIN_TRIGGER_GAP_MS = 900

/** Fire the discovery → profile “add to collection” fly animation. */
export function triggerCollectionFly(thumbnails: string[]) {
  const cleaned = thumbnails.filter(Boolean).slice(0, 3)
  if (cleaned.length === 0) return

  const now = Date.now()
  if (now - lastTriggerAt < MIN_TRIGGER_GAP_MS) return
  lastTriggerAt = now

  const payload = { thumbnails: cleaned }
  listeners.forEach((fn) => {
    try {
      fn(payload)
    } catch {
      // ignore listener errors
    }
  })
}

export function subscribeCollectionFly(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
