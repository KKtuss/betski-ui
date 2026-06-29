import type { Trade } from './trading'

export type OrderbookMode = 'orderbook' | 'long' | 'short' | 'share'

export type TradeAction = 'buy' | 'sell'

export type TradeExecution = {
  side: 'long' | 'short'
  action: TradeAction
  usdAmount: number
  sharesAmount: number
  price: number
}

export type TradeExecutedHandler = (trade: TradeExecution) => void

export type ShareTarget = {
  id: string
  title: string
  kind: 'dm' | 'group'
  avatar?: string
  members?: string[]
}

export interface OrderbookPanelProps {
  activeMode?: OrderbookMode
  onBack?: () => void
  recentTrades?: Trade[]
  walletBalance?: number
  holdingShares?: number
  currentPrice?: number
  marketTitle?: string
  volume24h?: number
  priceChange24h?: number
  avgEntry?: number
  onTradeExecuted?: TradeExecutedHandler
  shareTargets?: ShareTarget[]
  onShareToChat?: (chatId: string) => void
  compact?: boolean
}

export interface TradingFormProps {
  mode: 'long' | 'short'
  onBack: () => void
  walletBalance: number
  holdingShares: number
  currentPrice: number
  marketTitle?: string
  volume24h?: number
  priceChange24h?: number
  avgEntry?: number
  onTradeExecuted?: TradeExecutedHandler
  compact?: boolean
}
