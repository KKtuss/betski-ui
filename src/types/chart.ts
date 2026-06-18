export interface DataPoint {
  value: number
  timestamp: number
}

export type ChartTimeWindow = '1H' | '1D' | '1W' | '1M' | 'MAX'
