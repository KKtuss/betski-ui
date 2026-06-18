export interface Message {
  id: string
  chatId: string
  author: 'me' | 'other'
  authorLabel?: string
  type: 'text' | 'market' | 'trade'
  text?: string
  market?: {
    videoId: number
    title: string
    yesOdds: number
    chart: { value: number; timestamp: number }[]
    timeLeftLabel: string
    thumbnailVideoUrl?: string
    thumbnailFallbackSrc?: string
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

export const getMockMessages = (): Message[] => {
  return [
    { id: 'm1', chatId: 'group-1', author: 'other', authorLabel: 'BenBetski', type: 'text', text: "what's up chat", timestamp: Date.now() - 1000 * 60 * 120 },
    { id: 'm2', chatId: 'group-1', author: 'other', authorLabel: 'MarkDiTob', type: 'text', text: 'what we buying ?', timestamp: Date.now() - 1000 * 60 * 118 },
    { id: 'm3', chatId: 'dm-1', author: 'other', type: 'text', text: 'got fills?', timestamp: Date.now() - 1000 * 60 * 55 },
    { id: 'm4', chatId: 'dm-1', author: 'me', type: 'text', text: 'Yep, partial. Will add on dip.', timestamp: Date.now() - 1000 * 60 * 52 },
    { id: 'b1', chatId: 'dm-3', author: 'me', type: 'text', text: 'Betski.', timestamp: Date.now() - 1000 * 60 * 30 },
    { id: 'b2', chatId: 'dm-3', author: 'other', type: 'text', text: 'Betski ?', timestamp: Date.now() - 1000 * 60 * 29 },
    { id: 'b3', chatId: 'dm-3', author: 'me', type: 'text', text: 'Betski !', timestamp: Date.now() - 1000 * 60 * 28 },
    { id: 'b4', chatId: 'dm-3', author: 'other', type: 'text', text: 'Betski.', timestamp: Date.now() - 1000 * 60 * 25 },
    { id: 'b5', chatId: 'dm-3', author: 'me', type: 'text', text: 'Betski...', timestamp: Date.now() - 1000 * 60 * 20 },
    { id: 'b6', chatId: 'dm-3', author: 'other', type: 'text', text: 'Betski !', timestamp: Date.now() - 1000 * 60 * 5 }
  ]
}
