import { ArrowLeft, RotateCcw } from 'lucide-react'

type AdminHeaderProps = {
  onBack?: () => void
  onOpenDiscovery: () => void
  onReset: () => void
  visibleMarkets: number
  visibleWagers: number
}

const AdminHeader = ({
  onBack,
  onOpenDiscovery,
  onReset,
  visibleMarkets,
  visibleWagers
}: AdminHeaderProps) => (
  <div className="discovery-admin-header">
    <div>
      <div className="discovery-admin-title">Discovery admin</div>
      <div className="discovery-admin-subtitle">
        Edit trend bundles and wagers shown on the discovery page ({visibleMarkets} markets, {visibleWagers} wagers visible)
      </div>
    </div>
    <div className="discovery-admin-actions">
      {onBack && (
        <button type="button" className="discovery-admin-btn" onClick={onBack}>
          <ArrowLeft size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
          Back
        </button>
      )}
      <button type="button" className="discovery-admin-btn" onClick={onOpenDiscovery}>
        Open discovery
      </button>
      <button type="button" className="discovery-admin-btn discovery-admin-btn--danger" onClick={onReset}>
        <RotateCcw size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
        Reset defaults
      </button>
    </div>
  </div>
)

export default AdminHeader
