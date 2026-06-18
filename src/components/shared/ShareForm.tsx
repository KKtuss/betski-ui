import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'

const ShareForm = ({ onBack, shareTargets, onShareToChat }: { onBack: () => void; shareTargets?: { id: string; title: string; kind: 'dm' | 'group'; avatar?: string; members?: string[] }[]; onShareToChat?: (chatId: string) => void }) => {
  const targets = shareTargets ?? []
  const [selectedChatId, setSelectedChatId] = useState<string | null>(targets[0]?.id ?? null)

  useEffect(() => {
    if (!selectedChatId && targets[0]?.id) setSelectedChatId(targets[0].id)
  }, [targets, selectedChatId])

  return (
    <div style={{ width: '100%', height: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', boxSizing: 'border-box' }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px' }}>
        <button
          onClick={onBack}
          style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#d0d0d0', cursor: 'pointer', padding: '4px', display: 'flex' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ fontWeight: 900, fontSize: '16px', letterSpacing: '0.5px', color: '#fff' }}>
          Share Market
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', marginBottom: '8px', fontFamily: 'Roboto Mono, monospace', paddingLeft: '4px' }}>
          SEND TO
        </div>
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' }}>
          {targets.map(t => {
            const avatarSrc = t.kind === 'group' ? t.members?.[0] : t.avatar
            const selected = selectedChatId === t.id
            const isMark = t.title === 'MarkDiTob'
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedChatId(t.id)}
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr',
                  gap: '12px',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: selected ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'visible', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {avatarSrc ? <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '10px' }} /> : (
                    <div style={{ width: '100%', height: '100%', background: '#333', borderRadius: '10px' }} />
                  )}
                  {isMark && (
                    <div style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: '14px',
                      height: '14px',
                      background: '#2DD56E',
                      borderRadius: '50%',
                      border: '2px solid #000'
                    }} />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.kind === 'group' ? 'Group' : 'Direct Message'}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            flex: 1,
            height: '48px',
            borderRadius: '12px',
            border: 'none',
            background: 'rgba(255,255,255,0.06)',
            color: '#aaa',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Roboto Mono, monospace'
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!selectedChatId}
          onClick={() => {
            if (!selectedChatId) return
            onShareToChat?.(selectedChatId)
            onBack()
          }}
          style={{
            flex: 1,
            height: '48px',
            borderRadius: '12px',
            border: 'none',
            background: '#fff',
            color: '#000',
            fontWeight: 800,
            cursor: !selectedChatId ? 'not-allowed' : 'pointer',
            opacity: !selectedChatId ? 0.5 : 1,
            fontFamily: 'Roboto Mono, monospace',
            boxShadow: '0 4px 12px rgba(255,255,255,0.2)'
          }}
        >
          Share
        </button>
      </div>
    </div>
  )
}

export default ShareForm
