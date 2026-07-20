/** Canonical user registry — single source for handles, avatars, and social metadata. */
export type ProfileSeed = {
  handle: string
  displayName: string
  avatar: string
  followers: number
  following: number
  markets: number
  bio?: string
}

export const PROFILE_SEEDS: ProfileSeed[] = [
  { handle: 'BenBetski', displayName: 'BenBetski', avatar: '/Stems/BetskiPEFFPEE.png', followers: 8420, following: 142, markets: 23 },
  { handle: 'moggorrr', displayName: 'moggorrr', avatar: '/Stems/moggorrr transparent.png', followers: 12400, following: 89, markets: 31 },
  { handle: 'epstein', displayName: 'epstein', avatar: '/Stems/epstein transparent.png', followers: 3200, following: 210, markets: 12 },
  { handle: 'MarkDiTob', displayName: 'MarkDiTob', avatar: '/Stems/moggorrr transparent.png', followers: 5600, following: 178, markets: 19 },
  { handle: 'DeskWhale', displayName: 'DeskWhale', avatar: '/Stems/BetskiPEFFPEE.png', followers: 18900, following: 44, markets: 47 },
  { handle: 'ClipQueen', displayName: 'ClipQueen', avatar: '/Stems/benbetski transparent.png', followers: 9100, following: 312, markets: 28 },
  { handle: 'CryptoKiwi', displayName: 'CryptoKiwi', avatar: '/Stems/epstein transparent.png', followers: 4100, following: 156, markets: 14 },
  { handle: 'NovaTape', displayName: 'NovaTape', avatar: '/Stems/BetskiPEFFPEE.png', followers: 7200, following: 201, markets: 22 },
  { handle: 'ViralVince', displayName: 'ViralVince', avatar: '/Stems/moggorrr transparent.png', followers: 15300, following: 67, markets: 38 },
  { handle: 'ChartChad', displayName: 'ChartChad', avatar: '/Stems/BetskiPEFFPEE.png', followers: 6800, following: 124, markets: 17 },
  { handle: 'LootLord', displayName: 'LootLord', avatar: '/Stems/epstein.png', followers: 11200, following: 93, markets: 26 }
]

export const PROFILE_BY_HANDLE = Object.fromEntries(PROFILE_SEEDS.map((p) => [p.handle, p])) as Record<
  string,
  ProfileSeed
>

export const PROFILE_AVATARS: Record<string, string> = Object.fromEntries(
  PROFILE_SEEDS.map((p) => [p.handle, p.avatar])
)

PROFILE_AVATARS.You = '/Stems/BetskiPEFFPEE.png'

export const TREND_MARKETS = [
  'Triple T going 10x virality before EOM ?',
  'Dah Bih Gahh going 2x in virality in 3 days ?',
  "D4vd's story having a 3x regain in virality over 2 weeks ?",
  'Daffy Duck Money Edits going 5x virality in 2 months ?',
  'Hullo - 25 Dollar Max going 2x virality before EOW ?',
  'Drooling cat going 10x virality before EOM ?'
]
