export interface Message {
  id: string
  chatId: string
  author: 'me' | 'other'
  authorLabel?: string
  type: 'text' | 'market' | 'trade'
  text?: string
  market?: {
    marketId?: string
    videoId: number
    title: string
    yesOdds: number
    chart: { value: number; timestamp: number }[]
    timeLeftLabel: string
    thumbnailVideoUrl?: string
    thumbnailFallbackSrc?: string
    volume24h?: number
    holders?: number
    winRate?: number
    priceChange?: number
  }
  trade?: {
    title: string
    side: 'YES' | 'NO'
    entry: number
    exit: number
    pnlUsd: number
    pnlPct: number
    chart: { value: number; timestamp: number }[]
    thumbnailSrc?: string
    thumbnailFallbackSrc?: string
  }
  timestamp: number
}

export const SOCIAL_AUTHOR_AVATARS: Record<string, string> = {
  MarkDiTob: '/Stems/moggorrr transparent.png',
  BenBetski: '/Stems/BetskiPEFFPEE.png',
  CryptoKiwi: '/Stems/epstein transparent.png',
  You: '/Stems/betskuu.png'
}

export const getMockMessages = (): Message[] => {
  const now = Date.now()
  return [
    {
      id: 'g1',
      chatId: 'group-1',
      author: 'other',
      authorLabel: 'MarkDiTob',
      type: 'text',
      text: 'Anyone else thinking D4vd hits 3x on this?',
      timestamp: now - 1000 * 60 * 38
    },
    {
      id: 'g2',
      chatId: 'group-1',
      author: 'other',
      authorLabel: 'MarkDiTob',
      type: 'market',
      market: {
        marketId: 'batch-3',
        videoId: 1,
        title: "D4vd's story having a 3x regen in virality over 2 weeks?",
        yesOdds: 0,
        chart: [],
        timeLeftLabel: '—'
      },
      timestamp: now - 1000 * 60 * 36
    },
    {
      id: 'g3',
      chatId: 'group-1',
      author: 'other',
      authorLabel: 'BenBetski',
      type: 'text',
      text: 'Chart looks good tbf',
      timestamp: now - 1000 * 60 * 22
    },
    {
      id: 'g4',
      chatId: 'group-1',
      author: 'other',
      authorLabel: 'BenBetski',
      type: 'text',
      text: "I'm in on YES",
      timestamp: now - 1000 * 60 * 20
    },
    {
      id: 'g5',
      chatId: 'group-1',
      author: 'other',
      authorLabel: 'CryptoKiwi',
      type: 'text',
      text: 'same',
      timestamp: now - 1000 * 60 * 18
    },
    {
      id: 'g6',
      chatId: 'group-1',
      author: 'me',
      authorLabel: 'You',
      type: 'text',
      text: 'lets go lets go lets go',
      timestamp: now - 1000 * 60 * 16
    },
    { id: 'm3', chatId: 'dm-1', author: 'other', type: 'text', text: 'got fills?', timestamp: now - 1000 * 60 * 55 },
    { id: 'm4', chatId: 'dm-1', author: 'me', type: 'text', text: 'Yep, partial. Will add on dip.', timestamp: now - 1000 * 60 * 52 },
    { id: 'b1', chatId: 'dm-3', author: 'me', type: 'text', text: 'Betski.', timestamp: now - 1000 * 60 * 30 },
    { id: 'b2', chatId: 'dm-3', author: 'other', type: 'text', text: 'Betski ?', timestamp: now - 1000 * 60 * 29 },
    { id: 'b3', chatId: 'dm-3', author: 'me', type: 'text', text: 'Betski !', timestamp: now - 1000 * 60 * 28 },
    { id: 'b4', chatId: 'dm-3', author: 'other', type: 'text', text: 'Betski.', timestamp: now - 1000 * 60 * 25 },
    { id: 'b5', chatId: 'dm-3', author: 'me', type: 'text', text: 'Betski...', timestamp: now - 1000 * 60 * 20 },
    { id: 'b6', chatId: 'dm-3', author: 'other', type: 'text', text: 'Betski !', timestamp: now - 1000 * 60 * 5 }
  ]
}
