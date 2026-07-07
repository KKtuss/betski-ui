import { useMemo, useState } from 'react'
import { PROFILE_TIME_WINDOWS, type ProfileTimeWindow } from '../../data/profileConstants'
import type { ProfileTrade } from '../../data/profileMock'
import { ChartContainer } from '../../charts/core/ChartContainer'
import { ChartCrosshair } from '../../charts/core/ChartCrosshair'
import { ChartLegend } from '../../charts/core/ChartLegend'
import { ChartStateView } from '../../charts/core/ChartStateView'
import { ChartSvg } from '../../charts/core/ChartSvg'
import { ChartTooltip, ChartTooltipRow } from '../../charts/core/ChartTooltip'
import { buildProfileEquityChartData, createProfileEquityProvider } from '../../charts/data/providers/profileEquityProvider'
import { chartTheme } from '../../charts/theme/chartTheme'
import { formatUsdSigned } from '../../utils/profileFormat'
import './ProfileEquityChart.css'

type ProfileEquityChartProps = {
  trades: ProfileTrade[]
  profileTimeWindow: ProfileTimeWindow
  onProfileTimeWindowChange?: (window: ProfileTimeWindow) => void
}

const ProfileEquityChart = ({
  trades,
  profileTimeWindow,
  onProfileTimeWindowChange
}: ProfileEquityChartProps) => {
  const [hoveredChartPoint, setHoveredChartPoint] = useState<{
    svgX: number
    pctX: number
    trading: number
    lp: number
    mc: number
    label: string
  } | null>(null)

  const provider = useMemo(
    () => createProfileEquityProvider(trades, profileTimeWindow),
    [trades, profileTimeWindow]
  )
  const state = provider()

  const legendItems = [
    { id: 'trading', label: 'Trading', color: chartTheme.series.trading },
    { id: 'lp', label: 'LP Providing', color: chartTheme.series.lp, dashed: true },
    { id: 'mc', label: 'Market Creating', color: chartTheme.series.marketCreating }
  ]

  return (
    <div className="profile-charts">
      <div className="profile-chart-head">
        <div className="profile-chart-head-top">
          <div className="profile-section-title">PNL</div>
          {onProfileTimeWindowChange && (
            <div className="time-selector profile-chart-time-selector" role="tablist" aria-label="Chart time window">
              {PROFILE_TIME_WINDOWS.map(({ id, label }) => {
                const active = profileTimeWindow === id
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`time-btn ${active ? 'active' : ''}`}
                    onClick={() => onProfileTimeWindowChange(id)}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <ChartLegend items={legendItems} className="profile-chart-legend" />
      </div>
      <div className="profile-chart-surface">
        <ChartStateView state={state} emptyLabel="No PnL data yet">
          {() => (
            <ChartContainer>
              {(viewport) => {
                const chart = buildProfileEquityChartData(
                  trades,
                  profileTimeWindow,
                  Math.max(280, viewport.width),
                  Math.max(160, viewport.height)
                )
                const toChartY = (value: number) => {
                  const { minY, maxY, height, padding } = chart
                  return padding + (1 - (value - minY) / Math.max(1, maxY - minY)) * (height - padding * 2)
                }

                return (
                  <>
                    <ChartSvg
                      viewportWidth={chart.width}
                      viewportHeight={chart.height}
                      preserveStretch
                      className="profile-chart-svg"
                      style={{ cursor: 'crosshair', width: '100%', height: '100%' }}
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const mouseX = e.clientX - rect.left
                        const pctX = mouseX / rect.width
                        const svgMouseX = pctX * chart.width
                        const n = chart.tradingSeries.length
                        const innerW = chart.width - chart.padding * 2
                        const idx = Math.max(
                          0,
                          Math.min(n - 1, Math.round(((svgMouseX - chart.padding) / innerW) * (n - 1)))
                        )
                        const svgX = chart.padding + (idx / Math.max(1, n - 1)) * innerW
                        setHoveredChartPoint({
                          svgX,
                          pctX: svgX / chart.width,
                          trading: chart.tradingSeries[idx],
                          lp: chart.lpSeries[idx],
                          mc: chart.marketSeries[idx],
                          label: chart.labels[idx]
                        })
                      }}
                      onMouseLeave={() => setHoveredChartPoint(null)}
                    >
                      <line
                        x1={chart.padding}
                        x2={chart.width - chart.padding}
                        y1={chart.y0}
                        y2={chart.y0}
                        stroke={chartTheme.grid}
                        strokeWidth="1"
                      />
                      <path
                        d={chart.paths.marketCreating}
                        fill="none"
                        stroke={chartTheme.series.marketCreating}
                        strokeWidth="1.25"
                        strokeLinecap="round"
                      />
                      <path
                        d={chart.paths.lp}
                        fill="none"
                        stroke={chartTheme.series.lp}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeDasharray="4 4"
                      />
                      <path
                        d={chart.paths.trading}
                        fill="none"
                        stroke={chartTheme.series.trading}
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      {hoveredChartPoint && (
                        <ChartCrosshair
                          viewport={{
                            ...viewport,
                            width: chart.width,
                            height: chart.height,
                            paddingLeft: chart.padding,
                            paddingRight: chart.padding,
                            paddingTop: chart.padding,
                            paddingBottom: chart.padding,
                            plotWidth: chart.width - chart.padding * 2,
                            plotHeight: chart.height - chart.padding * 2
                          }}
                          x={hoveredChartPoint.svgX}
                          y={toChartY(hoveredChartPoint.trading)}
                          color={chartTheme.crosshair}
                        />
                      )}
                    </ChartSvg>
                    {hoveredChartPoint && (
                      <ChartTooltip
                        left={`${hoveredChartPoint.pctX * 100}%`}
                        transform={
                          hoveredChartPoint.pctX > 0.58
                            ? 'translateX(calc(-100% - 8px))'
                            : 'translateX(8px)'
                        }
                        className="profile-chart-tooltip"
                      >
                        <div className="pct-tip-label">{hoveredChartPoint.label}</div>
                        <ChartTooltipRow
                          label="T"
                          value={formatUsdSigned(Math.round(hoveredChartPoint.trading))}
                        />
                        <ChartTooltipRow label="L" value={formatUsdSigned(Math.round(hoveredChartPoint.lp))} />
                        <ChartTooltipRow label="M" value={formatUsdSigned(Math.round(hoveredChartPoint.mc))} />
                      </ChartTooltip>
                    )}
                  </>
                )
              }}
            </ChartContainer>
          )}
        </ChartStateView>
      </div>
    </div>
  )
}

export default ProfileEquityChart
