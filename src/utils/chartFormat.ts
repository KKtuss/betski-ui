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
