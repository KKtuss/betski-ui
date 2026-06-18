type AdminTab = 'markets' | 'wagers'

type AdminSectionTabsProps = {
  tab: AdminTab
  batchCount: number
  wagerCount: number
  onTabChange: (tab: AdminTab) => void
}

const AdminSectionTabs = ({
  tab,
  batchCount,
  wagerCount,
  onTabChange
}: AdminSectionTabsProps) => (
  <div className="discovery-admin-tabs">
    <button
      type="button"
      className={`discovery-admin-tab ${tab === 'markets' ? 'active' : ''}`}
      onClick={() => onTabChange('markets')}
    >
      Trend bundles ({batchCount})
    </button>
    <button
      type="button"
      className={`discovery-admin-tab ${tab === 'wagers' ? 'active' : ''}`}
      onClick={() => onTabChange('wagers')}
    >
      Wagers ({wagerCount})
    </button>
  </div>
)

export default AdminSectionTabs
