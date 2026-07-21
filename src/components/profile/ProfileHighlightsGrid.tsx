import { getDisplayThumbnailUrl } from '../../utils/thumbnailProxy'
import { buildTradeSparkline } from '../../utils/profileChart'
import { formatUsdSigned } from '../../utils/profileFormat'
import {
  onProfileMarketThumbError,
  PROFILE_MARKET_THUMB_FALLBACK
} from '../../utils/profileThumbnails'
import { Sparkline } from '../shared/Sparkline'
import './ProfileHighlightsGrid.css'

export type ProfileHighlightRow = {
  displayTitle: string
  thumbnailUrl?: string
  buyPrice: number
  sellPrice: number
  pnlUsd: number
}

type ProfileHighlightsGridProps = {
  rows: ProfileHighlightRow[]
}

const formatOdds = (price: number) => `${(price * 100).toFixed(1)}¢`

const ProfileHighlightsGrid = ({ rows }: ProfileHighlightsGridProps) => (
  <div className="profile-highlights-panel">
    {rows.length === 0 ? (
      <div className="profile-highlights-empty">No closed trades yet</div>
    ) : (
      <div className="profile-highlights-grid" role="list">
        {rows.map((row, idx) => {
        const { series, buyIdx, sellIdx } = buildTradeSparkline(row.buyPrice, row.sellPrice, 42011 + idx * 997)
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
              src={getDisplayThumbnailUrl(row.thumbnailUrl ?? PROFILE_MARKET_THUMB_FALLBACK)}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={onProfileMarketThumbError}
            />
            <div className="profile-highlight-overlay" aria-hidden />

            <span className="profile-highlight-rank">{idx + 1}</span>

            <div className="profile-highlight-body">
              <h3 className="profile-highlight-market">{row.displayTitle}</h3>

              <div className="profile-highlight-prices">
                <div className="profile-highlight-price-col">
                  <span className="profile-highlight-price-label">Entry</span>
                  <span className="profile-highlight-price-value">{formatOdds(row.buyPrice)}</span>
                </div>
                <div className="profile-highlight-price-col profile-highlight-price-col--exit">
                  <span className="profile-highlight-price-label">Exit</span>
                  <span className="profile-highlight-price-value">{formatOdds(row.sellPrice)}</span>
                </div>
              </div>

              <span className={`profile-highlight-pnl ${isPositive ? 'pos' : 'neg'}`}>
                {formatUsdSigned(row.pnlUsd)}
              </span>

              <div className="profile-highlight-chart">
                <Sparkline
                  series={series}
                  buyIdx={buyIdx}
                  sellIdx={sellIdx}
                  width={96}
                  height={28}
                  padX={8}
                  padY={3}
                  isPositive={isPositive}
                  gradientId={gradientId}
                />
              </div>
            </div>
          </article>
        )
      })}
      </div>
    )}
  </div>
)

export default ProfileHighlightsGrid
