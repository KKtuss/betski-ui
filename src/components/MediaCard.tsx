import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Volume2, VolumeX } from 'lucide-react'
import {
  detectContentPlatform,
  extractTikTokVideoId,
  getTikTokEmbedUrl,
  resolveContentLink
} from '../utils/resolveContentLink'
import './VideoCard.css'

export type MediaSlide = {
  id: string
  sourceUrl?: string
  thumbnailUrl?: string
  videoUrl?: string
  embedUrl?: string
  legacyMp4?: string
}

const pickPlaybackMode = (
  slide: MediaSlide,
  data: Pick<MediaSlide, 'videoUrl' | 'embedUrl' | 'legacyMp4'>
): 'video' | 'embed' | 'image' => {
  const platform = slide.sourceUrl ? detectContentPlatform(slide.sourceUrl) : 'other'
  const tiktokEmbed =
    data.embedUrl ??
    (slide.sourceUrl && platform === 'tiktok'
      ? (() => {
          const id = extractTikTokVideoId(slide.sourceUrl)
          return id ? getTikTokEmbedUrl(id) : undefined
        })()
      : undefined)

  // TikTok CDN MP4s are blocked server-side — embed iframe is reliable in-browser.
  if (platform === 'tiktok' && tiktokEmbed) return 'embed'
  if (data.legacyMp4 || data.videoUrl) return 'video'
  if (data.embedUrl ?? tiktokEmbed) return 'embed'
  return 'image'
}

const postToTikTokPlayer = (iframe: HTMLIFrameElement | null, type: 'play' | 'pause' | 'unMute' | 'mute') => {
  console.log('Sending to TikTok player:', type)
  iframe?.contentWindow?.postMessage({ type, value: undefined, 'x-tiktok-player': true }, '*')
}

type MediaCardProps = {
  slide: MediaSlide
  isActive: boolean
  index: number
  currentIndex: number
  totalSlides: number
  onMediaResolved?: (id: string, patch: Partial<MediaSlide>) => void
}

const MediaCard = ({
  slide,
  isActive,
  index,
  currentIndex,
  totalSlides,
  onMediaResolved
}: MediaCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const platform = slide.sourceUrl ? detectContentPlatform(slide.sourceUrl) : 'other'
  const instantEmbed = useMemo(() => {
    if (platform !== 'tiktok' || !slide.sourceUrl) return slide.embedUrl
    const id = extractTikTokVideoId(slide.sourceUrl)
    return id ? getTikTokEmbedUrl(id) : slide.embedUrl
  }, [platform, slide.sourceUrl, slide.embedUrl])

  const [mode, setMode] = useState<'video' | 'embed' | 'image'>(() =>
    pickPlaybackMode(slide, { ...slide, embedUrl: instantEmbed })
  )
  const [resolved, setResolved] = useState<MediaSlide>(() => ({ ...slide, embedUrl: instantEmbed }))
  const [resolving, setResolving] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)

  const embedSrc = useMemo(() => {
    if (platform === 'tiktok' && slide.sourceUrl) {
      const id = extractTikTokVideoId(slide.sourceUrl)
      if (id) return getTikTokEmbedUrl(id)
    }
    return resolved.embedUrl ?? instantEmbed
  }, [platform, slide.sourceUrl, resolved.embedUrl, instantEmbed])

  useEffect(() => {
    const next = { ...slide, embedUrl: instantEmbed }
    setResolved(next)
    setMode(pickPlaybackMode(slide, next))
    setSoundEnabled(false)
  }, [slide.id, slide.legacyMp4, slide.videoUrl, slide.embedUrl, slide.sourceUrl, instantEmbed])

  useEffect(() => {
    if (!isActive || resolved.videoUrl || resolved.embedUrl || resolved.legacyMp4 || !resolved.sourceUrl) return
    if (resolving) return
    setResolving(true)
    resolveContentLink(resolved.sourceUrl)
      .then((data) => {
        const patch: Partial<MediaSlide> = {
          thumbnailUrl: data.thumbnailUrl,
          videoUrl: data.videoUrl,
          embedUrl: data.embedUrl ?? instantEmbed
        }
        setResolved((prev) => {
          const merged = { ...prev, ...patch }
          setMode(pickPlaybackMode(slide, merged))
          return merged
        })
        onMediaResolved?.(slide.id, patch)
      })
      .finally(() => setResolving(false))
  }, [isActive, resolved.sourceUrl, slide.id, instantEmbed])

  const handleVideoError = () => {
    const fallbackEmbed = resolved.embedUrl ?? instantEmbed
    if (fallbackEmbed) setMode('embed')
    else setMode('image')
  }

  const enableSound = () => {
    const el = videoRef.current
    if (el && mode === 'video') {
      console.log('Click: Unmuting video, setting volume to 1.0')
      el.muted = false
      el.volume = 1.0
      setSoundEnabled(true)
      if (isActive) {
        void el.play()
      }
    } else if (mode === 'embed' && platform === 'tiktok') {
      console.log('Click: Sending unmute to TikTok embed')
      postToTikTokPlayer(iframeRef.current, 'unMute')
      setSoundEnabled(true)
      // Also try play again after unmute
      setTimeout(() => postToTikTokPlayer(iframeRef.current, 'play'), 100)
    }
  }

  const disableSound = () => {
    const el = videoRef.current
    if (el && mode === 'video') {
      el.muted = true
      setSoundEnabled(false)
    } else if (mode === 'embed' && platform === 'tiktok') {
      postToTikTokPlayer(iframeRef.current, 'mute')
      setSoundEnabled(false)
    }
  }

  const handleCardClick = () => {
    enableSound()
  }

  const toggleSound = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (soundEnabled) disableSound()
    else enableSound()
  }

  useEffect(() => {
    const el = videoRef.current
    if (!el || mode !== 'video') return
    if (isActive) {
      console.log('Active slide: Video element state:', {
        muted: el.muted,
        volume: el.volume,
        readyState: el.readyState,
        networkState: el.networkState,
        src: el.src
      })
      el.volume = 1.0
      el.muted = false
      console.log('After setting: muted =', el.muted, ', volume =', el.volume)
      void el.play().catch((err) => {
        console.log('Autoplay blocked, waiting for user interaction:', err)
      })
    } else {
      el.pause()
    }
  }, [isActive, mode, resolved.videoUrl, resolved.legacyMp4])

  // TikTok player/v1: autoplay on mount + postMessage when slide becomes active or player ready
  useEffect(() => {
    if (mode !== 'embed' || platform !== 'tiktok' || !isActive) return

    const tryPlay = () => {
      console.log('TikTok: Attempting play and unmute')
      postToTikTokPlayer(iframeRef.current, 'play')
      setTimeout(() => postToTikTokPlayer(iframeRef.current, 'unMute'), 200)
    }
    const onMessage = (event: MessageEvent) => {
      console.log('TikTok: Received message:', event.data)
      if (event.data?.['x-tiktok-player'] && event.data?.type === 'onPlayerReady') {
        tryPlay()
      }
      if (event.data?.['x-tiktok-player'] && event.data?.type === 'onMute') {
        setSoundEnabled(event.data.value === false)
      }
      if (event.data?.['x-tiktok-player'] && event.data?.type === 'onVolumeChange') {
        setSoundEnabled(Number(event.data.value) > 0)
      }
    }

    window.addEventListener('message', onMessage)
    const delayed = window.setTimeout(tryPlay, 350)
    const retry = window.setTimeout(tryPlay, 900)

    return () => {
      window.removeEventListener('message', onMessage)
      window.clearTimeout(delayed)
      window.clearTimeout(retry)
      postToTikTokPlayer(iframeRef.current, 'pause')
    }
  }, [isActive, mode, platform, slide.id, embedSrc])

  const distanceFromActive = index - currentIndex
  const isToTheRight = distanceFromActive > 0
  let zIndexValue = 1
  if (isActive) zIndexValue = totalSlides + 10
  else if (isToTheRight) zIndexValue = totalSlides - distanceFromActive
  else zIndexValue = 1

  let opacityValue = 1
  if (isActive) opacityValue = 1
  else if (isToTheRight) opacityValue = Math.max(0.7, 0.9 - distanceFromActive * 0.05)
  else opacityValue = 0.3

  const scale = isActive ? 1 : isToTheRight ? 0.95 : 0.9
  const videoSrc = resolved.legacyMp4 ?? resolved.videoUrl
  const poster = resolved.thumbnailUrl || '/Stems/betskuu.png'
  const isTikTokEmbed = mode === 'embed' && platform === 'tiktok'

  return (
    <motion.div
      className={`video-card media-card${isActive ? ' active' : ''}${isTikTokEmbed ? ' media-card--tiktok' : ''}`}
      style={{
        zIndex: zIndexValue,
        opacity: opacityValue,
        transform: `scale(${scale})`
      }}
      onClick={handleCardClick}
    >
      {mode === 'video' && videoSrc ? (
        <video
          ref={videoRef}
          className="video-element"
          src={videoSrc}
          poster={poster}
          loop
          playsInline
          autoPlay={isActive}
          onError={handleVideoError}
        />
      ) : mode === 'embed' && embedSrc && isActive ? (
        <iframe
          key={slide.id}
          ref={iframeRef}
          className="media-embed"
          src={embedSrc}
          title="Social video"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className="media-poster"
          style={{ backgroundImage: `url(${poster})` }}
        />
      )}

      {isActive && mode !== 'image' && false && (
        <button
          type="button"
          className={`media-sound-toggle ${soundEnabled ? 'active' : ''}`}
          onClick={toggleSound}
          aria-label={soundEnabled ? 'Mute video' : 'Unmute video'}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      )}
    </motion.div>
  )
}

export default MediaCard
