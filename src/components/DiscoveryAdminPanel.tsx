import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import type { Batch, Wager } from '../types/discovery'
import type { BatchPreviewItem } from '../types/discovery'
import { moveItem } from '../utils/moveItem'
import {
  loadDiscoveryCatalog,
  resetDiscoveryCatalog,
  saveDiscoveryCatalog,
  seedDiscoveryCatalog,
  subscribeDiscoveryCatalog,
  type DiscoveryCatalog
} from '../data/discoveryStore'
import AdminHeader from './discoveryAdmin/AdminHeader'
import AdminSectionTabs from './discoveryAdmin/AdminSectionTabs'
import PreviewLinksEditor from './discoveryAdmin/PreviewLinksEditor'
import './DiscoveryAdminPanel.css'

type AdminTab = 'markets' | 'wagers'

type DiscoveryAdminPanelProps = {
  onBack?: () => void
}

const DiscoveryAdminPanel = ({ onBack }: DiscoveryAdminPanelProps) => {
  const [tab, setTab] = useState<AdminTab>('markets')
  const [catalog, setCatalog] = useState<DiscoveryCatalog>(() => loadDiscoveryCatalog())
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    return subscribeDiscoveryCatalog(() => setCatalog(loadDiscoveryCatalog()))
  }, [])

  const persist = useCallback((next: DiscoveryCatalog) => {
    setCatalog(next)
    saveDiscoveryCatalog(next)
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1200)
  }, [])

  const updateBatch = (index: number, patch: Partial<Batch>) => {
    const batches = catalog.batches.map((b, i) => {
      if (i !== index) return b
      const merged = { ...b, ...patch }
      if (patch.yesOdds != null) {
        merged.noOdds = 100 - patch.yesOdds
      }
      return merged
    })
    persist({ ...catalog, batches })
  }

  const updateWager = (index: number, patch: Partial<Wager>) => {
    const wagers = catalog.wagers.map((w, i) => (i === index ? { ...w, ...patch } : w))
    persist({ ...catalog, wagers })
  }

  const updateBatchPreviews = (index: number, previews: BatchPreviewItem[]) => {
    updateBatch(index, { previews })
  }

  const updateWagerPreviews = (index: number, previews: BatchPreviewItem[]) => {
    updateWager(index, { previews })
  }

  const toggleBatchHidden = (index: number) => {
    const batch = catalog.batches[index]
    updateBatch(index, { hidden: !batch.hidden })
  }

  const toggleWagerHidden = (index: number) => {
    const wager = catalog.wagers[index]
    updateWager(index, { hidden: !wager.hidden })
  }

  const removeBatch = (index: number) => {
    persist({ ...catalog, batches: catalog.batches.filter((_, i) => i !== index) })
  }

  const removeWager = (index: number) => {
    persist({ ...catalog, wagers: catalog.wagers.filter((_, i) => i !== index) })
  }

  const addBatch = () => {
    const template = catalog.batches[catalog.batches.length - 1]
    if (!template) return
    const id = `batch-admin-${Date.now()}`
    persist({
      ...catalog,
      batches: [
        ...catalog.batches,
        {
          ...template,
          id,
          name: 'New trend bundle',
          hidden: false
        }
      ]
    })
  }

  const addWager = () => {
    const seededWagers = catalog.wagers.length === 0 ? seedDiscoveryCatalog().wagers : catalog.wagers
    const template = seededWagers[seededWagers.length - 1]
    if (!template) return
    const id = `wager-admin-${Date.now()}`
    persist({
      ...catalog,
      wagers: [
        ...catalog.wagers,
        {
          ...template,
          id,
          name: 'New wager',
          question: 'New wager',
          hidden: false,
          createdAtTimestamp: Date.now()
        }
      ]
    })
  }

  const handleReset = () => {
    if (!window.confirm('Reset discovery catalog to defaults? This cannot be undone.')) return
    setCatalog(resetDiscoveryCatalog())
  }

  const openDiscovery = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('admin')
    window.location.href = url.pathname + (url.search ? url.search : '')
  }

  const visibleMarkets = catalog.batches.filter((b) => !b.hidden).length
  const visibleWagers = catalog.wagers.filter((w) => !w.hidden).length

  return (
    <div className="discovery-admin">
      <AdminHeader
        onBack={onBack}
        onOpenDiscovery={openDiscovery}
        onReset={handleReset}
        visibleMarkets={visibleMarkets}
        visibleWagers={visibleWagers}
      />

      {savedFlash && <div className="discovery-admin-status">Saved — discovery page updates automatically.</div>}

      <AdminSectionTabs
        tab={tab}
        batchCount={catalog.batches.length}
        wagerCount={catalog.wagers.length}
        onTabChange={setTab}
      />

      <div className="discovery-admin-body">
        {tab === 'markets' ? (
          <>
            <div className="discovery-admin-actions" style={{ marginBottom: 12 }}>
              <button type="button" className="discovery-admin-btn discovery-admin-btn--primary" onClick={addBatch}>
                <Plus size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                Add trend bundle
              </button>
            </div>
            {catalog.batches.length === 0 ? (
              <div className="discovery-admin-empty">No trend bundles. Add one or reset to defaults.</div>
            ) : (
              <div className="discovery-admin-list">
                {catalog.batches.map((batch, index) => (
                  <div key={batch.id} className={`discovery-admin-row ${batch.hidden ? 'is-hidden' : ''}`}>
                    <div className="discovery-admin-row-controls">
                      <button
                        type="button"
                        className={`discovery-admin-icon-btn ${batch.hidden ? '' : 'active'}`}
                        title={batch.hidden ? 'Show on discovery' : 'Hide from discovery'}
                        onClick={() => toggleBatchHidden(index)}
                      >
                        {batch.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        className="discovery-admin-icon-btn"
                        title="Move up"
                        disabled={index === 0}
                        onClick={() => persist({ ...catalog, batches: moveItem(catalog.batches, index, -1) })}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        className="discovery-admin-icon-btn"
                        title="Move down"
                        disabled={index === catalog.batches.length - 1}
                        onClick={() => persist({ ...catalog, batches: moveItem(catalog.batches, index, 1) })}
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        type="button"
                        className="discovery-admin-icon-btn"
                        title="Remove"
                        onClick={() => removeBatch(index)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="discovery-admin-fields">
                      <div className="discovery-admin-field discovery-admin-field--wide">
                        <label htmlFor={`batch-name-${batch.id}`}>Name</label>
                        <input
                          id={`batch-name-${batch.id}`}
                          value={batch.name}
                          onChange={(e) => updateBatch(index, { name: e.target.value })}
                        />
                      </div>
                      <div className="discovery-admin-field">
                        <label htmlFor={`batch-yes-${batch.id}`}>YES odds (¢)</label>
                        <input
                          id={`batch-yes-${batch.id}`}
                          type="number"
                          min={1}
                          max={99}
                          value={batch.yesOdds}
                          onChange={(e) => updateBatch(index, { yesOdds: Number(e.target.value) })}
                        />
                      </div>
                      <div className="discovery-admin-field">
                        <label htmlFor={`batch-vol-${batch.id}`}>Total volume ($)</label>
                        <input
                          id={`batch-vol-${batch.id}`}
                          type="number"
                          min={0}
                          value={batch.volume}
                          onChange={(e) => updateBatch(index, { volume: Number(e.target.value) })}
                        />
                      </div>
                      <div className="discovery-admin-field">
                        <label htmlFor={`batch-vol24-${batch.id}`}>24h volume ($)</label>
                        <input
                          id={`batch-vol24-${batch.id}`}
                          type="number"
                          min={0}
                          value={batch.volume24h}
                          onChange={(e) => updateBatch(index, { volume24h: Number(e.target.value) })}
                        />
                      </div>
                      <div className="discovery-admin-field">
                        <label htmlFor={`batch-holders-${batch.id}`}>Holders</label>
                        <input
                          id={`batch-holders-${batch.id}`}
                          type="number"
                          min={0}
                          value={batch.holders}
                          onChange={(e) => updateBatch(index, { holders: Number(e.target.value) })}
                        />
                      </div>
                      <div className="discovery-admin-field">
                        <label htmlFor={`batch-time-${batch.id}`}>Time left label</label>
                        <input
                          id={`batch-time-${batch.id}`}
                          value={batch.timeLeftLabel}
                          onChange={(e) => updateBatch(index, { timeLeftLabel: e.target.value })}
                        />
                      </div>
                      <div className="discovery-admin-meta">ID: {batch.id}</div>
                      <PreviewLinksEditor
                        parentId={batch.id}
                        previews={batch.previews}
                        onChange={(previews) => updateBatchPreviews(index, previews)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="discovery-admin-actions" style={{ marginBottom: 12 }}>
              <button type="button" className="discovery-admin-btn discovery-admin-btn--primary" onClick={addWager}>
                <Plus size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                Add wager
              </button>
            </div>
            {catalog.wagers.length === 0 ? (
              <div className="discovery-admin-empty">No wagers. Add one or reset to defaults.</div>
            ) : (
              <div className="discovery-admin-list">
                {catalog.wagers.map((wager, index) => (
                  <div key={wager.id} className={`discovery-admin-row ${wager.hidden ? 'is-hidden' : ''}`}>
                    <div className="discovery-admin-row-controls">
                      <button
                        type="button"
                        className={`discovery-admin-icon-btn ${wager.hidden ? '' : 'active'}`}
                        title={wager.hidden ? 'Show on discovery' : 'Hide from discovery'}
                        onClick={() => toggleWagerHidden(index)}
                      >
                        {wager.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        className="discovery-admin-icon-btn"
                        title="Move up"
                        disabled={index === 0}
                        onClick={() => persist({ ...catalog, wagers: moveItem(catalog.wagers, index, -1) })}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        className="discovery-admin-icon-btn"
                        title="Move down"
                        disabled={index === catalog.wagers.length - 1}
                        onClick={() => persist({ ...catalog, wagers: moveItem(catalog.wagers, index, 1) })}
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        type="button"
                        className="discovery-admin-icon-btn"
                        title="Remove"
                        onClick={() => removeWager(index)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="discovery-admin-fields">
                      <div className="discovery-admin-field discovery-admin-field--wide">
                        <label htmlFor={`wager-name-${wager.id}`}>Title / question</label>
                        <input
                          id={`wager-name-${wager.id}`}
                          value={wager.name}
                          onChange={(e) => updateWager(index, { name: e.target.value, question: e.target.value })}
                        />
                      </div>
                      <div className="discovery-admin-field">
                        <label htmlFor={`wager-pool-${wager.id}`}>Pool ($)</label>
                        <input
                          id={`wager-pool-${wager.id}`}
                          type="number"
                          min={0}
                          value={wager.pool}
                          onChange={(e) => updateWager(index, { pool: Number(e.target.value) })}
                        />
                      </div>
                      <div className="discovery-admin-field">
                        <label htmlFor={`wager-threshold-${wager.id}`}>Promotion threshold ($)</label>
                        <input
                          id={`wager-threshold-${wager.id}`}
                          type="number"
                          min={0}
                          value={wager.promotionThreshold}
                          onChange={(e) => updateWager(index, { promotionThreshold: Number(e.target.value) })}
                        />
                      </div>
                      <div className="discovery-admin-field">
                        <label htmlFor={`wager-creator-${wager.id}`}>Creator</label>
                        <input
                          id={`wager-creator-${wager.id}`}
                          value={wager.creatorHandle}
                          onChange={(e) => updateWager(index, { creatorHandle: e.target.value })}
                        />
                      </div>
                      <div className="discovery-admin-field">
                        <label htmlFor={`wager-time-${wager.id}`}>Time left label</label>
                        <input
                          id={`wager-time-${wager.id}`}
                          value={wager.timeLeftLabel}
                          onChange={(e) => updateWager(index, { timeLeftLabel: e.target.value })}
                        />
                      </div>
                      <div className="discovery-admin-meta">
                        ID: {wager.id} · {Math.round((wager.pool / Math.max(1, wager.promotionThreshold)) * 100)}% to promotion
                      </div>
                      <PreviewLinksEditor
                        parentId={wager.id}
                        previews={wager.previews}
                        onChange={(previews) => updateWagerPreviews(index, previews)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default DiscoveryAdminPanel
