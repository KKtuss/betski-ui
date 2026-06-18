import { buildTradeSparkline } from '../../utils/profileChart'
import { formatUsdSigned } from '../../utils/profileFormat'
import { Sparkline } from '../shared/Sparkline'
import './ProfileHighlightsGrid.css'

export type ProfileHighlightRow = {
  displayTitle: string
  buyPrice: number
  sellPrice: number
  pnlUsd: number
}

type ProfileHighlightsGridProps = {
  rows: ProfileHighlightRow[]
  thumbSeeds: number[]
}

const highlightThumbUrl = (seed: number) => `https://picsum.photos/seed/${seed}/360/640`

const ProfileHighlightsGrid = ({ rows, thumbSeeds }: ProfileHighlightsGridProps) => (
  <div className="profile-highlights-panel">
    <div className="profile-highlights-grid" role="list">
      {rows.map((row, idx) => {
        const { series, buyIdx, sellIdx } = buildTradeSparkline(row.buyPrice, row.sellPrice, 42011 + idx * 997)
        const sw = 112
        const sh = 52
        const padX = 12
        const padY = 4
        const isPositive = row.pnlUsd >= 0
        const gradientId = `highlightSparkGrad-${idx}-${isPositive ? 'pos' : 'neg'}`
        return (
          <article
            key={`${row.displayTitle}-${idx}`}
            className="profile-highlight-card"
            role="listitem"
            aria-label={`Highlight ${idx + 1}: ${row.displayTitle}, ${formatUsdSigned(row.pnlUsd)}`}
          >
            <img
              className="profile-highlight-bg"
              src={highlightThumbUrl(thumbSeeds[idx] ?? idx + 1)}
              alt=""
            />
            <div className="profile-highlight-overlay" aria-hidden />
            <h3 className="profile-highlight-market">
              <span className="profile-highlight-rank">{idx + 1}</span>
              <span className="profile-highlight-rank-sep" aria-hidden>
                -
              </span>
              <span className="profile-highlight-market-text">{row.displayTitle}</span>
            </h3>
            <div className="profile-highlight-footer">
              <div className={`profile-highlight-pnl ${row.pnlUsd >= 0 ? 'pos' : 'neg'}`}>
                {formatUsdSigned(row.pnlUsd)}
              </div>
              <div className="profile-highlight-chart">
                <Sparkline
                  series={series}
                  buyIdx={buyIdx}
                  sellIdx={sellIdx}
                  width={sw}
                  height={sh}
                  padX={padX}
                  padY={padY}
                  isPositive={isPositive}
                  gradientId={gradientId}
                />
              </div>
            </div>
          </article>
        )
      })}
    </div>
  </div>
)

export default ProfileHighlightsGrid
