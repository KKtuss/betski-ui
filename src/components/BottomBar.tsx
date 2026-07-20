import { motion } from 'framer-motion'
import { Home, MessageSquare, User } from 'lucide-react'
import type { SVGProps } from 'react'
import './BottomBar.css'

interface BottomBarProps {
  onTabClick?: (tabId: string) => void
  currentTab: string
  hasUnreadMessages?: boolean
}

const SUNSET_STROKE = 'url(#betski-tab-sunset)'

/**
 * Discovery tab icon — three wide rectangle outlines stacked vertically.
 * Reads as a "lobby / list" of markets, matching the Discovery page layout.
 */
const StackedRows = ({
  size = 24,
  stroke = 'currentColor',
  ...rest
}: { size?: number | string; stroke?: string } & SVGProps<SVGSVGElement>) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    <rect x="3" y="3" width="18" height="4" rx="1" />
    <rect x="3" y="10" width="18" height="4" rx="1" />
    <rect x="3" y="17" width="18" height="4" rx="1" />
  </svg>
)

type TabIconComponent = typeof Home | typeof StackedRows | typeof MessageSquare | typeof User

const TabIcon = ({
  icon: Icon,
  active,
  size = 36,
}: {
  icon: TabIconComponent
  active: boolean
  size?: number
}) => {
  if (Icon === StackedRows) {
    return (
      <StackedRows
        size={size}
        stroke={active ? SUNSET_STROKE : 'currentColor'}
        strokeWidth={2.35}
      />
    )
  }
  return (
    <Icon
      size={size}
      strokeWidth={2.35}
      color={active ? SUNSET_STROKE : undefined}
    />
  )
}

const BottomBar = ({ onTabClick, currentTab, hasUnreadMessages }: BottomBarProps) => {
  const handleTabClick = (tabName: string) => {
    console.log('Tab clicked:', tabName)
    onTabClick?.(tabName)
  }

  const tabs = [
    { id: 'tab1', icon: Home },
    { id: 'tab2', icon: StackedRows },
    { id: 'tab3', icon: MessageSquare },
    { id: 'tab4', icon: User },
  ]

  return (
    <motion.div 
      className="bottom-bar"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.4 }}
    >
      <svg aria-hidden className="bottom-bar-sprite" width="0" height="0" focusable="false">
        <defs>
          <linearGradient id="betski-tab-sunset" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ee0979" />
            <stop offset="100%" stopColor="#ff6a00" />
          </linearGradient>
        </defs>
      </svg>
      {tabs.slice(0, 2).map((tab, index) => (
        <motion.button
          key={tab.id}
          className={`bottom-tab ${currentTab === tab.id ? 'active' : ''}`}
          onClick={() => handleTabClick(tab.id)}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
        >
          <TabIcon icon={tab.icon} active={currentTab === tab.id} />
        </motion.button>
      ))}
      
      <motion.div 
        className={`bottom-bar-center ${currentTab === 'center' ? 'active' : ''}`}
        onClick={() => handleTabClick('center')}
        whileTap={{ scale: 0.98 }}
        style={{ cursor: 'pointer' }}
      >
        <div className="betski-logo-gradient" />
        {currentTab === 'center' && (
          <motion.span
            className="bottom-bar-center-plus"
            aria-hidden="true"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 24 }}
          />
        )}
      </motion.div>

      {tabs.slice(2, 4).map((tab, index) => (
        <motion.button
          key={tab.id}
          className={`bottom-tab ${currentTab === tab.id ? 'active' : ''}`}
          onClick={() => handleTabClick(tab.id)}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          style={{ position: 'relative' }}
          {...(tab.id === 'tab4' ? { 'data-bottom-tab': 'profile' } : {})}
        >
          <TabIcon icon={tab.icon} active={currentTab === tab.id} />
          {tab.id === 'tab3' && hasUnreadMessages && (
            <span className="bottom-tab-unread-dot" aria-hidden />
          )}
        </motion.button>
      ))}
    </motion.div>
  )
}

export default BottomBar
