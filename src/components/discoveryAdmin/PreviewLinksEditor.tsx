import { useState } from 'react'
import { Link2, Loader2, Plus, Trash2 } from 'lucide-react'
import type { BatchPreviewItem } from '../../types/discovery'
import { createPreviewItem } from '../../data/discoveryAdmin'
import { resolveContentLink } from '../../utils/resolveContentLink'
import { PLACEHOLDER_THUMB, proxiedThumbnailUrl } from '../../utils/thumbnailProxy'

type PreviewLinksEditorProps = {
  parentId: string
  previews: BatchPreviewItem[]
  onChange: (previews: BatchPreviewItem[]) => void
}

const PreviewLinksEditor = ({ parentId, previews, onChange }: PreviewLinksEditorProps) => {
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(() => new Set())
  const [draftUrls, setDraftUrls] = useState<Record<string, string>>({})

  const urlFor = (preview: BatchPreviewItem) =>
    draftUrls[preview.id] ?? preview.sourceUrl ?? ''

  const setDraftUrl = (previewId: string, url: string) => {
    setDraftUrls((prev) => ({ ...prev, [previewId]: url }))
  }

  const resolvePreview = async (preview: BatchPreviewItem) => {
    const url = (draftUrls[preview.id] ?? preview.sourceUrl ?? '').trim()
    if (!url) return

    setResolvingIds((prev) => new Set(prev).add(preview.id))
    try {
      const resolved = await resolveContentLink(url)
      onChange(
        previews.map((p) =>
          p.id === preview.id
            ? { ...p, sourceUrl: url, thumbnailUrl: resolved.thumbnailUrl || PLACEHOLDER_THUMB }
            : p
        )
      )
      setDraftUrls((prev) => {
        const next = { ...prev }
        delete next[preview.id]
        return next
      })
    } catch {
      onChange(
        previews.map((p) => (p.id === preview.id ? { ...p, sourceUrl: url } : p))
      )
    } finally {
      setResolvingIds((prev) => {
        const next = new Set(prev)
        next.delete(preview.id)
        return next
      })
    }
  }

  const updatePreviewUrl = (previewId: string, url: string) => {
    setDraftUrl(previewId, url)
    onChange(
      previews.map((p) => (p.id === previewId ? { ...p, sourceUrl: url } : p))
    )
  }

  const removePreview = (previewId: string) => {
    onChange(previews.filter((p) => p.id !== previewId))
    setDraftUrls((prev) => {
      const next = { ...prev }
      delete next[previewId]
      return next
    })
  }

  const addPreview = () => {
    onChange([...previews, createPreviewItem(parentId)])
  }

  return (
    <div className="discovery-admin-links">
      <div className="discovery-admin-links-header">
        <Link2 size={13} />
        <span>Content links</span>
        <span className="discovery-admin-links-hint">TikTok, Reels, or Shorts — resolves thumbnail on update</span>
      </div>
      {previews.length === 0 ? (
        <div className="discovery-admin-links-empty">No links yet.</div>
      ) : (
        <div className="discovery-admin-links-list">
          {previews.map((preview) => {
            const resolving = resolvingIds.has(preview.id)
            const url = urlFor(preview)
            const thumb = proxiedThumbnailUrl(preview.thumbnailUrl || PLACEHOLDER_THUMB)
            return (
              <div key={preview.id} className="discovery-admin-link-row">
                <div
                  className="discovery-admin-link-thumb"
                  style={{ backgroundImage: `url(${thumb})` }}
                />
                <div className="discovery-admin-link-fields">
                  <input
                    type="url"
                    className="discovery-admin-link-input"
                    placeholder="https://tiktok.com/… or instagram.com/reel/…"
                    value={url}
                    disabled={resolving}
                    onChange={(e) => updatePreviewUrl(preview.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void resolvePreview(preview)
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="discovery-admin-link-resolve"
                    disabled={resolving || !url.trim()}
                    onClick={() => void resolvePreview(preview)}
                  >
                    {resolving ? <Loader2 size={12} className="discovery-admin-spin" /> : 'Update thumbnail'}
                  </button>
                </div>
                <button
                  type="button"
                  className="discovery-admin-icon-btn"
                  title="Remove link"
                  disabled={resolving}
                  onClick={() => removePreview(preview.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
      <button type="button" className="discovery-admin-btn discovery-admin-add-link" onClick={addPreview}>
        <Plus size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
        Add link
      </button>
    </div>
  )
}

export default PreviewLinksEditor
