import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Search, Send, UserPlus, X } from 'lucide-react'
import MarketShareCard from './MarketShareCard'
import TradeShareCard from './TradeShareCard'
import { getMockMessages } from '../data/socialMock'
import './SocialsPanel.css'
type ChatKind = 'dm' | 'group'

interface Chat {
  id: string
  kind: ChatKind
  title: string
  subtitle: string
  unreadCount: number
  avatar?: string
  members?: string[]
}

interface Message {
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

interface SocialsPanelProps {
  onBack: () => void
  chats?: Chat[]
  shareMarket?: {
    videoId: number
    title: string
    yesOdds: number
    chart: { value: number; timestamp: number }[]
    timeLeftLabel: string
    thumbnailVideoUrl?: string
    thumbnailFallbackSrc?: string
  }
  initialActiveChatId?: string
  pendingShare?: {
    key: string
    chatId: string
    market: NonNullable<Message['market']>
  }
  onPendingShareHandled?: () => void
  pendingShareText?: {
    key: string
    chatId: string
    text: string
  }
  onPendingShareTextHandled?: () => void
  pendingShareTrade?: {
    key: string
    chatId: string
    trade: NonNullable<Message['trade']>
  }
  onPendingShareTradeHandled?: () => void
  onOpenMarket?: (videoId: number) => void
  onChatRead?: (chatId: string) => void
  onAddFriend?: (handle: string) => string
  onViewProfile?: (handle: string) => void
}

const normalizeChatHandle = (title: string) => title.replace(/^@/, '')

const SocialsPanel = ({ onBack, chats: providedChats, shareMarket, initialActiveChatId, pendingShare, onPendingShareHandled, pendingShareText, onPendingShareTextHandled, pendingShareTrade, onPendingShareTradeHandled, onOpenMarket, onChatRead, onAddFriend, onViewProfile }: SocialsPanelProps) => {
  const [activeChatId, setActiveChatId] = useState(() => initialActiveChatId ?? 'group-1')
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const handledPendingShareKeyRef = useRef<string | null>(null)
  const handledPendingShareTextKeyRef = useRef<string | null>(null)
  const handledPendingShareTradeKeyRef = useRef<string | null>(null)
  const [addFriendOpen, setAddFriendOpen] = useState(false)
  const [addFriendHandle, setAddFriendHandle] = useState('')
  const [mobileChatOpen, setMobileChatOpen] = useState(false)

  useEffect(() => {
    if (activeChatId) {
      onChatRead?.(activeChatId)
    }
  }, [activeChatId, onChatRead])

  const chats: Chat[] = useMemo(() => (providedChats ?? ([
    {
      id: 'group-1',
      kind: 'group',
      title: 'Betskiing',
      subtitle: 'Pinned: Entry levels for today',
      unreadCount: 3,
      members: [
        '/Stems/BetskiPEFFPEE.png',
        '/Stems/moggorrr%20transparent.png',
        '/Stems/epstein.png'
      ]
    },
    {
      id: 'dm-1',
      kind: 'dm',
      title: 'MarkDiTob',
      subtitle: 'got fills?',
      unreadCount: 1,
      avatar: '/Stems/moggorrr%20transparent.png'
    },
    {
      id: 'dm-3',
      kind: 'dm',
      title: 'BenBetski',
      subtitle: 'Betski',
      unreadCount: 2,
      avatar: '/Stems/BetskiPEFFPEE.png'
    },
  ])), [providedChats])

  const [messages, setMessages] = useState<Message[]>(() => getMockMessages())

  useEffect(() => {
    if (!initialActiveChatId) return
    setActiveChatId(initialActiveChatId)
  }, [initialActiveChatId])

  useEffect(() => {
    if (!pendingShare) return
    if (handledPendingShareKeyRef.current === pendingShare.key) return
    handledPendingShareKeyRef.current = pendingShare.key
    const targetChat = chats.find(c => c.id === pendingShare.chatId)
    setActiveChatId(pendingShare.chatId)
    setMobileChatOpen(true)
    setMessages(prev => ([
      ...prev,
      {
        id: `m-market-${Date.now()}`,
        chatId: pendingShare.chatId,
        author: 'me',
        authorLabel: targetChat?.kind === 'group' ? 'You' : undefined,
        type: 'market',
        market: pendingShare.market,
        timestamp: Date.now()
      }
    ]))
    onPendingShareHandled?.()
  }, [pendingShare, chats, onPendingShareHandled])

  useEffect(() => {
    if (!pendingShareText) return
    if (handledPendingShareTextKeyRef.current === pendingShareText.key) return
    handledPendingShareTextKeyRef.current = pendingShareText.key
    const targetChat = chats.find(c => c.id === pendingShareText.chatId)
    setActiveChatId(pendingShareText.chatId)
    setMobileChatOpen(true)
    setMessages(prev => ([
      ...prev,
      {
        id: `m-text-${Date.now()}`,
        chatId: pendingShareText.chatId,
        author: 'me',
        authorLabel: targetChat?.kind === 'group' ? 'You' : undefined,
        type: 'text',
        text: pendingShareText.text,
        timestamp: Date.now()
      }
    ]))
    onPendingShareTextHandled?.()
  }, [pendingShareText, chats, onPendingShareTextHandled])

  useEffect(() => {
    if (!pendingShareTrade) return
    if (handledPendingShareTradeKeyRef.current === pendingShareTrade.key) return
    handledPendingShareTradeKeyRef.current = pendingShareTrade.key
    const targetChat = chats.find(c => c.id === pendingShareTrade.chatId)
    setActiveChatId(pendingShareTrade.chatId)
    setMobileChatOpen(true)
    setMessages(prev => ([
      ...prev,
      {
        id: `m-trade-${Date.now()}`,
        chatId: pendingShareTrade.chatId,
        author: 'me',
        authorLabel: targetChat?.kind === 'group' ? 'You' : undefined,
        type: 'trade',
        trade: pendingShareTrade.trade,
        timestamp: Date.now()
      }
    ]))
    onPendingShareTradeHandled?.()
  }, [pendingShareTrade, chats, onPendingShareTradeHandled])

  const displayChats = useMemo(() => {
    return chats.map(chat => {
      const chatMessages = messages.filter(m => m.chatId === chat.id)
      const lastMsg = chatMessages[chatMessages.length - 1]
      
      let dynamicSubtitle = chat.subtitle
      if (lastMsg) {
        if (lastMsg.type === 'text') {
          const text = lastMsg.text || ''
          if (lastMsg.author === 'me') {
            dynamicSubtitle = `You: ${text}`
          } else if (chat.kind === 'group' && lastMsg.authorLabel) {
            dynamicSubtitle = `${lastMsg.authorLabel}: ${text}`
          } else {
            dynamicSubtitle = text
          }
        } else if (lastMsg.type === 'market') {
          if (lastMsg.author === 'me') {
            dynamicSubtitle = 'You shared a market'
          } else {
            dynamicSubtitle = `${lastMsg.authorLabel || 'Someone'} shared a market`
          }
        }
      }
      return { ...chat, subtitle: dynamicSubtitle }
    })
  }, [chats, messages])

  const filteredChats = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return displayChats
    return displayChats.filter(c => c.title.toLowerCase().includes(q))
  }, [displayChats, query])

  const activeChat = displayChats.find(c => c.id === activeChatId) || displayChats[0]
  const isGroupChat = activeChat.kind === 'group'
  const activeMessages = messages.filter(m => m.chatId === activeChat.id)

  const sendMessage = () => {
    const text = draft.trim()
    if (!text) return
    setMessages(prev => ([
      ...prev,
      {
        id: `m-${Date.now()}`,
        chatId: activeChat.id,
        author: 'me',
        authorLabel: isGroupChat ? 'You' : undefined,
        type: 'text',
        text,
        timestamp: Date.now()
      }
    ]))
    setDraft('')
  }

  const submitAddFriend = () => {
    const handle = addFriendHandle.trim()
    if (!handle) return
    const newChatId = onAddFriend?.(handle)
    if (newChatId) setActiveChatId(newChatId)
    setAddFriendHandle('')
    setAddFriendOpen(false)
  }

  return (
    <motion.div
      className="socials-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      whileHover={{ scale: 1 }}
    >
      <div className="socials-header">
        <button className="socials-back" onClick={onBack} type="button" aria-label="Back">
          <ArrowLeft size={18} color="#FF9966" />
        </button>
        <div className="socials-title" style={{ 
          background: 'linear-gradient(135deg, #FF9966 0%, #FF5E62 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>SOCIALS</div>
        <div className="socials-header-actions">
          <button
            type="button"
            className="socials-header-btn"
            onClick={() => setAddFriendOpen(true)}
            aria-label="Add friendski"
            title="Add friendski"
          >
            <UserPlus size={18} />
          </button>
        </div>
      </div>

      {addFriendOpen && (
        <div className="socials-modal-backdrop" role="presentation" onClick={() => setAddFriendOpen(false)}>
          <div className="socials-modal" role="dialog" aria-modal="true" aria-label="Add friendski" onClick={(e) => e.stopPropagation()}>
            <div className="socials-modal-head">
              <div className="socials-modal-title">Add friendski</div>
              <button type="button" className="socials-modal-close" onClick={() => setAddFriendOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="socials-modal-body">
              <div className="socials-modal-row">
                <input
                  value={addFriendHandle}
                  onChange={(e) => setAddFriendHandle(e.target.value)}
                  placeholder="@username"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitAddFriend()
                  }}
                />
              </div>
              <div className="socials-modal-actions">
                <button type="button" className="socials-modal-btn ghost" onClick={() => setAddFriendOpen(false)}>Cancel</button>
                <button type="button" className="socials-modal-btn primary" onClick={submitAddFriend}>Add</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`socials-body${mobileChatOpen ? ' show-chat' : ''}`}>
        <div className="socials-left">
          <div className="socials-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
            />
          </div>

          <div className="socials-chats">
            {filteredChats.map(chat => (
              <button
                key={chat.id}
                type="button"
                className={`socials-chat ${chat.id === activeChat.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveChatId(chat.id)
                  setMobileChatOpen(true)
                }}
              >
                <div className={`socials-chat-avatar ${(chat.kind === 'group' || chat.avatar) ? 'has-image' : ''}`}>
                  {chat.kind === 'group' ? (
                    <div className="socials-avatar-presentoir">
                      {chat.members?.slice(0, 3).map((m, i) => (
                        <img key={i} src={m} alt="" className="presentoir-img" />
                      ))}
                    </div>
                  ) : (
                    chat.avatar ? (
                      <img src={chat.avatar} alt="" className="socials-chat-img" />
                    ) : (
                      chat.title.slice(1, 2).toUpperCase()
                    )
                  )}
                </div>
                <div className="socials-chat-meta">
                  <div className="socials-chat-title">{chat.title}</div>
                  <div className="socials-chat-subtitle">{chat.subtitle}</div>
                </div>
                {chat.unreadCount > 0 && (
                  <div className="socials-chat-unread">{chat.unreadCount}</div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="socials-right">
          <div className="socials-chat-header">
            <button
              type="button"
              className="socials-chat-back"
              onClick={() => setMobileChatOpen(false)}
              aria-label="Back to chats"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              className={`socials-chat-header-profile${activeChat.kind === 'dm' ? ' is-clickable' : ''}`}
              disabled={activeChat.kind !== 'dm'}
              onClick={() => {
                if (activeChat.kind === 'dm') onViewProfile?.(normalizeChatHandle(activeChat.title))
              }}
            >
              <div className="socials-chat-header-title">{activeChat.title}</div>
              <div className="socials-chat-header-subtitle">{activeChat.subtitle}</div>
            </button>
          </div>

          <div className="socials-messages">
            {activeMessages.map(msg => (
              <div key={msg.id} className={`socials-message ${msg.author === 'me' ? 'me' : 'other'}`}>
                <div className="socials-message-stack">
                  {isGroupChat && msg.authorLabel && (
                    <div className={`socials-author ${msg.author === 'me' ? 'me' : 'other'}`}>{msg.authorLabel}</div>
                  )}
                  {msg.type === 'text' ? (
                    <div className="socials-bubble">{msg.text}</div>
                  ) : msg.type === 'market' ? (
                    <div className="socials-embed">
                      <MarketShareCard
                        thumbnailVideoUrl={msg.market?.thumbnailVideoUrl}
                        thumbnailFallbackSrc={shareMarket?.thumbnailFallbackSrc}
                        title={msg.market?.title || 'Market'}
                        yesOdds={msg.market?.yesOdds ?? 50}
                        chart={msg.market?.chart ?? []}
                        timeLeftLabel={msg.market?.timeLeftLabel ?? '—'}
                        onViewMarket={() => {
                          if (!msg.market) return
                          onOpenMarket?.(msg.market.videoId)
                        }}
                      />
                    </div>
                  ) : (
                    <div className="socials-embed">
                      <TradeShareCard
                        title={msg.trade?.title ?? 'Trade'}
                        side={msg.trade?.side ?? 'YES'}
                        entry={msg.trade?.entry ?? 0}
                        exit={msg.trade?.exit ?? 0}
                        pnlUsd={msg.trade?.pnlUsd ?? 0}
                        pnlPct={msg.trade?.pnlPct ?? 0}
                        chart={msg.trade?.chart ?? []}
                        thumbnailSrc={msg.trade?.thumbnailSrc}
                        thumbnailFallbackSrc={msg.trade?.thumbnailFallbackSrc ?? '/Stems/betskuu.png'}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="socials-compose">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message"
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage()
              }}
            />
            <button type="button" onClick={sendMessage} className="socials-send" aria-label="Send">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default SocialsPanel
