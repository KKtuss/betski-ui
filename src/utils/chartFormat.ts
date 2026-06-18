import type { DataPoint, ChartTimeWindow } from '../types/chart'

export const formatTime = (index: number, data: DataPoint[], timeWindow: ChartTimeWindow): string => {
  if (data.length === 0) return ''
  const timestamp = data[index].timestamp
  const date = new Date(timestamp)

  if (timeWindow === '1H') {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  } else if (timeWindow === '1D') {
    return `${date.getHours().toString().padStart(2, '0')}:00`
  } else {
    return `${date.getDate()}/${date.getMonth() + 1}`
  }
}

export const getVolumeForTimeWindow = (window: ChartTimeWindow) => {
  // Realistic early-stage volumes (MAX ~ $40K)
  const baseVolume = 40_000
  switch (window) {
    case '1H': return baseVolume * 0.06 // ~6% for 1H
    case '1D': return baseVolume * 0.25 // ~25% for 1D
    case '1W': return baseVolume * 0.55 // ~55% for 1W
    case '1M': return baseVolume * 0.85 // ~85% for 1M
    case 'MAX': return baseVolume
    default: return baseVolume
  }
}
