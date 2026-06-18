import { useMemo, useState } from 'react'
import type { ProfileTimeWindow } from '../../data/profileConstants'
import type { ProfileTrade } from '../../data/profileMock'
import { seriesToPath } from '../../utils/profileChart'
import { formatUsdSigned } from '../../utils/profileFormat'
import './ProfileEquityChart.css'

type ProfileEquityChartProps = {
  trades: ProfileTrade[]
  profileTimeWindow: ProfileTimeWindow
}

const ProfileEquityChart = ({ trades, profileTimeWindow }: ProfileEquityChartProps) => {
  const [hoveredChartPoint, setHoveredChartPoint] = useState<{
    svgX: number; pctX: number; trading: number; lp: number; mc: number; label: string
  } | null>(null)

  const chart = useMemo(() => {
    const w = 320
    const h = 170
    const padding = 10
    const now     = Date.now()
    const DAY_MS  = 24 * 60 * 60 * 1000
    const HOUR_MS = 60 * 60 * 1000

    // All trades sorted oldest→newest for cumulative scan
    const allSorted = [...trades].sort((a, b) => a.timestampMs - b.timestampMs)

    const lpContrib  = (t: ProfileTrade) => Math.round(t.sizeUsd * 0.18 - 14 + Math.sin(t.price * 10) * 4)
    const mcContrib  = (t: ProfileTrade) => Math.round(t.sizeUsd * 0.06 - 6  + Math.cos(t.price * 12) * 3)

    // Returns cumulative [trading, lp, mc] for all trades with timestampMs ≤ upToMs
    const cumAt = (upToMs: number) => {
      let t = 0, l = 0, m = 0
      for (const trade of allSorted) {
        if (trade.timestampMs > upToMs) break
        t += trade.pnlUsd
        l += lpContrib(trade)
        m += mcContrib(trade)
      }
      return [t, l, m] as const
    }

    let tradingSeries: number[], lpSeries: number[], marketSeries: number[], labels: string[]

    if (profileTimeWindow === '1d') {
      // 25 points: now-24h → now, one per hour
      const pts = Array.from({ length: 25 }, (_, i) => now - (24 - i) * HOUR_MS)
      tradingSeries = []; lpSeries = []; marketSeries = []
      labels = pts.map(ms => {
        const d = new Date(ms)
        return `${String(d.getHours()).padStart(2, '0')}:00`
      })
      for (const ms of pts) {
        const [t, l, m] = cumAt(ms)
        tradingSeries.push(t); lpSeries.push(l); marketSeries.push(m)
      }

    } else if (profileTimeWindow === '7d') {
      // 8 points: now-7d → now, one per day
      const pts = Array.from({ length: 8 }, (_, i) => now - (7 - i) * DAY_MS)
      tradingSeries = []; lpSeries = []; marketSeries = []
      labels = pts.map(ms => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      for (const ms of pts) {
        const [t, l, m] = cumAt(ms)
        tradingSeries.push(t); lpSeries.push(l); marketSeries.push(m)
      }

    } else if (profileTimeWindow === '30d') {
      // 31 points: now-30d → now, one per day
      const pts = Array.from({ length: 31 }, (_, i) => now - (30 - i) * DAY_MS)
      tradingSeries = []; lpSeries = []; marketSeries = []
      labels = pts.map(ms => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      for (const ms of pts) {
        const [t, l, m] = cumAt(ms)
        tradingSeries.push(t); lpSeries.push(l); marketSeries.push(m)
      }

    } else {
      // MAX: one point per trade event (step function over all history)
      tradingSeries = [0]; lpSeries = [0]; marketSeries = [0]
      labels = ['Start']
      let rt = 0, rl = 0, rm = 0
      for (const trade of allSorted) {
        rt += trade.pnlUsd; rl += lpContrib(trade); rm += mcContrib(trade)
        tradingSeries.push(rt); lpSeries.push(rl); marketSeries.push(rm)
        labels.push(trade.timestamp)
      }
    }

    const all = [...tradingSeries, ...lpSeries, ...marketSeries]
    const min = Math.min(...all)
    const max = Math.max(...all)
    const pad = Math.max(20, (max - min) * 0.12)
    const minY = min - pad
    const maxY = max + pad
    const y0raw = padding + (1 - (0 - minY) / Math.max(1, maxY - minY)) * (h - padding * 2)

    return {
      width: w, height: h, padding, minY, maxY,
      y0: Math.max(padding, Math.min(h - padding, y0raw)),
      tradingSeries, lpSeries, marketSeries, labels,
      aPath: seriesToPath(marketSeries,  w, h, padding, minY, maxY),
      bPath: seriesToPath(lpSeries,      w, h, padding, minY, maxY),
      cPath: seriesToPath(tradingSeries, w, h, padding, minY, maxY)
    }
  }, [trades, profileTimeWindow])

  const toChartY = (value: number) => {
    const { minY, maxY, height, padding } = chart
    return padding + (1 - (value - minY) / Math.max(1, maxY - minY)) * (height - padding * 2)
  }

  return (
    <div className="profile-charts">
      <div className="profile-section-title">PnL</div>
      <div className="profile-chart-legend">
        <div className="profile-legend-item">
          <span className="profile-legend-swatch profile-legend-total" />
          <span className="profile-legend-label">Trading</span>
        </div>
        <div className="profile-legend-item">
          <span className="profile-legend-swatch profile-legend-buy" />
          <span className="profile-legend-label">LP Providing</span>
        </div>
        <div className="profile-legend-item">
          <span className="profile-legend-swatch profile-legend-sell" />
          <span className="profile-legend-label">Market Creating</span>
        </div>
      </div>
      <div className="profile-chart-surface">
        <svg
          className="profile-chart-svg"
          width={chart.width}
          height={chart.height}
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          preserveAspectRatio="none"
          style={{ cursor: 'crosshair' }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const mouseX = e.clientX - rect.left
            const pctX = mouseX / rect.width
            const svgMouseX = pctX * chart.width
            const n = chart.tradingSeries.length
            const innerW = chart.width - chart.padding * 2
            const idx = Math.max(0, Math.min(n - 1,
              Math.round(((svgMouseX - chart.padding) / innerW) * (n - 1))
            ))
            const svgX = chart.padding + (idx / Math.max(1, n - 1)) * innerW
            setHoveredChartPoint({
              svgX,
              pctX: svgX / chart.width,
              trading: chart.tradingSeries[idx],
              lp:      chart.lpSeries[idx],
              mc:      chart.marketSeries[idx],
              label:   chart.labels[idx]
            })
          }}
          onMouseLeave={() => setHoveredChartPoint(null)}
        >
          <defs>
            <filter id="profileGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Baseline */}
          <line x1="10" x2={chart.width - 10} y1={chart.y0} y2={chart.y0} stroke="rgba(255,255,255,0.10)" strokeWidth="1" />

          {/* Series */}
          <path d={chart.cPath} fill="none" stroke="rgba(255, 106, 0, 0.7)"  strokeWidth="2"    strokeLinecap="round" filter="url(#profileGlow)" />
          <path d={chart.bPath} fill="none" stroke="rgba(255, 94, 98, 0.65)" strokeWidth="1.5"  strokeLinecap="round" strokeDasharray="4 4" />
          <path d={chart.aPath} fill="none" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1.25" strokeLinecap="round" />

          {/* Hover crosshair + dots only — no text inside stretched SVG */}
          {hoveredChartPoint && (() => {
            const { svgX, trading, lp, mc } = hoveredChartPoint
            const tY = toChartY(trading)
            const lY = toChartY(lp)
            const mY = toChartY(mc)
            return (
              <g pointerEvents="none">
                <line
                  x1={svgX} x2={svgX}
                  y1={chart.padding} y2={chart.height - chart.padding}
                  stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeDasharray="4 3"
                />
                <circle cx={svgX} cy={tY} r="4.5" fill="#141414" stroke="rgba(255,106,0,0.95)"   strokeWidth="2" />
                <circle cx={svgX} cy={lY} r="3.5" fill="#141414" stroke="rgba(255,94,98,0.85)"   strokeWidth="1.5" />
                <circle cx={svgX} cy={mY} r="3"   fill="#141414" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
              </g>
            )
          })()}
        </svg>

        {/* HTML tooltip — outside the stretched SVG so text renders normally */}
        {hoveredChartPoint && (
          <div
            className="profile-chart-tooltip"
            style={{
              left: `${hoveredChartPoint.pctX * 100}%`,
              transform: hoveredChartPoint.pctX > 0.58
                ? 'translateX(calc(-100% - 8px))'
                : 'translateX(8px)'
            }}
          >
            <div className="pct-tip-label">{hoveredChartPoint.label}</div>
            <div className="pct-tip-row pct-tip-trading">T&nbsp;&nbsp;{formatUsdSigned(Math.round(hoveredChartPoint.trading))}</div>
            <div className="pct-tip-row pct-tip-lp">L&nbsp;&nbsp;{formatUsdSigned(Math.round(hoveredChartPoint.lp))}</div>
            <div className="pct-tip-row pct-tip-mc">M&nbsp;&nbsp;{formatUsdSigned(Math.round(hoveredChartPoint.mc))}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfileEquityChart
