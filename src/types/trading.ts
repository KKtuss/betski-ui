export interface Order {
  price: number
  quantity: number
}

export interface Trade {
  /** Stable identifier so animated lists can key safely after prepending */
  id?: string
  time: string
  price: number
  quantity: number
  type: 'buy' | 'sell'
}
