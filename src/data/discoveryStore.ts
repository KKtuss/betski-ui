import type { Batch, OpenBet, Wager, WagerFill } from '../types/discovery'
import type { BatchPreviewItem } from '../types/discovery'
import { buildBatches, buildWagers } from './discoveryMock'
import { CURRENT_USER_HANDLE } from './appStore'
import { resolveContentLink } from '../utils/resolveContentLink'
import { isPlaceholderThumbnail, needsThumbnailProxy, proxiedThumbnailUrl, PLACEHOLDER_THUMB } from '../utils/thumbnailProxy'
import { clamp } from '../utils/math'

const STORAGE_KEY = 'betski-discovery-catalog'

export type DiscoveryCatalog = {
  version: 1
  seedId?: string
  batches: Batch[]
  wagers: Wager[]
}

type Listener = () => void
const listeners = new Set<Listener>()
let storageListenerAttached = false

const notify = () => {
  listeners.forEach((fn) => fn())
}

/** Stable snapshot for useSyncExternalStore. */
let cachedCatalog: DiscoveryCatalog | null = null
const CURRENT_DISCOVERY_SEED_ID = 'viral-markets-2026-06-17-three-real-wagers'

const isDiscoveryCatalog = (value: unknown): value is DiscoveryCatalog => {
  const catalog = value as DiscoveryCatalog | null
  return Boolean(
    catalog &&
      catalog.version === 1 &&
      catalog.seedId === CURRENT_DISCOVERY_SEED_ID &&
      Array.isArray(catalog.batches) &&
      Array.isArray(catalog.wagers)
  )
}

const parseDiscoveryCatalog = (raw: string | null): DiscoveryCatalog | null => {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    return isDiscoveryCatalog(parsed) ? parsed : null
  } catch {
    return null
  }
}

const attachStorageListener = () => {
  if (storageListenerAttached || typeof window === 'undefined') return
  storageListenerAttached = true
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    const next = parseDiscoveryCatalog(event.newValue)
    if (!next) return
    cachedCatalog = next
    notify()
  })
}

const hydrateFromStorage = async (): Promise<DiscoveryCatalog> => {
  if (typeof window === 'undefined') return seedDiscoveryCatalog()
  try {
    // Try to fetch from server API first for cross-browser persistence
    try {
      console.log('Attempting to fetch from server API...')
      const res = await fetch('/api/discovery-catalog')
      console.log('Server API response:', res.status, res.ok)
      if (res.ok) {
        const data = await res.text()
        console.log('Server API data length:', data.length)
        const parsed = parseDiscoveryCatalog(data)
        if (parsed) {
          console.log('Successfully loaded from server API')
          // Also save to localStorage as backup
          localStorage.setItem(STORAGE_KEY, data)
          return parsed
        }
      }
    } catch (err) {
      console.error('API failed, falling back to localStorage:', err)
    }

    // Fall back to localStorage
    console.log('Falling back to localStorage')
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const catalog = seedDiscoveryCatalog()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog))
      return catalog
    }
    const parsed = parseDiscoveryCatalog(raw)
    if (!parsed) {
      const catalog = seedDiscoveryCatalog()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog))
      return catalog
    }
    return parsed
  } catch {
    const catalog = seedDiscoveryCatalog()
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog))
    }
    return catalog
  }
}

export const subscribeDiscoveryCatalog = (listener: Listener): (() => void) => {
  attachStorageListener()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const seedDiscoveryCatalog = (): DiscoveryCatalog => ({
  version: 1,
  seedId: CURRENT_DISCOVERY_SEED_ID,
  batches: buildBatches(),
  wagers: buildWagers()
})

export const loadDiscoveryCatalog = (): DiscoveryCatalog => {
  attachStorageListener()
  if (!cachedCatalog) {
    // Start async hydration but return seed data immediately
    hydrateFromStorage().then(catalog => {
      cachedCatalog = catalog
      notify()
    })
    cachedCatalog = seedDiscoveryCatalog()
  }
  return cachedCatalog
}

export const saveDiscoveryCatalog = (catalog: DiscoveryCatalog): void => {
  if (typeof window === 'undefined') return
  const nextCatalog = { ...catalog, seedId: catalog.seedId ?? CURRENT_DISCOVERY_SEED_ID }
  cachedCatalog = nextCatalog
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextCatalog))

  // Also save to server for cross-browser persistence
  console.log('Saving to server API...')
  fetch('/api/discovery-catalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nextCatalog)
  })
    .then(res => {
      console.log('Server save response:', res.status, res.ok)
      if (!res.ok) {
        console.error('Server save failed with status:', res.status)
      }
    })
    .catch(err => console.error('Failed to save to server:', err))

  notify()
}

export const updateDiscoveryCatalog = (
  updater: (prev: DiscoveryCatalog) => DiscoveryCatalog
): DiscoveryCatalog => {
  const next = updater(loadDiscoveryCatalog())
  saveDiscoveryCatalog(next)
  return next
}

const quantizeLiveOdds = (value: number) => Math.round(value * 2) / 2

const getWindowStartValue = (chart: Batch['chart'], now: number, windowMs: number) =>
  chart.find((point) => point.timestamp >= now - windowMs)?.value ?? chart[0]?.value ?? 50

export const advanceBatchMarketTick = (
  marketId: string,
  timestamp: number,
  rng: () => number
): void => {
  const catalog = loadDiscoveryCatalog()
  let changed = false

  const batches = catalog.batches.map((batch) => {
    if (batch.id !== marketId || batch.chart.length === 0) return batch

    const last = batch.chart[batch.chart.length - 1]
    if (timestamp <= last.timestamp) return batch

    const bondedTimestamp = batch.chart[0].timestamp
    const progressToClose =
      batch.resolutionTimestamp > bondedTimestamp
        ? clamp((timestamp - bondedTimestamp) / (batch.resolutionTimestamp - bondedTimestamp), 0, 1)
        : 0
    const closePressure = Math.pow(progressToClose, 1.35)
    const likelyDirection = last.value >= 50 ? 1 : -1
    const shouldPrint = rng() < 0.58 + closePressure * 0.18
    const eventMove = rng() < 0.11 + closePressure * 0.06
      ? likelyDirection * (1.2 + rng() * (3.2 + closePressure * 3.5))
      : 0
    const pullback = rng() < 0.16
      ? -likelyDirection * (0.5 + rng() * 1.7) * (1 - closePressure * 0.35)
      : 0
    const drift = likelyDirection * closePressure * 0.24
    const chop = (rng() - 0.5) * (0.75 - closePressure * 0.24)
    const nextValue = shouldPrint
      ? quantizeLiveOdds(clamp(last.value + eventMove + pullback + drift + chop, 1, 99))
      : last.value
    const chart = [...batch.chart, { value: nextValue, timestamp }]
    const startVal = getWindowStartValue(chart, timestamp, 24 * 60 * 60 * 1000)
    const yesOdds = Math.round(nextValue)
    const volumeBump = Math.round(25 + rng() * 220 + Math.abs(nextValue - last.value) * 160)

    changed = true
    return {
      ...batch,
      chart,
      yesOdds,
      noOdds: 100 - yesOdds,
      priceChange: nextValue - startVal,
      volume: batch.volume + volumeBump,
      volume24h: batch.volume24h + volumeBump
    }
  })

  if (!changed) return
  cachedCatalog = { ...catalog, batches }
  notify()
}

export const addWager = (wager: Wager): DiscoveryCatalog =>
  updateDiscoveryCatalog((catalog) => {
    if (catalog.wagers.some((w) => w.id === wager.id)) return catalog
    return { ...catalog, wagers: [wager, ...catalog.wagers] }
  })

/** Record a quick-buy / liquidity fill against a wager's open-bet pool. */
export const applyWagerLiquidityBuy = (
  wagerId: string,
  yesPriceCents: number,
  usdAmount: number,
  side: 'YES' | 'NO' = 'YES'
): void => {
  updateDiscoveryCatalog((catalog) => ({
    ...catalog,
    wagers: catalog.wagers.map((w) => {
      if (w.id !== wagerId) return w
      const yesOdds = Math.round(yesPriceCents)
      let openBets: OpenBet[] = [...w.openBets]
      const hit = openBets.find((b) => b.yesOdds === yesOdds)
      if (hit) {
        openBets = openBets.map((b) =>
          b.yesOdds === yesOdds ? { ...b, volume: Math.round(b.volume + usdAmount) } : b
        )
      } else {
        openBets = [...openBets, { yesOdds, volume: Math.round(usdAmount) }].sort(
          (a, b) => a.yesOdds - b.yesOdds
        )
      }
      const pool = openBets.reduce((s, b) => s + b.volume, 0)
      const fill: WagerFill = {
        id: `fill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        handle: CURRENT_USER_HANDLE,
        avatar: '/Stems/BetskiPEFFPEE.png',
        side,
        yesOdds,
        usdAmount: Math.round(usdAmount),
        timestamp: Date.now()
      }
      return {
        ...w,
        openBets,
        pool,
        fills: [fill, ...(w.fills ?? [])]
      }
    })
  }))
}

export const resetDiscoveryCatalog = (): DiscoveryCatalog => {
  thumbResolveCache.clear()
  failedRepairs.clear()
  hydrationPromise = null
  const catalog = seedDiscoveryCatalog()
  saveDiscoveryCatalog(catalog)
  return catalog
}

const thumbResolveCache = new Map<string, string>()

async function resolveThumbForSource(sourceUrl: string): Promise<string | null> {
  const cached = thumbResolveCache.get(sourceUrl)
  if (cached) return cached
  try {
    const resolved = await resolveContentLink(sourceUrl)
    if (resolved.thumbnailUrl) {
      thumbResolveCache.set(sourceUrl, resolved.thumbnailUrl)
      return resolved.thumbnailUrl
    }
  } catch {
    // keep stored thumbnail
  }
  return null
}

function normalizePreview(preview: BatchPreviewItem): { preview: BatchPreviewItem; needsResolve: boolean } {
  if (
    preview.thumbnailUrl &&
    needsThumbnailProxy(preview.thumbnailUrl) &&
    !preview.thumbnailUrl.startsWith('/api/')
  ) {
    return {
      preview: { ...preview, thumbnailUrl: proxiedThumbnailUrl(preview.thumbnailUrl) },
      needsResolve: false
    }
  }

  const sourceUrl = preview.sourceUrl?.trim()
  return {
    preview,
    needsResolve: Boolean(sourceUrl && isPlaceholderThumbnail(preview.thumbnailUrl))
  }
}

async function repairStaleCachedPreview(preview: BatchPreviewItem): Promise<BatchPreviewItem | null> {
  const thumb = preview.thumbnailUrl
  const sourceUrl = preview.sourceUrl?.trim()
  const needsVerify =
    thumb.startsWith('/cache/thumbnails/') || thumb.startsWith('/api/thumbnail-proxy')

  if (needsVerify) {
    try {
      const res = await fetch(thumb, { method: 'HEAD', signal: AbortSignal.timeout(8000) })
      const type = res.headers.get('content-type') ?? ''
      if (res.ok && type.startsWith('image/')) return null
    } catch {
      // stale or unreachable — repair below
    }

    if (sourceUrl) {
      const resolved = await resolveThumbForSource(sourceUrl)
      if (resolved && !isPlaceholderThumbnail(resolved)) {
        return { ...preview, thumbnailUrl: resolved }
      }
    }

    return { ...preview, thumbnailUrl: PLACEHOLDER_THUMB }
  }

  return null
}

async function hydratePreviews(
  previews: BatchPreviewItem[]
): Promise<{ previews: BatchPreviewItem[]; changed: boolean }> {
  let changed = false
  const next = await Promise.all(
    previews.map(async (preview) => {
      const repaired = await repairStaleCachedPreview(preview)
      if (repaired) {
        changed = true
        preview = repaired
      }

      const { preview: normalized, needsResolve } = normalizePreview(preview)
      if (normalized.thumbnailUrl !== preview.thumbnailUrl) changed = true

      if (!needsResolve) return normalized

      const sourceUrl = normalized.sourceUrl?.trim()
      if (!sourceUrl) return normalized

      const thumb = await resolveThumbForSource(sourceUrl)
      if (!thumb || thumb === normalized.thumbnailUrl) return normalized

      changed = true
      return { ...normalized, thumbnailUrl: thumb }
    })
  )
  return { previews: next, changed }
}

async function hydrateCatalogThumbnails(catalog: DiscoveryCatalog): Promise<DiscoveryCatalog | null> {
  let changed = false

  const batches = await Promise.all(
    catalog.batches.map(async (batch) => {
      const result = await hydratePreviews(batch.previews)
      if (result.changed) changed = true
      return result.changed ? { ...batch, previews: result.previews } : batch
    })
  )

  const wagers = await Promise.all(
    catalog.wagers.map(async (wager) => {
      const result = await hydratePreviews(wager.previews)
      if (result.changed) changed = true
      return result.changed ? { ...wager, previews: result.previews } : wager
    })
  )

  if (!changed) return null
  return { ...catalog, batches, wagers }
}

let hydrationPromise: Promise<void> | null = null
const failedRepairs = new Set<string>()

function catalogHasMissingThumbs(catalog: DiscoveryCatalog): boolean {
  const check = (previews: BatchPreviewItem[]) =>
    previews.some((p) => {
      if (!p.sourceUrl?.trim()) return false
      if (isPlaceholderThumbnail(p.thumbnailUrl)) return true
      if (p.thumbnailUrl.startsWith('/cache/thumbnails/')) return true
      if (p.thumbnailUrl.startsWith('/api/thumbnail-proxy')) return true
      return false
    })
  return catalog.batches.some((b) => check(b.previews)) || catalog.wagers.some((w) => check(w.previews))
}

/** Resolve missing preview thumbnails once and persist — avoids refetch on every tab visit. */
export const ensureDiscoveryThumbnails = (): Promise<void> => {
  if (typeof window === 'undefined') return Promise.resolve()
  if (hydrationPromise) return hydrationPromise

  hydrationPromise = (async () => {
    try {
      const catalog = loadDiscoveryCatalog()
      if (!catalogHasMissingThumbs(catalog)) return
      const updated = await hydrateCatalogThumbnails(catalog)
      if (updated) saveDiscoveryCatalog(updated)
    } finally {
      hydrationPromise = null
    }
  })()

  return hydrationPromise
}

/** Re-fetch a single preview thumb after a load failure and persist it. */
export const repairPreviewThumbnail = async (previewId: string, sourceUrl: string): Promise<void> => {
  const url = sourceUrl.trim()
  if (!url || failedRepairs.has(previewId)) return

  thumbResolveCache.delete(url)
  const thumb = await resolveThumbForSource(url)
  if (!thumb || isPlaceholderThumbnail(thumb)) {
    failedRepairs.add(previewId)
    return
  }

  updateDiscoveryCatalog((catalog) => {
    let changed = false
    const patchPreviews = (previews: BatchPreviewItem[]) =>
      previews.map((preview) => {
        if (preview.id !== previewId) return preview
        changed = true
        return { ...preview, sourceUrl: url, thumbnailUrl: thumb }
      })

    if (!changed) return catalog
    return {
      ...catalog,
      batches: catalog.batches.map((batch) => ({ ...batch, previews: patchPreviews(batch.previews) })),
      wagers: catalog.wagers.map((wager) => ({ ...wager, previews: patchPreviews(wager.previews) }))
    }
  })
}
