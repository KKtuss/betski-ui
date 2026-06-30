import { Bell } from 'lucide-react'
import {
  BUILTIN_NOTIFICATION_PROFILES,
  DEFAULT_ACTIVE_PROFILE_ID
} from '../data/notificationProfiles'
import {
  createCustomProfile,
  getAllProfiles,
  setActiveProfileId,
  setDemoAlertsEnabled,
  updateProfilePreferences
} from '../data/notificationStore'
import { fireDemoMessageNotification, fireDemoNotification } from '../utils/notificationDemo'
import { useNotifications } from '../hooks/useNotifications'
import {
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_CATEGORY_ORDER,
  type NotificationCategory
} from '../types/notifications'
import './NotificationSettingsSection.css'

const NotificationSettingsSection = () => {
  const state = useNotifications()
  const profiles = getAllProfiles()
  const activeProfile = profiles.find((p) => p.id === state.activeProfileId) ?? profiles[0]

  const togglePref = (category: NotificationCategory, channel: 'inApp' | 'push') => {
    const current = activeProfile.preferences[category]
    updateProfilePreferences(activeProfile.id, category, {
      [channel]: !current[channel]
    })
  }

  return (
    <section className="notif-settings" aria-labelledby="notif-settings-heading">
      <div className="notif-settings-header">
        <Bell size={16} strokeWidth={2} />
        <h3 id="notif-settings-heading">Push & alerts</h3>
      </div>
      <p className="notif-settings-desc">
        Choose a profile to control which events appear in-app and as browser push notifications.
      </p>

      <div className="notif-profile-grid">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            type="button"
            className={`notif-profile-card${state.activeProfileId === profile.id ? ' notif-profile-card--active' : ''}`}
            onClick={() => setActiveProfileId(profile.id)}
          >
            <span className="notif-profile-name">{profile.name}</span>
            <span className="notif-profile-desc">{profile.description}</span>
          </button>
        ))}
        <button
          type="button"
          className="notif-profile-card notif-profile-card--add"
          onClick={() => createCustomProfile('My alerts', 'Custom notification mix.', state.activeProfileId)}
        >
          <span className="notif-profile-name">+ Custom profile</span>
          <span className="notif-profile-desc">Clone current settings and tweak below.</span>
        </button>
      </div>

      <div className="notif-prefs-table">
        <div className="notif-prefs-row notif-prefs-row--head">
          <span>Category</span>
          <span>In-app</span>
          <span>Push</span>
        </div>
        {NOTIFICATION_CATEGORY_ORDER.map((category) => {
          const prefs = activeProfile.preferences[category]
          return (
            <div key={category} className="notif-prefs-row">
              <span className="notif-prefs-label">{NOTIFICATION_CATEGORY_LABELS[category]}</span>
              <label className="notif-toggle">
                <input
                  type="checkbox"
                  checked={prefs.inApp}
                  onChange={() => togglePref(category, 'inApp')}
                  aria-label={`${NOTIFICATION_CATEGORY_LABELS[category]} in-app`}
                />
                <span className="notif-toggle-track" />
              </label>
              <label className="notif-toggle">
                <input
                  type="checkbox"
                  checked={prefs.push}
                  onChange={() => togglePref(category, 'push')}
                  aria-label={`${NOTIFICATION_CATEGORY_LABELS[category]} push`}
                />
                <span className="notif-toggle-track" />
              </label>
            </div>
          )
        })}
      </div>

      <div className="notif-demo-panel">
        <div className="notif-demo-copy">
          <span className="notif-demo-title">Preview alerts</span>
          <span className="notif-demo-desc">
            In-app toasts appear while you browse. Browser push also fires when Push is enabled for a
            category.
          </span>
        </div>
        <div className="notif-demo-actions">
          <button type="button" className="notif-demo-btn" onClick={() => fireDemoMessageNotification()}>
            Send test alert
          </button>
          <button type="button" className="notif-demo-btn ghost" onClick={() => fireDemoNotification()}>
            Random event
          </button>
        </div>
        <label className="notif-demo-toggle">
          <input
            type="checkbox"
            checked={state.demoAlertsEnabled}
            onChange={(e) => setDemoAlertsEnabled(e.target.checked)}
          />
          <span className="notif-toggle-track" />
          <span className="notif-demo-toggle-label">
            Live demo alerts while browsing (~every 35s)
          </span>
        </label>
      </div>

      <p className="notif-settings-footnote">
        Presets: {BUILTIN_NOTIFICATION_PROFILES.map((p) => p.name).join(' · ')}. Active:{' '}
        <strong>{activeProfile.name}</strong>
        {activeProfile.id === DEFAULT_ACTIVE_PROFILE_ID ? ' (default)' : ''}.
      </p>
    </section>
  )
}

export default NotificationSettingsSection
