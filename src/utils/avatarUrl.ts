import type { SyntheticEvent } from 'react'
import { PROFILE_AVATARS, PROFILE_BY_HANDLE } from '../data/profileRegistry'

export const DEFAULT_AVATAR = '/Stems/BetskiPEFFPEE.png'

/** Map retired placeholder paths and empty values to a valid avatar URL. */
export function normalizeAvatarUrl(url?: string | null): string {
  const trimmed = url?.trim()
  if (!trimmed || trimmed.includes('betskuu.png')) return DEFAULT_AVATAR
  return trimmed
}

/** Prefer canonical registry avatar for known handles, with legacy URL cleanup. */
export function resolveProfileAvatar(handle: string, url?: string | null): string {
  const registryAvatar = PROFILE_BY_HANDLE[handle]?.avatar ?? PROFILE_AVATARS[handle]
  return normalizeAvatarUrl(registryAvatar ?? url)
}

export const onAvatarError = (e: SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget
  if (img.src.includes('BetskiPEFFPEE.png')) return
  img.onerror = null
  img.src = DEFAULT_AVATAR
}
