import { motion } from 'framer-motion'
import { Home, MessageSquare, User } from 'lucide-react'
import type { SVGProps } from 'react'
import './BottomBar.css'

interface BottomBarProps {
  onTabClick?: (tabId: string) => void
  currentTab: string
  hasUnreadMessages?: boolean
}

/**
 * Discovery tab icon — three wide rectangle outlines stacked vertically.
 * Reads as a "lobby / list" of markets, matching the Discovery page layout.
 */
const StackedRows = ({ size = 24, ...rest }: { size?: number | string } & SVGProps<SVGSVGElement>) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
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
      {tabs.slice(0, 2).map((tab, index) => (
        <motion.button
          key={tab.id}
          className={`bottom-tab ${currentTab === tab.id ? 'active' : ''}`}
          onClick={() => handleTabClick(tab.id)}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <tab.icon size={40} />
        </motion.button>
      ))}
      
      <motion.div 
        className={`bottom-bar-center ${currentTab === 'center' ? 'active' : ''}`}
        onClick={() => handleTabClick('center')}
        whileHover={{ scale: 1 }}
        whileTap={{ scale: 0.95 }}
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
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{ position: 'relative' }}
        >
          <tab.icon size={40} />
          {tab.id === 'tab3' && hasUnreadMessages && (
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              width: '8px',
              height: '8px',
              background: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)', // Vibrant Betski logo gradient
              borderRadius: '50%',
              boxShadow: '0 0 8px rgba(255, 106, 0, 0.8)' // Stronger glow
            }} />
          )}
        </motion.button>
      ))}
    </motion.div>
  )
}

export default BottomBar
