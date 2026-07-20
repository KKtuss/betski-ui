import { proxiedThumbnailUrl } from './thumbnailProxy'

export type ContentPlatform = 'tiktok' | 'instagram' | 'youtube' | 'other'

export type ResolvedContentLink = {
  url: string
  platform: ContentPlatform
  thumbnailUrl: string
  videoUrl?: string
  embedUrl?: string
  title?: string
  views?: number
  likes?: number
  shares?: number
  comments?: number
  authorName?: string
  authorHandle?: string
  authorAvatarUrl?: string
}

const FALLBACK_THUMB = (seed: number) =>
  `https://picsum.photos/360/640?random=${1000 + (Math.abs(seed) % 900000)}`

export function detectContentPlatform(url: string): ContentPlatform {
  const u = url.toLowerCase()
  if (u.includes('tiktok') || u.includes('vm.tiktok')) return 'tiktok'
  if (u.includes('instagram') || u.includes('/reel/')) return 'instagram'
  if (u.includes('youtube') || u.includes('youtu.be') || u.includes('/shorts/')) return 'youtube'
  return 'other'
}

/** Extract TikTok video id from canonical or share URLs. */
export function extractTikTokVideoId(url: string): string | null {
  const videoMatch = url.match(/\/video\/(\d+)/)
  if (videoMatch) return videoMatch[1]
  const vMatch = url.match(/\/v\/(\d+)/)
  if (vMatch) return vMatch[1]
  try {
    const parsed = new URL(url)
    const fromQuery = parsed.searchParams.get('share_item_id') ?? parsed.searchParams.get('video_id')
    if (fromQuery && /^\d+$/.test(fromQuery)) return fromQuery
  } catch {
    // ignore
  }
  return null
}

export function getTikTokEmbedUrl(
  videoId: string,
  options?: { muted?: boolean; autoplay?: boolean }
): string {
  const muted = options?.muted === true
  // Must stay on by default: iframe has pointer-events:none (for swipes), so a
  // paused player with autoplay=0 can't be started by tap — only by postMessage,
  // which mobile browsers often block without a prior autoplay grant.
  const autoplay = options?.autoplay === false ? '0' : '1'
  const params = new URLSearchParams({
    autoplay,
    loop: '1',
    muted: muted ? '1' : '0',
    music_info: '0',
    description: '0',
    controls: '0',
    progress_bar: '0',
    play_button: '0',
    // Keep TikTok chrome off — Betski owns mute; volume_control=1 was flashing
    // their volume/settings cluster on mute postMessages.
    volume_control: '0',
    fullscreen_button: '0',
    timestamp: '0',
    rel: '0',
    closed_caption: '0',
    native_context_menu: '0'
  })
  return `https://www.tiktok.com/player/v1/${videoId}?${params.toString()}`
}

export function getYoutubeEmbedUrl(
  videoId: string,
  options?: { muted?: boolean; autoplay?: boolean }
): string {
  const muted = options?.muted === true ? '1' : '0'
  const autoplay = options?.autoplay === false ? '0' : '1'
  const params = new URLSearchParams({
    autoplay,
    mute: muted,
    loop: '1',
    playlist: videoId,
    controls: '0',
    playsinline: '1',
    enablejsapi: '1',
    modestbranding: '1',
    rel: '0'
  })
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
}

/** Extract a YouTube video id from common URL shapes (watch, Shorts, youtu.be, embed). */
export function extractYoutubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0]
      return id || null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (parsed.pathname.startsWith('/watch')) {
        return parsed.searchParams.get('v')
      }
      const parts = parsed.pathname.split('/').filter(Boolean)
      const shortsIdx = parts.indexOf('shorts')
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1]
      const embedIdx = parts.indexOf('embed')
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1]
    }
  } catch {
    // fall through
  }
  return null
}

export function getYoutubeThumbnailUrl(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

type LinkPreviewPayload = {
  thumbnailUrl?: string
  title?: string | null
  views?: number | null
  likes?: number | null
  shares?: number | null
  comments?: number | null
  videoUrl?: string | null
  embedUrl?: string | null
  authorName?: string | null
  authorHandle?: string | null
  authorAvatarUrl?: string | null
  error?: string
}

/** Dev/preview server — resolves thumbnail, stats, and proxies hotlink-blocked images. */
async function fetchLinkPreview(url: string): Promise<LinkPreviewPayload | null> {
  try {
    const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(12000)
    })
    if (!res.ok) return null
    return (await res.json()) as LinkPreviewPayload
  } catch {
    return null
  }
}

function toResolved(url: string, platform: ContentPlatform, data: LinkPreviewPayload): ResolvedContentLink {
  const seed = url.split('').reduce((h, c) => h + c.charCodeAt(0), 0)
  return {
    url,
    platform,
    thumbnailUrl: proxiedThumbnailUrl(data.thumbnailUrl ?? FALLBACK_THUMB(seed)),
    videoUrl: data.videoUrl ?? undefined,
    embedUrl: data.embedUrl ?? undefined,
    title: data.title ?? undefined,
    views: data.views ?? undefined,
    likes: data.likes ?? undefined,
    shares: data.shares ?? undefined,
    comments: data.comments ?? undefined,
    authorName: data.authorName ?? undefined,
    authorHandle: data.authorHandle ?? undefined,
    authorAvatarUrl: data.authorAvatarUrl
      ? proxiedThumbnailUrl(data.authorAvatarUrl)
      : undefined
  }
}

/** Instant client-side embed URL when the platform id is already in the source link. */
export function getInstantEmbedUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  const platform = detectContentPlatform(url)
  if (platform === 'tiktok') {
    const id = extractTikTokVideoId(url)
    return id ? getTikTokEmbedUrl(id) : undefined
  }
  if (platform === 'youtube') {
    const id = extractYoutubeVideoId(url)
    return id ? getYoutubeEmbedUrl(id) : undefined
  }
  return undefined
}

const resolveResultCache = new Map<string, ResolvedContentLink>()
const resolveInflight = new Map<string, Promise<ResolvedContentLink>>()

async function resolveContentLinkUncached(url: string): Promise<ResolvedContentLink> {
  const platform = detectContentPlatform(url)
  const preview = await fetchLinkPreview(url)

  if (preview?.thumbnailUrl || preview?.embedUrl || preview?.videoUrl) {
    return toResolved(url, platform, {
      thumbnailUrl: preview.thumbnailUrl
        ? proxiedThumbnailUrl(preview.thumbnailUrl)
        : proxiedThumbnailUrl(FALLBACK_THUMB(url.split('').reduce((h, c) => h + c.charCodeAt(0), 0))),
      ...preview
    })
  }

  // TikTok blocks server-side scraping — embed iframe still works in the browser.
  if (platform === 'tiktok') {
    const videoId = extractTikTokVideoId(url)
    if (videoId) {
      return {
        url,
        platform,
        thumbnailUrl: FALLBACK_THUMB(url.split('').reduce((h, c) => h + c.charCodeAt(0), 0)),
        embedUrl: getTikTokEmbedUrl(videoId)
      }
    }
  }

  // Offline fallback: YouTube thumbs work without the API; stats stay undefined.
  if (platform === 'youtube') {
    const videoId = extractYoutubeVideoId(url)
    if (videoId) {
      return {
        url,
        platform,
        thumbnailUrl: getYoutubeThumbnailUrl(videoId),
        embedUrl: getYoutubeEmbedUrl(videoId)
      }
    }
  }

  return {
    url,
    platform,
    thumbnailUrl: FALLBACK_THUMB(url.split('').reduce((h, c) => h + c.charCodeAt(0), 0))
  }
}

/**
 * Resolve a social video URL to thumbnail + engagement stats.
 * All resolution goes through /api/link-preview (dev/preview server).
 * Results are memoized and concurrent calls for the same URL share one request.
 */
export async function resolveContentLink(url: string): Promise<ResolvedContentLink> {
  const cached = resolveResultCache.get(url)
  if (cached) return cached

  const inflight = resolveInflight.get(url)
  if (inflight) return inflight

  const pending = resolveContentLinkUncached(url)
    .then((result) => {
      resolveResultCache.set(url, result)
      return result
    })
    .finally(() => {
      resolveInflight.delete(url)
    })

  resolveInflight.set(url, pending)
  return pending
}
