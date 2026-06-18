export type ProfileTimeWindow = '1d' | '7d' | '30d' | 'max'

/** Distinct card titles (real PnL / chart still come from top trades) */
export const HIGHLIGHT_CARD_TITLES = [
  'NPC Stream (Ice Cream) comeback?',
  'Taylor Swift Eras Tour clips flood?',
  'Skibidi Toilet still #1?'
] as const

export const PROFILE_TIME_WINDOWS: { id: ProfileTimeWindow; label: string }[] = [
  { id: '1d', label: '1D' },
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: 'max', label: 'MAX' }
]
