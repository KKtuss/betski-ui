import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  BarChart3,
  Bell,
  BadgeCheck,
  ChevronDown,
  MoreHorizontal,
  Newspaper,
  Plus,
  Search,
  Send,
  Share2,
  Star,
  UserPlus,
  X
} from 'lucide-react'
import MarketShareCard from './MarketShareCard'
import TradeShareCard from './TradeShareCard'
import {
  addDmChat,
  appendMessage,
  markChatRead,
  type SocialChat
} from '../data/socialStore'
import { useSocialStore } from '../hooks/useSocialStore'
import { SOCIAL_AUTHOR_AVATARS, type Message } from '../data/socialMock'
import { resolveMarketShareData } from '../utils/resolveMarketShareData'
import './SocialsPanel.css'

type ChatFilter = 'all' | 'dms' | 'groups' | 'mentions'

interface Chat extends SocialChat {}

interface SocialsPanelProps {
  onBack: () => void
  chats?: Chat[]
  shareMarket?: {
    marketId?: string
    videoId: number
    title: string
    yesOdds: number
    chart: { value: number; timestamp: number }[]
    timeLeftLabel: string
    thumbnailVideoUrl?: string
    thumbnailFallbackSrc?: string
    thumbnailUrls?: string[]
    volume24h?: number
    holders?: number
    winRate?: number
    priceChange?: number
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
  onOpenMarket?: (marketId: string) => void
  onChatRead?: (chatId: string) => void
  onAddFriend?: (handle: string) => string
  onViewProfile?: (handle: string) => void
}

const FILTER_TABS: { key: ChatFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'dms', label: 'DMs' },
  { key: 'groups', label: 'Groups' },
  { key: 'mentions', label: 'Mentions' }
]

const MARKET_SNAPSHOT = [
  { label: 'Total Volume (24h)', value: '$7.01K', delta: '+18.4%' },
  { label: 'Active Trades', value: '4,693', delta: '+12.1%' },
  { label: 'Win Rate', value: '76%', delta: '+2.3%' }
]

const resolveMessageMarket = (
  market: NonNullable<Message['market']>,
  shareFallback?: SocialsPanelProps['shareMarket']
) => {
  if (market.marketId) {
    const live = resolveMarketShareData(market.marketId)
    if (live) return { ...market, ...live }
  }
  return market.marketId ? market : { ...market, ...shareFallback }
}

type CatchUpMarket = {
  id: string
  sharedBy: string
  title: string
  marketId?: string
  yesOdds?: number
  timestamp: number
}

type CatchUpCall = {
  id: string
  handle: string
  label: string
  marketId?: string
  pnlUsd?: number
  side?: 'YES' | 'NO'
  timestamp: number
}

type ChatCatchUp = {
  markets: CatchUpMarket[]
  calls: CatchUpCall[]
  hasContent: boolean
}

const CALL_TEXT_PATTERN =
  /\b(long|short|in on|sized|added|took)\b.*\b(yes|no)\b|\b(yes|no)\b.*\b(looks good|moon|call|conviction)\b/i

const buildChatCatchUp = (
  messages: Message[],
  shareFallback?: SocialsPanelProps['shareMarket']
): ChatCatchUp => {
  const markets: CatchUpMarket[] = []
  const calls: CatchUpCall[] = []
  const seenMarketIds = new Set<string>()
  const seenCallIds = new Set<string>()

  for (const msg of [...messages].reverse()) {
    if (msg.type !== 'market' || !msg.market) continue
    const live = resolveMessageMarket(msg.market, shareFallback)
    const key = live.marketId ?? msg.id
    if (seenMarketIds.has(key)) continue
    seenMarketIds.add(key)
    markets.push({
      id: msg.id,
      sharedBy: msg.author === 'me' ? 'You' : (msg.authorLabel ?? 'Member'),
      title: live.title,
      marketId: live.marketId,
      yesOdds: live.yesOdds,
      timestamp: msg.timestamp
    })
    if (markets.length >= 3) break
  }

  for (const msg of [...messages].reverse()) {
    if (msg.type !== 'trade' || !msg.trade) continue
    if (msg.trade.pnlUsd <= 0) continue
    if (seenCallIds.has(msg.id)) continue
    seenCallIds.add(msg.id)
    calls.push({
      id: msg.id,
      handle: msg.author === 'me' ? 'You' : (msg.authorLabel ?? 'Trader'),
      label: msg.trade.title,
      pnlUsd: msg.trade.pnlUsd,
      side: msg.trade.side,
      timestamp: msg.timestamp
    })
    if (calls.length >= 3) break
  }

  if (calls.length < 3) {
    for (const msg of [...messages].reverse()) {
      if (msg.type !== 'text' || !msg.text || msg.author === 'me') continue
      if (!CALL_TEXT_PATTERN.test(msg.text)) continue
      if (seenCallIds.has(msg.id)) continue
      seenCallIds.add(msg.id)
      calls.push({
        id: msg.id,
        handle: msg.authorLabel ?? 'Member',
        label: msg.text,
        timestamp: msg.timestamp
      })
      if (calls.length >= 3) break
    }
  }

  return {
    markets,
    calls,
    hasContent: markets.length > 0 || calls.length > 0
  }
}

const formatCatchUpSummary = (catchUp: ChatCatchUp) => {
  const parts: string[] = []
  if (catchUp.markets.length > 0) {
    parts.push(`${catchUp.markets.length} market${catchUp.markets.length === 1 ? '' : 's'}`)
  }
  if (catchUp.calls.length > 0) {
    parts.push(`${catchUp.calls.length} call${catchUp.calls.length === 1 ? '' : 's'}`)
  }
  return parts.join(' · ')
}

const normalizeChatHandle = (title: string) => title.replace(/^@/, '')

const formatChatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const renderMessageText = (text: string): ReactNode => {
  const parts = text.split(/(\bYES\b|\bNO\b)/g)
  if (parts.length === 1) return text
  return parts.map((part, index) => {
    if (part === 'YES') {
      return (
        <span key={index} className="socials-inline-pill socials-inline-pill--yes">
          YES
        </span>
      )
    }
    if (part === 'NO') {
      return (
        <span key={index} className="socials-inline-pill socials-inline-pill--no">
          NO
        </span>
      )
    }
    return part
  })
}

const SocialsPanel = ({
  onBack,
  chats: providedChats,
  shareMarket,
  initialActiveChatId,
  pendingShare,
  onPendingShareHandled,
  pendingShareText,
  onPendingShareTextHandled,
  pendingShareTrade,
  onPendingShareTradeHandled,
  onOpenMarket,
  onChatRead,
  onAddFriend,
  onViewProfile
}: SocialsPanelProps) => {
  const socialState = useSocialStore()
  const [activeChatId, setActiveChatId] = useState(() => initialActiveChatId ?? 'group-1')
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [chatFilter, setChatFilter] = useState<ChatFilter>('all')
  const [tradeContextOpen, setTradeContextOpen] = useState(false)
  const handledPendingShareKeyRef = useRef<string | null>(null)
  const handledPendingShareTextKeyRef = useRef<string | null>(null)
  const handledPendingShareTradeKeyRef = useRef<string | null>(null)
  const [addFriendOpen, setAddFriendOpen] = useState(false)
  const [addFriendHandle, setAddFriendHandle] = useState('')
  const [mobileChatOpen, setMobileChatOpen] = useState(false)

  useEffect(() => {
    if (!activeChatId) return
    markChatRead(activeChatId)
    onChatRead?.(activeChatId)
  }, [activeChatId, onChatRead])

  useEffect(() => {
    setTradeContextOpen(false)
  }, [activeChatId])

  const chats: Chat[] = useMemo(
    () => providedChats ?? socialState.chats,
    [providedChats, socialState.chats]
  )

  const allMessages = socialState.messages

  const messages = useMemo(
    () => allMessages.filter((m) => m.chatId === activeChatId).sort((a, b) => a.timestamp - b.timestamp),
    [allMessages, activeChatId]
  )

  useEffect(() => {
    if (initialActiveChatId) {
      setActiveChatId(initialActiveChatId)
      setMobileChatOpen(true)
    } else {
      setMobileChatOpen(false)
    }
  }, [initialActiveChatId])

  useEffect(() => {
    if (!pendingShare) return
    if (handledPendingShareKeyRef.current === pendingShare.key) return
    handledPendingShareKeyRef.current = pendingShare.key
    const targetChat = chats.find((c) => c.id === pendingShare.chatId)
    setActiveChatId(pendingShare.chatId)
    setMobileChatOpen(true)
    appendMessage({
      id: `m-market-${Date.now()}`,
      chatId: pendingShare.chatId,
      author: 'me',
      authorLabel: targetChat?.kind === 'group' ? 'You' : undefined,
      type: 'market',
      market: pendingShare.market,
      timestamp: Date.now()
    })
    onPendingShareHandled?.()
  }, [pendingShare, chats, onPendingShareHandled])

  useEffect(() => {
    if (!pendingShareText) return
    if (handledPendingShareTextKeyRef.current === pendingShareText.key) return
    handledPendingShareTextKeyRef.current = pendingShareText.key
    const targetChat = chats.find((c) => c.id === pendingShareText.chatId)
    setActiveChatId(pendingShareText.chatId)
    setMobileChatOpen(true)
    appendMessage({
      id: `m-text-${Date.now()}`,
      chatId: pendingShareText.chatId,
      author: 'me',
      authorLabel: targetChat?.kind === 'group' ? 'You' : undefined,
      type: 'text',
      text: pendingShareText.text,
      timestamp: Date.now()
    })
    onPendingShareTextHandled?.()
  }, [pendingShareText, chats, onPendingShareTextHandled])

  useEffect(() => {
    if (!pendingShareTrade) return
    if (handledPendingShareTradeKeyRef.current === pendingShareTrade.key) return
    handledPendingShareTradeKeyRef.current = pendingShareTrade.key
    const targetChat = chats.find((c) => c.id === pendingShareTrade.chatId)
    setActiveChatId(pendingShareTrade.chatId)
    setMobileChatOpen(true)
    appendMessage({
      id: `m-trade-${Date.now()}`,
      chatId: pendingShareTrade.chatId,
      author: 'me',
      authorLabel: targetChat?.kind === 'group' ? 'You' : undefined,
      type: 'trade',
      trade: pendingShareTrade.trade,
      timestamp: Date.now()
    })
    onPendingShareTradeHandled?.()
  }, [pendingShareTrade, chats, onPendingShareTradeHandled])

  const displayChats = useMemo(() => {
    return chats.map((chat) => {
      const chatMessages = allMessages.filter((m) => m.chatId === chat.id)
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
          dynamicSubtitle =
            lastMsg.author === 'me'
              ? 'You shared a market'
              : `${lastMsg.authorLabel || 'Someone'} shared a market`
        } else if (lastMsg.type === 'trade') {
          dynamicSubtitle =
            lastMsg.author === 'me'
              ? 'You shared a trade'
              : `${lastMsg.authorLabel || 'Someone'} shared a trade`
        }
      }

      return {
        ...chat,
        subtitle: dynamicSubtitle,
        lastMessageAt: lastMsg?.timestamp ?? Date.now() - 1000 * 60 * 60
      }
    })
  }, [chats, allMessages])

  const dmUnreadCount = useMemo(
    () => displayChats.filter((c) => c.kind === 'dm' && c.unreadCount > 0).length,
    [displayChats]
  )

  const filteredChats = useMemo(() => {
    const q = query.trim().toLowerCase()
    return displayChats.filter((chat) => {
      if (chatFilter === 'dms' && chat.kind !== 'dm') return false
      if (chatFilter === 'groups' && chat.kind !== 'group') return false
      if (chatFilter === 'mentions' && !chat.hasMention && chat.unreadCount === 0) return false
      if (q && !chat.title.toLowerCase().includes(q) && !chat.subtitle.toLowerCase().includes(q)) return false
      return true
    })
  }, [displayChats, query, chatFilter])

  const activeChat = displayChats.find((c) => c.id === activeChatId) ?? displayChats[0] ?? chats[0]
  const isGroupChat = activeChat?.kind === 'group'
  const activeMessages = activeChat ? messages : []

  const chatCatchUp = useMemo(
    () => buildChatCatchUp(activeMessages, shareMarket),
    [activeMessages, shareMarket]
  )
  const showCatchUp = activeChat?.kind === 'group'
  const catchUpSummary = formatCatchUpSummary(chatCatchUp)

  const sendMessage = (textOverride?: string) => {
    const text = (textOverride ?? draft).trim()
    if (!text) return
    appendMessage({
      id: `m-${Date.now()}`,
      chatId: activeChat.id,
      author: 'me',
      authorLabel: isGroupChat ? 'You' : undefined,
      type: 'text',
      text,
      timestamp: Date.now()
    })
    setDraft('')
  }

  const submitAddFriend = () => {
    const handle = addFriendHandle.trim()
    if (!handle) return
    const newChatId = onAddFriend?.(handle) ?? addDmChat(handle)
    if (newChatId) {
      setActiveChatId(newChatId)
      setMobileChatOpen(true)
    }
    setAddFriendHandle('')
    setAddFriendOpen(false)
  }

  const resolveAuthorAvatar = (msg: Message) => {
    if (msg.author === 'me') return SOCIAL_AUTHOR_AVATARS.You
    if (msg.authorLabel && SOCIAL_AUTHOR_AVATARS[msg.authorLabel]) return SOCIAL_AUTHOR_AVATARS[msg.authorLabel]
    if (activeChat.kind === 'dm' && activeChat.avatar) return activeChat.avatar
    return activeChat.members?.[0] ?? '/Stems/betskuu.png'
  }

  const renderChatAvatar = (chat: Chat) => {
    if (chat.kind === 'system') {
      return (
        <div className={`socials-system-icon socials-system-icon--${chat.systemIcon ?? 'news'}`}>
          {chat.systemIcon === 'alerts' ? <Bell size={16} /> : <Newspaper size={16} />}
        </div>
      )
    }
    if (chat.kind === 'group') {
      return (
        <div className="socials-avatar-presentoir">
          {chat.members?.slice(0, 3).map((member, index) => (
            <img key={index} src={member} alt="" className="presentoir-img" />
          ))}
        </div>
      )
    }
    if (chat.avatar) {
      return <img src={chat.avatar} alt="" className="socials-chat-img socials-chat-img--round" />
    }
    return chat.title.slice(0, 1).toUpperCase()
  }

  if (!activeChat) {
    return (
      <div className="socials-shell socials-shell--empty">
        <div className="socials-left-head">
          <button className="socials-back" onClick={onBack} type="button" aria-label="Back">
            <ArrowLeft size={16} />
          </button>
          <span className="socials-sidebar-title">SOCIALS</span>
        </div>
        <p className="socials-empty-copy">No conversations yet.</p>
      </div>
    )
  }

  return (
    <div className="socials-shell">
      {addFriendOpen && (
        <div className="socials-modal-backdrop" role="presentation" onClick={() => setAddFriendOpen(false)}>
          <div
            className="socials-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Add friendski"
            onClick={(e) => e.stopPropagation()}
          >
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
                <button type="button" className="socials-modal-btn ghost" onClick={() => setAddFriendOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="socials-modal-btn primary" onClick={submitAddFriend}>
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`socials-body${mobileChatOpen ? ' show-chat' : ''}`}>
        <div className="socials-left">
          <div className="socials-left-head">
            <button className="socials-back" onClick={onBack} type="button" aria-label="Back">
              <ArrowLeft size={16} />
            </button>
            <span className="socials-sidebar-title">SOCIALS</span>
            <button
              type="button"
              className="socials-header-btn"
              onClick={() => setAddFriendOpen(true)}
              aria-label="Add friendski"
              title="Add friendski"
            >
              <UserPlus size={16} />
            </button>
          </div>

          <div className="socials-search">
            <Search size={15} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations" />
          </div>

          <div className="socials-filters" role="tablist" aria-label="Conversation filters">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={chatFilter === tab.key}
                className={`socials-filter${chatFilter === tab.key ? ' is-active' : ''}`}
                onClick={() => setChatFilter(tab.key)}
              >
                {tab.label}
                {tab.key === 'dms' && dmUnreadCount > 0 && (
                  <span className="socials-filter-badge">{dmUnreadCount}</span>
                )}
              </button>
            ))}
          </div>

          <div className="socials-chats">
            {filteredChats.map((chat) => (
              <button
                key={chat.id}
                type="button"
                className={`socials-chat ${chat.id === activeChat.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveChatId(chat.id)
                  setMobileChatOpen(true)
                }}
              >
                <div className={`socials-chat-avatar ${chat.kind !== 'system' ? 'has-image' : ''}`}>
                  {renderChatAvatar(chat)}
                  {chat.online && chat.kind === 'dm' && <span className="socials-online-dot" aria-hidden="true" />}
                </div>
                <div className="socials-chat-meta">
                  <div className="socials-chat-row">
                    <span className="socials-chat-title">{chat.title}</span>
                    <span className="socials-chat-time">{formatChatTime(chat.lastMessageAt)}</span>
                  </div>
                  <div className="socials-chat-subtitle">{chat.subtitle}</div>
                </div>
                {chat.unreadCount > 0 && <div className="socials-chat-unread">{chat.unreadCount}</div>}
              </button>
            ))}
          </div>

          <div className="socials-snapshot">
            <div className="socials-snapshot-title">MARKET SNAPSHOT</div>
            <div className="socials-snapshot-grid">
              {MARKET_SNAPSHOT.map((item) => (
                <div key={item.label} className="socials-snapshot-item">
                  <span className="socials-snapshot-label">{item.label}</span>
                  <span className="socials-snapshot-value">{item.value}</span>
                  <span className="socials-snapshot-delta">{item.delta}</span>
                </div>
              ))}
            </div>
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
              className={`socials-chat-header-main${activeChat.kind === 'dm' ? ' is-clickable' : ''}`}
              disabled={activeChat.kind !== 'dm'}
              onClick={() => {
                if (activeChat.kind === 'dm') onViewProfile?.(normalizeChatHandle(activeChat.title))
              }}
            >
              <div className="socials-chat-header-avatar">
                {renderChatAvatar(activeChat)}
              </div>
              <div className="socials-chat-header-copy">
                <div className="socials-chat-header-title-row">
                  <span className="socials-chat-header-title">{activeChat.title}</span>
                  {activeChat.verified && (
                    <BadgeCheck size={14} className="socials-verified-badge" aria-label="Verified" />
                  )}
                </div>
                <div className="socials-chat-header-subtitle">
                  {activeChat.online ? 'Active now' : 'Offline'} • Last seen 2m ago
                </div>
              </div>
            </button>

            <div className="socials-chat-header-actions">
              <button type="button" className="socials-icon-btn" aria-label="Favorite">
                <Star size={16} />
              </button>
              <button type="button" className="socials-icon-btn" aria-label="Share">
                <Share2 size={16} />
              </button>
              <button type="button" className="socials-icon-btn" aria-label="More">
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>

          <div className="socials-conversation">
            {showCatchUp && (
              <div className={`socials-catchup${tradeContextOpen ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="socials-catchup-toggle"
                  onClick={() => setTradeContextOpen((open) => !open)}
                  aria-expanded={tradeContextOpen}
                  aria-label={tradeContextOpen ? 'Hide catch up' : 'Show catch up'}
                >
                  <span className="socials-catchup-toggle-main">
                    <BarChart3 size={14} />
                    <span className="socials-catchup-toggle-label">Catch up</span>
                    {!tradeContextOpen && chatCatchUp.hasContent && (
                      <span className="socials-catchup-toggle-summary">{catchUpSummary}</span>
                    )}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`socials-catchup-chevron${tradeContextOpen ? ' is-open' : ''}`}
                    aria-hidden
                  />
                </button>

                {tradeContextOpen && (
                  <div className="socials-catchup-body">
                    {chatCatchUp.hasContent ? (
                      <>
                        {chatCatchUp.markets.length > 0 && (
                          <section className="socials-catchup-section">
                            <h4 className="socials-catchup-section-title">Markets & articles</h4>
                            <ul className="socials-catchup-list">
                              {chatCatchUp.markets.map((item) => (
                                <li key={item.id}>
                                  <button
                                    type="button"
                                    className="socials-catchup-item"
                                    onClick={() => item.marketId && onOpenMarket?.(item.marketId)}
                                    disabled={!item.marketId}
                                  >
                                    <span className="socials-catchup-item-title">{item.title}</span>
                                    <span className="socials-catchup-item-meta">
                                      {item.sharedBy}
                                      {item.yesOdds !== undefined ? ` · ${item.yesOdds.toFixed(1)}¢ YES` : ''}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}
                        {chatCatchUp.calls.length > 0 && (
                          <section className="socials-catchup-section">
                            <h4 className="socials-catchup-section-title">Latest calls</h4>
                            <ul className="socials-catchup-list">
                              {chatCatchUp.calls.map((item) => (
                                <li key={item.id}>
                                  <div className="socials-catchup-item socials-catchup-item--static">
                                    <span className="socials-catchup-item-title">{item.label}</span>
                                    <span className="socials-catchup-item-meta">
                                      {item.handle}
                                      {item.pnlUsd !== undefined
                                        ? ` · +$${Math.round(item.pnlUsd)} ${item.side ?? ''}`.trim()
                                        : ''}
                                    </span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}
                      </>
                    ) : (
                      <p className="socials-catchup-empty">
                        No markets or calls shared yet — expand when you need a quick recap.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="socials-messages">
              {activeMessages.map((msg) => {
                const marketView =
                  msg.type === 'market' && msg.market
                    ? resolveMessageMarket(msg.market, shareMarket)
                    : null

                return (
                <div key={msg.id} className={`socials-message ${msg.author === 'me' ? 'me' : 'other'}`}>
                  {msg.author !== 'me' && (
                    <img src={resolveAuthorAvatar(msg)} alt="" className="socials-msg-avatar" />
                  )}
                  <div className="socials-message-stack">
                    {isGroupChat && msg.authorLabel && msg.author !== 'me' && (
                      <div className="socials-author other">{msg.authorLabel}</div>
                    )}
                    {msg.type === 'text' ? (
                      <div className="socials-bubble">{renderMessageText(msg.text ?? '')}</div>
                    ) : msg.type === 'market' && marketView ? (
                      <div className="socials-embed">
                        <MarketShareCard
                          thumbnailVideoUrl={marketView.thumbnailVideoUrl}
                          thumbnailFallbackSrc={marketView.thumbnailFallbackSrc}
                          thumbnailUrls={marketView.thumbnailUrls}
                          title={marketView.title || 'Market'}
                          yesOdds={marketView.yesOdds ?? 50}
                          chart={marketView.chart ?? []}
                          priceChange={marketView.priceChange}
                          volume24h={marketView.volume24h}
                          holders={marketView.holders}
                          winRate={marketView.winRate}
                          onViewMarket={() => {
                            const marketId =
                              marketView.marketId ??
                              (marketView.videoId ? `legacy-${marketView.videoId}` : undefined)
                            if (marketId) onOpenMarket?.(marketId)
                          }}
                        />
                      </div>
                    ) : msg.type === 'trade' ? (
                      <div className="socials-embed">
                        <TradeShareCard
                          marketId={msg.trade?.marketId}
                          title={msg.trade?.title ?? 'Trade'}
                          side={msg.trade?.side ?? 'YES'}
                          entry={msg.trade?.entry ?? 0}
                          exit={msg.trade?.exit ?? 0}
                          pnlUsd={msg.trade?.pnlUsd ?? 0}
                          pnlPct={msg.trade?.pnlPct ?? 0}
                          chart={msg.trade?.chart ?? []}
                          thumbnailUrls={msg.trade?.thumbnailUrls}
                          thumbnailSrc={msg.trade?.thumbnailSrc}
                          thumbnailFallbackSrc={msg.trade?.thumbnailFallbackSrc}
                        />
                      </div>
                    ) : null}
                  </div>
                  {msg.author === 'me' && (
                    <img src={SOCIAL_AUTHOR_AVATARS.You} alt="" className="socials-msg-avatar" />
                  )}
                </div>
                )
              })}
            </div>
          </div>

          <div className="socials-compose">
            <button type="button" className="socials-compose-add" aria-label="Add attachment">
              <Plus size={18} />
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage()
              }}
            />
            <button
              type="button"
              onClick={() => sendMessage()}
              className="socials-send"
              aria-label="Send"
              disabled={!draft.trim()}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SocialsPanel
