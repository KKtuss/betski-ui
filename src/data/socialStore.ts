import type { Message } from './socialMock'
import { PROFILE_AVATARS } from './profileRegistry'
import { emitMessageNotification } from '../utils/notificationEmitter'

export type SocialChatKind = 'dm' | 'group' | 'system'

export type SocialChat = {
  id: string
  kind: SocialChatKind
  title: string
  subtitle: string
  unreadCount: number
  avatar?: string
  members?: string[]
  verified?: boolean
  online?: boolean
  systemIcon?: 'news' | 'alerts'
  hasMention?: boolean
}

export type SocialState = {
  version: 1
  chats: SocialChat[]
  messages: Message[]
}

const STORAGE_KEY = 'betski-social-state-v1'

type Listener = () => void
const listeners = new Set<Listener>()
const notify = () => listeners.forEach((fn) => fn())

let cachedState: SocialState | null = null

const seedMessages = (): Message[] => {
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
      authorLabel: 'ViralVince',
      type: 'text',
      text: 'Chart looks good tbf',
      timestamp: now - 1000 * 60 * 22
    },
    {
      id: 'g4',
      chatId: 'group-1',
      author: 'other',
      authorLabel: 'NovaTape',
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
    { id: 'm3', chatId: 'dm-1', author: 'other', authorLabel: 'MarkDiTob', type: 'text', text: 'got fills?', timestamp: now - 1000 * 60 * 55 },
    { id: 'm4', chatId: 'dm-1', author: 'me', type: 'text', text: 'Yep, partial. Will add on dip.', timestamp: now - 1000 * 60 * 52 },
    { id: 'm5', chatId: 'dm-2', author: 'other', authorLabel: 'DeskWhale', type: 'text', text: 'Watching batch-1 resolution closely', timestamp: now - 1000 * 60 * 44 },
    { id: 'm6', chatId: 'dm-2', author: 'me', type: 'text', text: 'Same — sized small YES', timestamp: now - 1000 * 60 * 41 },
    { id: 'b1', chatId: 'dm-3', author: 'me', type: 'text', text: 'Betski.', timestamp: now - 1000 * 60 * 30 },
    { id: 'b2', chatId: 'dm-3', author: 'other', authorLabel: 'ClipQueen', type: 'text', text: 'Betski ?', timestamp: now - 1000 * 60 * 29 },
    { id: 'b3', chatId: 'dm-3', author: 'me', type: 'text', text: 'Betski !', timestamp: now - 1000 * 60 * 28 },
    { id: 'b4', chatId: 'dm-3', author: 'other', authorLabel: 'ChartChad', type: 'text', text: 'Betski.', timestamp: now - 1000 * 60 * 25 },
    { id: 'b5', chatId: 'dm-3', author: 'me', type: 'text', text: 'Betski...', timestamp: now - 1000 * 60 * 20 },
    { id: 'b6', chatId: 'dm-3', author: 'other', authorLabel: 'LootLord', type: 'text', text: 'Betski !', timestamp: now - 1000 * 60 * 5 },
    {
      id: 'g7',
      chatId: 'group-2',
      author: 'other',
      authorLabel: 'ViralVince',
      type: 'text',
      text: 'New batch just dropped — who is sizing?',
      timestamp: now - 1000 * 60 * 12
    },
    {
      id: 'g8',
      chatId: 'group-2',
      author: 'other',
      authorLabel: 'NovaTape',
      type: 'text',
      text: 'Already long YES on Triple T',
      timestamp: now - 1000 * 60 * 10
    }
  ]
}

const seedChats = (): SocialChat[] => [
  {
    id: 'group-1',
    kind: 'group',
    title: 'Betskiing',
    subtitle: 'lets go lets go lets go',
    unreadCount: 2,
    verified: true,
    online: true,
    members: [PROFILE_AVATARS.BenBetski, PROFILE_AVATARS.moggorrr, PROFILE_AVATARS.epstein, PROFILE_AVATARS.ViralVince]
  },
  {
    id: 'dm-1',
    kind: 'dm',
    title: 'MarkDiTob',
    subtitle: 'got fills?',
    unreadCount: 0,
    online: true,
    avatar: PROFILE_AVATARS.MarkDiTob
  },
  {
    id: 'dm-2',
    kind: 'dm',
    title: 'DeskWhale',
    subtitle: 'Watching batch-1 resolution closely',
    unreadCount: 0,
    online: false,
    avatar: PROFILE_AVATARS.DeskWhale
  },
  {
    id: 'dm-3',
    kind: 'dm',
    title: 'Alpha crew',
    subtitle: 'Betski !',
    unreadCount: 1,
    avatar: PROFILE_AVATARS.ClipQueen
  },
  {
    id: 'dm-4',
    kind: 'dm',
    title: 'CryptoKiwi',
    subtitle: 'same',
    unreadCount: 0,
    avatar: PROFILE_AVATARS.CryptoKiwi
  },
  {
    id: 'group-2',
    kind: 'group',
    title: 'Alpha Chat',
    subtitle: 'New batch just dropped',
    unreadCount: 0,
    members: [PROFILE_AVATARS.BenBetski, PROFILE_AVATARS.ViralVince, PROFILE_AVATARS.NovaTape]
  },
  {
    id: 'sys-1',
    kind: 'system',
    title: 'News Flow',
    subtitle: 'D4vd batch trending +18%',
    unreadCount: 0,
    systemIcon: 'news'
  },
  {
    id: 'sys-2',
    kind: 'system',
    title: 'Watchlist Alerts',
    subtitle: '2 markets near resolution',
    unreadCount: 1,
    systemIcon: 'alerts'
  }
]

export const seedSocialState = (): SocialState => ({
  version: 1,
  chats: seedChats(),
  messages: seedMessages()
})

const hydrateFromStorage = (): SocialState => {
  if (typeof window === 'undefined') return seedSocialState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const state = seedSocialState()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      return state
    }
    const parsed = JSON.parse(raw) as SocialState
    if (parsed?.version !== 1) return seedSocialState()
    const seeded = seedSocialState()
    const chatIds = new Set(parsed.chats?.map((c) => c.id) ?? [])
    const mergedChats = [
      ...(parsed.chats ?? []),
      ...seeded.chats.filter((c) => !chatIds.has(c.id))
    ]
    const messageIds = new Set(parsed.messages?.map((m) => m.id) ?? [])
    const mergedMessages = [
      ...(parsed.messages ?? []),
      ...seeded.messages.filter((m) => !messageIds.has(m.id))
    ]
    return { version: 1, chats: mergedChats, messages: mergedMessages }
  } catch {
    return seedSocialState()
  }
}

export const subscribeSocialState = (listener: Listener): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const loadSocialState = (): SocialState => {
  if (!cachedState) cachedState = hydrateFromStorage()
  return cachedState
}

export const saveSocialState = (state: SocialState): void => {
  if (typeof window === 'undefined') return
  cachedState = state
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  notify()
}

export const updateSocialState = (updater: (prev: SocialState) => SocialState): SocialState => {
  const next = updater(loadSocialState())
  saveSocialState(next)
  return next
}

export const getChatById = (chatId: string): SocialChat | undefined =>
  loadSocialState().chats.find((c) => c.id === chatId)

export const getMessagesForChat = (chatId: string): Message[] =>
  loadSocialState()
    .messages.filter((m) => m.chatId === chatId)
    .sort((a, b) => a.timestamp - b.timestamp)

export const appendMessage = (message: Message): void => {
  updateSocialState((s) => {
    const chats = s.chats.map((c) =>
      c.id === message.chatId
        ? { ...c, subtitle: messagePreview(message), unreadCount: message.author === 'me' ? 0 : c.unreadCount }
        : c
    )
    return { ...s, chats, messages: [...s.messages, message] }
  })
}

export const markChatRead = (chatId: string): void => {
  updateSocialState((s) => ({
    ...s,
    chats: s.chats.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c))
  }))
}

export const addDmChat = (handle: string): string => {
  const trimmed = handle.trim().replace(/^@/, '')
  const title = `@${trimmed}`
  const existing = loadSocialState().chats.find((c) => c.kind === 'dm' && c.title === title)
  if (existing) return existing.id

  const chatId = `dm-${Date.now()}`
  const avatar = PROFILE_AVATARS[trimmed] ?? '/Stems/betskuu.png'
  updateSocialState((s) => ({
    ...s,
    chats: [
      {
        id: chatId,
        kind: 'dm',
        title,
        subtitle: 'Say hi 👋',
        unreadCount: 0,
        avatar
      },
      ...s.chats
    ]
  }))
  return chatId
}

const messagePreview = (message: Message): string => {
  if (message.type === 'text') return message.text ?? ''
  if (message.type === 'market') return `Shared: ${message.market?.title ?? 'market'}`
  if (message.type === 'trade') return `Trade: ${message.trade?.title ?? 'position'}`
  return 'New message'
}

/** Simulate an inbound message from a tracked profile (for demo reactivity). */
export const simulateInboundMessage = (params: {
  chatId: string
  senderHandle: string
  text: string
}): void => {
  const message: Message = {
    id: `in-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    chatId: params.chatId,
    author: 'other',
    authorLabel: params.senderHandle,
    type: 'text',
    text: params.text,
    timestamp: Date.now()
  }
  updateSocialState((s) => ({
    ...s,
    messages: [...s.messages, message],
    chats: s.chats.map((c) =>
      c.id === params.chatId
        ? { ...c, subtitle: params.text, unreadCount: c.unreadCount + 1 }
        : c
    )
  }))
  const chat = getChatById(params.chatId)
  emitMessageNotification({
    chatId: params.chatId,
    chatTitle: chat?.title ?? params.senderHandle,
    preview: params.text,
    senderHandle: params.senderHandle,
    avatarUrl: PROFILE_AVATARS[params.senderHandle]
  })
}

export const hasUnreadMessages = (): boolean =>
  loadSocialState().chats.some((c) => c.unreadCount > 0)
