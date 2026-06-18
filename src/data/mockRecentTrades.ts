import type { Trade } from '../types/trading'

export const createDefaultRecentTrades = (): Trade[] =>
  Array.from({ length: 320 }, (_, i) => {
    const isBuy = Math.random() > 0.45
    const timeDate = new Date(Date.now() - i * 900 - Math.random() * 4000)
    const timeStr = timeDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const price = 68.5 + Math.sin(i * 0.11) * 1.2 + (Math.random() - 0.5) * 1.2
    const quantity = Math.floor(12 + Math.abs(Math.sin(i * 0.37)) * 520 + Math.random() * 180)
    return {
      time: timeStr,
      price,
      quantity,
      type: isBuy ? 'buy' : 'sell'
    }
  }) as Trade[]
