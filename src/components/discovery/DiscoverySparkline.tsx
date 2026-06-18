import { useId, useMemo } from 'react'
import type { DataPoint } from '../../types/chart'
import { clamp } from '../../utils/math'
import './DiscoverySparkline.css'

export const DiscoverySparkline = ({ data }: { data: DataPoint[] }) => {
  const uid = useId()
  const safeUid = uid.replace(/[^a-zA-Z0-9_-]/g, '')
  const viewBoxWidth = 100
  const viewBoxHeight = 64
  const paddingX = 1
  const paddingY = 0

  const linePath = useMemo(() => {
    if (!data.length) return ''
    const maxPoints = 80
    const plottedData =
      data.length <= maxPoints
        ? data
        : Array.from({ length: maxPoints }, (_, i) => data[Math.round((i / (maxPoints - 1)) * (data.length - 1))])
    const values = plottedData.map((point) => clamp(point.value, 1, 99))
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const range = Math.max(4, maxValue - minValue)
    const paddedMin = clamp(minValue - range * 0.18, 1, 99)
    const paddedMax = clamp(maxValue + range * 0.18, 1, 99)
    const paddedRange = Math.max(1, paddedMax - paddedMin)
    const chartW = viewBoxWidth - paddingX * 2
    const chartH = viewBoxHeight - paddingY * 2

    let path = ''
    for (let i = 0; i < plottedData.length; i++) {
      const d = plottedData[i]
      const x = paddingX + (i / Math.max(1, plottedData.length - 1)) * chartW
      const y = paddingY + chartH - ((clamp(d.value, 1, 99) - paddedMin) / paddedRange) * chartH
      path += i === 0 ? `M ${x},${y}` : ` L ${x},${y}`
    }
    return path
  }, [data])

  const areaPath = useMemo(() => {
    if (!linePath) return ''
    const bottomY = viewBoxHeight
    return `${linePath} L ${viewBoxWidth - paddingX},${bottomY} L ${paddingX},${bottomY} Z`
  }, [linePath])

  const firstValue = data[0]?.value ?? 50
  const lastValue = data[data.length - 1]?.value ?? 50
  const isPositive = (lastValue - firstValue) >= 0
  const color = isPositive ? '#0CFA00' : '#FF4D4D'
  const gradientId = `discoverySparklineGradient-${safeUid}-${isPositive ? 'pos' : 'neg'}`

  return (
    <div className="discovery-sparkline">
      <svg
        className="discovery-sparkline-svg"
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.1" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
        {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth="2.15" />}
      </svg>
    </div>
  )
}
