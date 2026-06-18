import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import type { DataPoint, ChartTimeWindow } from '../types/chart'
import { formatCompactUsd } from '../utils/formatCompact'
import { formatTime, getVolumeForTimeWindow } from '../utils/chartFormat'
import './Panel.css'

interface ChartPanelProps {
  data?: DataPoint[]
  dataByWindow?: Partial<Record<ChartTimeWindow, DataPoint[]>>
  timeLeftLabel?: string
  resolutionTimestamp?: number
}

const getXAxisTickCount = (timeWindow: ChartTimeWindow, width: number) => {
  const roomyCount = timeWindow === '1D' ? 6 : 5
  const compactCount = timeWindow === '1D' ? 5 : 4
  return width < 420 ? compactCount : roomyCount
}

const formatXAxisTick = (timestamp: number, timeWindow: ChartTimeWindow) => {
  const date = new Date(timestamp)

  if (timeWindow === '1H' || timeWindow === '1D') {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  return `${date.getDate()}/${date.getMonth() + 1}`
}

const formatCountdown = (targetTimestamp: number, now: number) => {
  const diffMs = Math.max(0, targetTimestamp - now)
  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) {
    return `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const ChartPanel = ({ data: externalData, dataByWindow, timeLeftLabel, resolutionTimestamp }: ChartPanelProps) => {
  const [internalData, setInternalData] = useState<DataPoint[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const hasMountedRef = useRef(false)
  const [countdownNow, setCountdownNow] = useState(() => Date.now())
  
  const [timeWindow, setTimeWindow] = useState<ChartTimeWindow>('1D')
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number, y: number, value: number, time: string } | null>(null)
  const data = dataByWindow?.[timeWindow] || externalData || internalData

  // Track container size
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setDimensions({ width, height })
      }
    }

    updateDimensions()
    const observer = new ResizeObserver(updateDimensions)
    
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    hasMountedRef.current = true
  }, [])

  useEffect(() => {
    if (!resolutionTimestamp) return

    const interval = window.setInterval(() => {
      setCountdownNow(Date.now())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [resolutionTimestamp])

  // Initialize data
  useEffect(() => {
    // Only skip generation if data is provided for the CURRENT window
    if (externalData || (dataByWindow && dataByWindow[timeWindow])) return

    const generateData = () => {
      const initialData: DataPoint[] = []
      const now = Date.now()
      
      const targetEndValue = 37.0 // Fixed to 37% to match other timeframes
      let currentValue = targetEndValue
      
      const points = timeWindow === '1H' ? 60 : 
                     timeWindow === '1D' ? 24 : 
                     timeWindow === '1W' ? 7 : 
                     timeWindow === '1M' ? 30 : 60 // MAX
      const timeStep = timeWindow === '1H' ? 1000 * 60 : // 1 min
                      timeWindow === '1D' ? 1000 * 60 * 60 : // 1 hour
                      timeWindow === '1W' ? 1000 * 60 * 60 * 24 : // 1 day
                      timeWindow === '1M' ? 1000 * 60 * 60 * 24 : // 1 day
                      1000 * 60 * 60 * 24 * 3 // MAX (3 days)

      // Generate points backwards from the fixed end value
      for (let i = 0; i < points; i++) {
        initialData.unshift({
          value: currentValue,
          timestamp: now - i * timeStep
        })
        
        // Random walk backwards
        currentValue += (Math.random() - 0.5) * 15
        // Clamp between 20 and 80
        currentValue = Math.max(20, Math.min(80, currentValue))
      }
      return initialData
    }

    setInternalData(generateData())
  }, [timeWindow, externalData, dataByWindow])

  // Live feed simulation
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setData(prevData => {
  //       const lastValue = prevData[prevData.length - 1].value
  //       let newValue = lastValue + (Math.random() - 0.5) * 8
  //       newValue = Math.max(10, Math.min(90, newValue))
  //       
  //       const newPoint = {
  //         value: newValue,
  //         timestamp: Date.now()
  //       }
  //       
  //       // Keep last 40 points
  //       return [...prevData.slice(1), newPoint]
  //     })
  //   }, 100) // Fast update for "live" feel
  //
  //   return () => clearInterval(interval)
  // }, [])

  const { width, height } = dimensions
  const paddingLeft = 8
  const paddingRight = 44 // Reserved right-side lane for Y-axis labels
  const paddingTop = 18
  const paddingBottom = 30
  const chartWidth = Math.max(0, width - paddingLeft - paddingRight)
  const chartHeight = Math.max(0, height - paddingTop - paddingBottom)
  const yAxisLabelX = paddingLeft + chartWidth + 10

  const yMin = 0
  const yMax = 100
  const yRange = yMax - yMin

  const createMarketPath = () => {
    if (data.length === 0 || chartWidth === 0) return ''
    
    // Map data to coordinates
    const points = data.map((d, i) => {
      const x = paddingLeft + (i / (data.length - 1)) * chartWidth
      const normalizedValue = (d.value - yMin) / yRange
      const y = paddingTop + chartHeight - normalizedValue * chartHeight
      return { x, y }
    })
    
    let path = `M ${points[0].x},${points[0].y}`
    
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x},${points[i - 1].y} L ${points[i].x},${points[i].y}`
    }
    
    return path
  }

  const createAreaPath = () => {
    const linePath = createMarketPath()
    if (!linePath) return ''
    return `${linePath} L ${paddingLeft + chartWidth},${paddingTop + chartHeight} L ${paddingLeft},${paddingTop + chartHeight} Z`
  }

  const linePath = createMarketPath()
  const areaPath = createAreaPath()

  // Ensure path strings are different enough to trigger animation or use a key
  // Using timeWindow as key on the path elements ensures React treats them as new elements 
  // if the path interpolation fails, but for smooth morphing we actually want the SAME element
  // just with new 'd' attribute. The issue might be that going min->max changes the path complexity too much
  // or Framer Motion needs a hint.
  
  // Actually, for morphing to work well in both directions, the number of points should ideally match
  // or the interpolation engine needs to handle it. 
  // Let's try forcing a re-render of the path only if the point count changes drastically,
  // or just rely on the 'd' prop update which Framer Motion handles.
  // The user says "no animation from min to max". This suggests Framer Motion might be "snapping"
  // because the new path is calculated instantly.

  const getPointCoordinates = (index: number) => {
    if (chartWidth === 0 || !data || data.length === 0) return { x: 0, y: 0 }
    const x = paddingLeft + (index / (data.length - 1)) * chartWidth
    const normalizedValue = (data[index].value - yMin) / yRange
    const y = paddingTop + chartHeight - normalizedValue * chartHeight
    return { x, y }
  }

  // Safety guard for rendering
  if (!data || data.length === 0) {
    return (
      <motion.div 
        className="panel chart-panel"
        initial={hasMountedRef.current ? false : { opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        whileHover={{ scale: 1, boxShadow: "0 12px 32px rgba(0, 0, 0, 0.5)" }}
        style={{ display: 'flex', flexDirection: 'column', padding: '16px', alignItems: 'center', justifyContent: 'center' }}
      >
        <div style={{ color: '#666', fontSize: '12px' }}>Loading chart data...</div>
      </motion.div>
    )
  }

  const lastPoint = data[data.length - 1]
  const firstPoint = data[0]
  const change = lastPoint.value - firstPoint.value
  const isPositive = change >= 0
  const color = isPositive ? '#2DD56E' : '#FF4D4D'
  const buyTxs = data.reduce((acc, point, index) => (
    index > 0 && point.value > data[index - 1].value ? acc + 1 : acc
  ), 0)
  const sellTxs = data.reduce((acc, point, index) => (
    index > 0 && point.value < data[index - 1].value ? acc + 1 : acc
  ), 0)
  const xTicks = Array.from({ length: getXAxisTickCount(timeWindow, chartWidth) }, (_, i) => {
    const tickCount = getXAxisTickCount(timeWindow, chartWidth)
    const ratio = i / Math.max(1, tickCount - 1)
    const timestamp = firstPoint.timestamp + (lastPoint.timestamp - firstPoint.timestamp) * ratio
    return {
      key: `${timeWindow}-${i}-${Math.round(timestamp)}`,
      label: formatXAxisTick(timestamp, timeWindow),
      x: paddingLeft + ratio * chartWidth,
      textAnchor: i === 0 ? 'start' as const : i === tickCount - 1 ? 'end' as const : 'middle' as const
    }
  })

  const volume = getVolumeForTimeWindow(timeWindow)
  const countdownLabel = resolutionTimestamp
    ? formatCountdown(resolutionTimestamp, countdownNow)
    : timeLeftLabel

  return (
    <motion.div 
      className="panel chart-panel"
      initial={hasMountedRef.current ? false : { opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      whileHover={{ scale: 1, boxShadow: "0 12px 32px rgba(0, 0, 0, 0.5)" }}
      style={{ display: 'flex', flexDirection: 'column', padding: '16px' }}
    >
      {/* Header Area */}
      <div className="chart-header">
        <motion.div 
          className="chart-title-block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <span className="chart-eyebrow">MARKET OVERVIEW</span>
        </motion.div>

        <div className="chart-price-cluster">
          <div className="chart-price-row">
            <span className="chart-main-value" style={{ color }}>
              {Math.round(lastPoint.value)}%
            </span>
            <span className="chart-change-value" style={{ color }}>
              {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="chart-frame">
        <div className="chart-frame-tabs">
          <div className="time-selector">
            {(['1H', '1D', '1W', '1M', 'MAX'] as const).map((tw) => (
              <button
                key={tw}
                onClick={() => setTimeWindow(tw)}
                className={`time-btn ${timeWindow === tw ? 'active' : ''}`}
              >
                {tw}
              </button>
            ))}
          </div>
          {countdownLabel && (
            <div className="chart-resolution-pill">
              <span>{countdownLabel}</span>
            </div>
          )}
        </div>

        <div className="panel-content chart-content" ref={containerRef} style={{ width: '100%', flex: 1, minHeight: 0 }}>
          {dimensions.width > 0 && (
            <motion.div 
              className="chart-container"
              style={{ width: '100%', height: '100%' }}
            >
              <svg 
            width={width}
            height={height}
            className="chart-svg"
            style={{ overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.12" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Grid lines and Y-axis labels */}
            {(() => {
              const gridLines = [0, 25, 50, 75, 100]
              return gridLines.map((value) => {
                const ratio = (value - yMin) / yRange
                const yPos = paddingTop + chartHeight - ratio * chartHeight
                return { value, yPos }
              }).map(({ value, yPos }) => (
                <g key={`grid-h-${value}`}>
                  <line
                    x1={paddingLeft}
                    y1={yPos}
                    x2={paddingLeft + chartWidth}
                    y2={yPos}
                    stroke="rgba(255, 255, 255, 0.04)"
                    strokeWidth="1"
                    strokeDasharray="2 4"
                  />
                  <text
                    x={yAxisLabelX} 
                    y={yPos + 3} 
                    textAnchor="start"
                    fill="#8a8a8a"
                    fontSize="11"
                    fontFamily="Roboto Mono, monospace"
                    fontWeight="650"
                    style={{ userSelect: 'none' }}
                  >
                    {value}%
                  </text>
                </g>
              ))
            })()}

            {/* X-axis labels */}
            {xTicks.map((tick) => {
              return (
                <text
                  key={`x-label-${tick.key}`}
                  x={tick.x}
                  y={height - 6}
                  textAnchor={tick.textAnchor}
                  fill="#8a8a8a"
                  fontSize="11"
                  fontFamily="Roboto Mono, monospace"
                  fontWeight="650"
                >
                  {tick.label}
                </text>
              )
            })}
            
            <motion.path
              key={`area-${timeWindow}`} // Force re-mount on time window change for reliable animation direction
              d={areaPath}
              fill="url(#chartGradient)"
              stroke="none"
              initial={{ d: areaPath }} 
              animate={{ d: areaPath }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            />

            <motion.path
              key={`line-${timeWindow}`} // Force re-mount on time window change for reliable animation direction
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
              initial={{ d: linePath, pathLength: 0 }}
              animate={{ d: linePath, pathLength: 1 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            />

            {/* End Point Marker */}
            {data.length > 0 && (() => {
               const lastIdx = data.length - 1
               const { x, y } = getPointCoordinates(lastIdx)
               return (
                 <g>
                   <circle cx={x} cy={y} r="6" fill={color} fillOpacity="0.2" />
                   <circle cx={x} cy={y} r="3" fill={color} />
                 </g>
               )
            })()}

            {/* Hover Interaction Layer */}
            {/* Transparent overlay for mouse events */}
            <rect
              x={paddingLeft}
              y={paddingTop}
              width={chartWidth}
              height={chartHeight}
              fill="transparent"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const mouseX = e.clientX - rect.left
                // Find nearest point
                const index = Math.round(((mouseX - paddingLeft) / chartWidth) * (data.length - 1))
                if (index >= 0 && index < data.length) {
                  const { x, y } = getPointCoordinates(index)
                  setHoveredPoint({ x, y, value: data[index].value, time: formatTime(index, data, timeWindow) })
                }
              }}
              onMouseLeave={() => setHoveredPoint(null)}
            />

            {/* Hover Tooltip */}
            {hoveredPoint && (
              <g pointerEvents="none">
                {/* Vertical Crosshair */}
                <line
                  x1={hoveredPoint.x}
                  y1={paddingTop}
                  x2={hoveredPoint.x}
                  y2={paddingTop + chartHeight}
                  stroke={color}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.5"
                />

                {/* Point Highlight */}
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.y}
                  r="4"
                  fill="#141414"
                  stroke={color}
                  strokeWidth="2"
                />
                
                {/* Tooltip Box */}
                <g transform={`translate(${Math.min(Math.max(hoveredPoint.x - 40, 10), width - 90)}, ${paddingTop - 15})`}>
                  <rect
                    x="0"
                    y="0"
                    width="80"
                    height="40"
                    rx="4"
                    fill="#141414"
                    stroke="#333"
                    strokeWidth="1"
                  />
                  <text
                    x="40"
                    y="16"
                    textAnchor="middle"
                    fill="#888"
                    fontSize="10"
                    fontFamily="Roboto Mono, monospace"
                  >
                    {hoveredPoint.time}
                  </text>
                  <text
                    x="40"
                    y="30"
                    textAnchor="middle"
                    fill="#fff"
                    fontSize="12"
                    fontWeight="bold"
                    fontFamily="Roboto Mono, monospace"
                  >
                    {hoveredPoint.value.toFixed(1)}%
                  </text>
                </g>
              </g>
            )}
              </svg>
            </motion.div>
          )}
        </div>
      </div>

      {/* Footer Area */}
      <div className="chart-stat-strip">
        <div className="chart-stat">
          <span className="chart-stat-value">{formatCompactUsd(volume)}</span>
          <span className="chart-stat-label">Volume</span>
        </div>
        <div className="chart-stat">
          <span className="chart-stat-value" style={{ color }}>
            {isPositive ? '+' : '-'}{Math.abs(change).toFixed(1)}%
          </span>
          <span className="chart-stat-label">Change</span>
        </div>
        <div className="chart-stat">
          <span className="chart-stat-value">{buyTxs.toLocaleString()}</span>
          <span className="chart-stat-label">Buy txs</span>
        </div>
        <div className="chart-stat">
          <span className="chart-stat-value">{sellTxs.toLocaleString()}</span>
          <span className="chart-stat-label">Sell txs</span>
        </div>
      </div>
    </motion.div>
  )
}
export default ChartPanel
