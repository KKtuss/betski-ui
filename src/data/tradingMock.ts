import type { Order, Trade } from '../types/trading'

export const generateMockBuyOrders = (): Order[] => {
  return Array.from({ length: 25 }, (_, i) => {
    const depthFactor = (i + 1) / 25
    const baseQuantity = 50 + (depthFactor * 800)
    return {
      price: 68.5 - (i * 0.1) - (Math.random() * 0.05),
      quantity: Math.floor(baseQuantity + (Math.random() * 100))
    }
  })
}

export const generateMockSellOrders = (): Order[] => {
  return Array.from({ length: 25 }, (_, i) => {
    const depthFactor = (i + 1) / 25
    const baseQuantity = 50 + (depthFactor * 800)
    return {
      price: 68.5 + ((i + 1) * 0.1) + (Math.random() * 0.05),
      quantity: Math.floor(baseQuantity + (Math.random() * 100))
    }
  })
}

export const generateMockTrades = (): Trade[] => {
  return Array.from({ length: 150 }, (_, i) => {
    const isBuy = Math.random() > 0.45
    const timeDate = new Date(Date.now() - i * 2000 - Math.random() * 5000)
    const timeStr = timeDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const price = 68.5 + (Math.random() - 0.5) * 2
    
    return {
      time: timeStr,
      price: price,
      quantity: Math.floor(10 + Math.random() * 500),
      type: isBuy ? 'buy' : 'sell'
    }
  }) as Trade[]
}
