import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import './ProfileLootboxVideo.css'

type ProfileLootboxVideoProps = {
  onClose: () => void
  videoSrc: string
}

const ProfileLootboxVideo = ({ onClose, videoSrc }: ProfileLootboxVideoProps) => {
  const lootboxVideoRef = useRef<HTMLVideoElement>(null)

  const closeLootboxVideo = () => {
    const v = lootboxVideoRef.current
    if (v) {
      v.pause()
      v.currentTime = 0
    }
    onClose()
  }

  useEffect(() => {
    const v = lootboxVideoRef.current
    const id = window.requestAnimationFrame(() => {
      void v?.play().catch(() => {})
    })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLootboxVideo()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.cancelAnimationFrame(id)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <motion.div
      key="lootbox-video-overlay"
      className="lootbox-video-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Lootbox opening. Click or press Escape to close."
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      onClick={closeLootboxVideo}
    >
      <video
        ref={lootboxVideoRef}
        className="lootbox-video-el"
        src={videoSrc}
        playsInline
        preload="auto"
        disablePictureInPicture
        controlsList="nodownload noplaybackrate"
        onEnded={closeLootboxVideo}
      />
    </motion.div>
  )
}

export default ProfileLootboxVideo
