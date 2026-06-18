import type { MarketId } from '../../data/appStore'
import { formatUsd } from '../../utils/profileFormat'
import { discoveryStyleThumbnailUrl, onProfileMarketThumbError } from '../../utils/profileThumbnails'
import './ProfilePositionsList.css'

export type ProfilePosition = {
  id: string
  marketId?: MarketId
  market: string
  side: 'YES' | 'NO'
  fillPrice: number
  heldUsd: number
  pnlPct: number
}

type ProfilePositionsListProps = {
  positions: ProfilePosition[]
  onOpenMarket?: (marketId: MarketId) => void
}

const ProfilePositionsList = ({ positions, onOpenMarket }: ProfilePositionsListProps) => (
  <div className="profile-side-panel">
    <div className="profile-section-title">Positions</div>
    <div className="profile-positions">
      {positions.length === 0 ? (
        <div className="profile-positions-empty">No open positions</div>
      ) : (
        positions.map((p) => (
          <div
            key={p.id}
            className={`profile-position-row${p.marketId && onOpenMarket ? ' profile-position-row--clickable' : ''}`}
            role={p.marketId && onOpenMarket ? 'button' : undefined}
            tabIndex={p.marketId && onOpenMarket ? 0 : undefined}
            onClick={() => p.marketId && onOpenMarket?.(p.marketId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && p.marketId) onOpenMarket?.(p.marketId)
            }}
          >
            <div className="profile-position-top">
              <div className="profile-position-thumb-wrap">
                <img
                  className="profile-position-thumb"
                  src={discoveryStyleThumbnailUrl(p.market)}
                  alt=""
                  loading="lazy"
                  onError={onProfileMarketThumbError}
                />
              </div>
              <div className="profile-position-left">
                <div className="profile-position-title">{p.market}</div>
                <div className="profile-position-sub">{p.side}</div>
              </div>
              <div className={`profile-position-pnl ${p.pnlPct >= 0 ? 'pos' : 'neg'}`}>
                {p.pnlPct >= 0 ? '+' : ''}{p.pnlPct.toFixed(1)}%
              </div>
            </div>
            <div className="profile-position-bottom">
              <div className="profile-position-meta">
                <div className="profile-position-meta-item">
                  <span className="profile-position-meta-label">Fill</span>
                  <span className="profile-position-meta-value">{p.fillPrice.toFixed(3)}</span>
                </div>
                <div className="profile-position-meta-item">
                  <span className="profile-position-meta-label">Held</span>
                  <span className="profile-position-meta-value">{formatUsd(p.heldUsd)}</span>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
)

export default ProfilePositionsList
