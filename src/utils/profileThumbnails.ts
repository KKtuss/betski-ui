import type { SyntheticEvent } from 'react'

export const PROFILE_MARKET_THUMB_FALLBACK = '/Stems/BetskiPEFFPEE.png'

/** Same Picsum phone format as DiscoveryPanel (`360/640?random=`) — stable image per key */
export const discoveryStyleThumbnailUrl = (key: string) => {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) >>> 0
  return `https://picsum.photos/360/640?random=${1000 + (h % 2_000_000)}`
}

export const onProfileMarketThumbError = (e: SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget
  img.onerror = null
  img.src = PROFILE_MARKET_THUMB_FALLBACK
}
