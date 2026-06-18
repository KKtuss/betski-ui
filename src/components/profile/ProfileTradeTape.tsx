import { Send } from 'lucide-react'
import type { ProfileTrade } from '../../data/profileMock'
import { clamp } from '../../utils/math'
import { buildTradeSparkline } from '../../utils/profileChart'
import { formatUsd, formatUsdSigned } from '../../utils/profileFormat'
import {
  discoveryStyleThumbnailUrl,
  onProfileMarketThumbError,
  PROFILE_MARKET_THUMB_FALLBACK
} from '../../utils/profileThumbnails'
import './ProfileTradeTape.css'

export type ProfileHistoryRow = {
  pairId: string
  market: string
  outcome: 'YES' | 'NO'
  buyPrice: number
  sellPrice: number
  pnlUsd: number
  closedMs: number
}

type ProfileTradeTapeProps = {
  tapeView: 'activity' | 'history'
  onTapeViewChange: (view: 'activity' | 'history') => void
  windowedTrades: ProfileTrade[]
  historyRows: ProfileHistoryRow[]
  onShareTrade?: (trade: {
    title: string
    side: 'YES' | 'NO'
    entry: number
    exit: number
    pnlUsd: number
    pnlPct: number
    chart: { value: number; timestamp: number }[]
    thumbnailSrc?: string
    thumbnailFallbackSrc?: string
  }) => void
}

const ProfileTradeTape = ({
  tapeView,
  onTapeViewChange,
  windowedTrades,
  historyRows,
  onShareTrade
}: ProfileTradeTapeProps) => (
  <div className="profile-last-trades">
    <div className="profile-tape-head">
      <div className="profile-section-title">Activity</div>
      <div className="profile-tape-tabs" role="tablist" aria-label="Activity views">
        <button
          type="button"
          role="tab"
          aria-selected={tapeView === 'activity'}
          className={`profile-tape-tab ${tapeView === 'activity' ? 'active' : ''}`}
          onClick={() => onTapeViewChange('activity')}
        >
          Feed
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tapeView === 'history'}
          className={`profile-tape-tab ${tapeView === 'history' ? 'active' : ''}`}
          onClick={() => onTapeViewChange('history')}
        >
          History
        </button>
      </div>
    </div>
    <div className="profile-trades-list">
      {tapeView === 'activity' ? (
        <>
          <div className="profile-trade-row profile-trade-row--activity profile-trade-header">
            <div className="profile-trade-time">Time</div>
            <div className="profile-trade-thumb-spacer" aria-hidden />
            <div className="profile-trade-market">Market</div>
            <div className="profile-trade-price">Price</div>
            <div className="profile-trade-size">Size</div>
            <div className="profile-trade-type-col">Type</div>
          </div>
          {windowedTrades.map((t) => (
            <div key={t.id} className="profile-trade-row profile-trade-row--activity">
              <div className="profile-trade-time">{t.timestamp}</div>
              <div className="profile-trade-thumb-wrap">
                <img
                  className="profile-trade-thumb"
                  src={discoveryStyleThumbnailUrl(t.pairId)}
                  alt=""
                  loading="lazy"
                  onError={onProfileMarketThumbError}
                />
              </div>
              <div className="profile-trade-market-stack">
                <div className="profile-trade-market profile-trade-market--feed">{t.market}</div>
                <div className={`profile-trade-market-side ${t.outcome === 'YES' ? 'yes' : 'no'}`}>{t.outcome}</div>
              </div>
              <div className={`profile-trade-price ${t.side}`}>{t.price.toFixed(3)}</div>
              <div className="profile-trade-size">{formatUsd(t.sizeUsd)}</div>
              <div className={`profile-trade-type-col profile-trade-type ${t.side}`}>{t.side.toUpperCase()}</div>
            </div>
          ))}
        </>
      ) : (
        <>
          <div className="profile-trade-row profile-trade-row--history profile-trade-header">
            <div className="profile-trade-thumb-spacer" aria-hidden />
            <div className="profile-trade-market">Trade</div>
            <div className="profile-trade-outcome">Side</div>
            <div className="profile-trade-price">Buy</div>
            <div className="profile-trade-price">Sell</div>
            <div className="profile-trade-pnl">PnL</div>
            <div className="profile-trade-share" aria-hidden />
          </div>
          {historyRows.map((row, idx) => (
            <div key={`${row.market}-${row.closedMs}-${idx}`} className="profile-trade-row profile-trade-row--history">
              <div className="profile-trade-thumb-wrap">
                <img
                  className="profile-trade-thumb"
                  src={discoveryStyleThumbnailUrl(row.pairId)}
                  alt=""
                  loading="lazy"
                  onError={onProfileMarketThumbError}
                />
              </div>
              <div className="profile-trade-market">{row.market}</div>
              <div className={`profile-trade-outcome ${row.outcome === 'YES' ? 'yes' : 'no'}`}>{row.outcome}</div>
              <div className="profile-trade-price">{row.buyPrice.toFixed(3)}</div>
              <div className="profile-trade-price">{row.sellPrice.toFixed(3)}</div>
              <div className={`profile-trade-pnl ${row.pnlUsd >= 0 ? 'pos' : 'neg'}`}>{formatUsdSigned(row.pnlUsd)}</div>
              <div className="profile-trade-share">
                <button
                  type="button"
                  className="profile-trade-share-btn"
                  aria-label={`Share trade PnL: ${row.market}, ${formatUsdSigned(row.pnlUsd)}`}
                  title="Share trade PnL"
                  onClick={() => {
                    const { series } = buildTradeSparkline(row.buyPrice, row.sellPrice, 900_000 + idx * 97)
                    const now = Date.now()
                    const chart = series.map((v, i) => ({
                      value: clamp(v * 100, 1, 99),
                      timestamp: now - (series.length - 1 - i) * 60_000
                    }))
                    const pnlPct = row.buyPrice === 0 ? 0 : ((row.sellPrice - row.buyPrice) / row.buyPrice) * 100
                    onShareTrade?.({
                      title: row.market,
                      side: row.outcome,
                      entry: row.buyPrice,
                      exit: row.sellPrice,
                      pnlUsd: row.pnlUsd,
                      pnlPct,
                      chart,
                      thumbnailSrc: discoveryStyleThumbnailUrl(row.pairId),
                      thumbnailFallbackSrc: PROFILE_MARKET_THUMB_FALLBACK
                    })
                  }}
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  </div>
)

export default ProfileTradeTape
