export const PLACEHOLDER_THUMB = '/Stems/BetskiPEFFPEE.png'

const PROXY_HOST_PATTERNS = [
  'tiktokcdn',
  'tiktokv.com',
  'ttlivecdn',
  'muscdn',
  'byteoversea',
  'ibyteimg',
  'cdninstagram',
  'fbcdn.net',
  'instagram.com',
  'googleusercontent.com'
]

export function extractUpstreamThumbnailUrl(url: string): string {
  if (!url.startsWith('/api/thumbnail-proxy')) return url
  try {
    const parsed = new URL(url, 'http://localhost')
    const upstream = parsed.searchParams.get('url')
    if (upstream) return upstream
  } catch {
    // fall through
  }
  return url
}

export function needsThumbnailProxy(url: string): boolean {
  if (!url) return false
  if (url.startsWith('/cache/thumbnails/')) return false
  if (url.startsWith('/') || url.startsWith('data:')) return false
  if (url.startsWith('/api/thumbnail-proxy')) return true

  try {
    const host = new URL(url).hostname.toLowerCase()
    return PROXY_HOST_PATTERNS.some((pattern) => host.includes(pattern))
  } catch {
    return false
  }
}

export function proxiedThumbnailUrl(url: string): string {
  if (!url) return PLACEHOLDER_THUMB
  if (url.startsWith('/cache/thumbnails/')) return url
  if (url.startsWith('data:')) return url
  if (url.startsWith('/api/thumbnail-proxy')) return url
  if (url.startsWith('/') && !url.startsWith('/api/')) return url
  if (needsThumbnailProxy(url)) {
    return `/api/thumbnail-proxy?url=${encodeURIComponent(url)}`
  }
  return url
}

export function isPlaceholderThumbnail(url: string | undefined): boolean {
  if (!url) return true
  if (url === PLACEHOLDER_THUMB) return true
  if (url.includes('betskuu.png')) return true
  if (url.includes('picsum.photos')) return true
  return false
}

export function isCachedThumbnailUrl(url: string | undefined): boolean {
  return Boolean(url?.startsWith('/cache/thumbnails/'))
}

export function getDisplayThumbnailUrl(url: string): string {
  if (!url) return PLACEHOLDER_THUMB
  if (url.startsWith('/cache/thumbnails/')) return url
  return proxiedThumbnailUrl(url)
}
