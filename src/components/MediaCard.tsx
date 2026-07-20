import { useEffect, useMemo, useRef, useState } from 'react'
import {
  detectContentPlatform,
  extractTikTokVideoId,
  extractYoutubeVideoId,
  getInstantEmbedUrl,
  getTikTokEmbedUrl,
  getYoutubeEmbedUrl,
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
  title?: string
  views?: number
  likes?: number
  shares?: number
  comments?: number
  authorName?: string
  authorHandle?: string
  authorAvatarUrl?: string
}

const pickPlaybackMode = (
  slide: MediaSlide,
  data: Pick<MediaSlide, 'videoUrl' | 'embedUrl' | 'legacyMp4' | 'sourceUrl'>
): 'video' | 'embed' | 'image' => {
  const sourceUrl = data.sourceUrl ?? slide.sourceUrl
  const platform = sourceUrl ? detectContentPlatform(sourceUrl) : 'other'
  const instantEmbed = data.embedUrl ?? getInstantEmbedUrl(sourceUrl)

  // TikTok CDN MP4s are blocked server-side — embed iframe is reliable in-browser.
  if (platform === 'tiktok' && instantEmbed) return 'embed'
  if (data.legacyMp4 || data.videoUrl) return 'video'
  if (data.embedUrl ?? instantEmbed) return 'embed'
  return 'image'
}

const postToTikTokPlayer = (
  iframe: HTMLIFrameElement | null,
  type: 'play' | 'pause' | 'unMute' | 'mute' | 'seekTo',
  value?: number
) => {
  iframe?.contentWindow?.postMessage(
    {
      type,
      value: type === 'seekTo' ? (value ?? 0) : undefined,
      'x-tiktok-player': true
    },
    '*'
  )
}

type MediaCardProps = {
  slide: MediaSlide
  isActive: boolean
  index: number
  currentIndex: number
  totalSlides: number
  soundEnabled?: boolean
  onSoundChange?: (enabled: boolean) => void
  onMediaResolved?: (id: string, patch: Partial<MediaSlide>) => void
}

const MediaCard = ({
  slide,
  isActive,
  index,
  currentIndex,
  totalSlides,
  soundEnabled = false,
  onSoundChange,
  onMediaResolved
}: MediaCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const soundEnabledRef = useRef(soundEnabled)
  soundEnabledRef.current = soundEnabled
  const platform = slide.sourceUrl ? detectContentPlatform(slide.sourceUrl) : 'other'
  const instantEmbed = useMemo(
    () => slide.embedUrl ?? getInstantEmbedUrl(slide.sourceUrl),
    [slide.embedUrl, slide.sourceUrl]
  )

  const [mode, setMode] = useState<'video' | 'embed' | 'image'>(() =>
    pickPlaybackMode(slide, { ...slide, embedUrl: instantEmbed })
  )
  const [resolved, setResolved] = useState<MediaSlide>(() => ({ ...slide, embedUrl: instantEmbed }))
  const [resolving, setResolving] = useState(false)

  const embedSrc = useMemo(() => {
    if (platform === 'tiktok' && slide.sourceUrl) {
      const id = extractTikTokVideoId(slide.sourceUrl)
      // Keep URL stable across active/inactive so neighbor warm loads aren't remounted.
      if (id) return getTikTokEmbedUrl(id)
    }
    if (platform === 'youtube' && slide.sourceUrl) {
      const id = extractYoutubeVideoId(slide.sourceUrl)
      if (id) return getYoutubeEmbedUrl(id)
    }
    return resolved.embedUrl ?? instantEmbed
  }, [platform, slide.sourceUrl, resolved.embedUrl, instantEmbed])

  useEffect(() => {
    const next = { ...slide, embedUrl: instantEmbed }
    setResolved(next)
    setMode(pickPlaybackMode(slide, next))
  }, [slide.id, slide.legacyMp4, slide.videoUrl, slide.embedUrl, slide.sourceUrl, instantEmbed])

  useEffect(() => {
    // Warm neighbor metadata/embed so the next swipe isn't cold-starting resolve.
    if (Math.abs(index - currentIndex) > 1) return
    if (!resolved.sourceUrl) return
    if (resolving) return

    const hasPlayback =
      Boolean(resolved.videoUrl || resolved.embedUrl || resolved.legacyMp4 || instantEmbed)
    const needsPlayback = !hasPlayback
    const needsMeta =
      (platform === 'tiktok' || platform === 'youtube') &&
      (!resolved.authorHandle || resolved.likes == null || !resolved.authorAvatarUrl)
    if (!needsPlayback && !needsMeta) return

    let cancelled = false
    const run = () => {
      if (cancelled) return
      setResolving(true)
      resolveContentLink(resolved.sourceUrl!)
        .then((data) => {
          if (cancelled) return
          const patch: Partial<MediaSlide> = {
            thumbnailUrl: data.thumbnailUrl || resolved.thumbnailUrl,
            videoUrl: data.videoUrl ?? resolved.videoUrl,
            embedUrl: data.embedUrl ?? resolved.embedUrl ?? instantEmbed,
            title: data.title ?? resolved.title,
            views: data.views ?? resolved.views,
            likes: data.likes ?? resolved.likes,
            shares: data.shares ?? resolved.shares,
            comments: data.comments ?? resolved.comments,
            authorName: data.authorName ?? resolved.authorName,
            authorHandle: data.authorHandle ?? resolved.authorHandle,
            authorAvatarUrl: data.authorAvatarUrl ?? resolved.authorAvatarUrl
          }
          setResolved((prev) => {
            const merged = { ...prev, ...patch }
            setMode(pickPlaybackMode(slide, merged))
            return merged
          })
          onMediaResolved?.(slide.id, patch)
        })
        .finally(() => {
          if (!cancelled) setResolving(false)
        })
    }

    // Embed already known — defer meta scrape so it doesn't fight the iframe boot.
    // Active slide still resolves immediately so overlay name/pfp aren't stale.
    if (!needsPlayback && needsMeta && !isActive) {
      const w = window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
        cancelIdleCallback?: (id: number) => void
      }
      if (typeof w.requestIdleCallback === 'function') {
        const idleId = w.requestIdleCallback(run, { timeout: 2200 })
        return () => {
          cancelled = true
          w.cancelIdleCallback?.(idleId)
        }
      }
      const t = window.setTimeout(run, 900)
      return () => {
        cancelled = true
        window.clearTimeout(t)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [isActive, index, currentIndex, resolved.sourceUrl, slide.id, instantEmbed, platform])

  const handleVideoError = () => {
    const fallbackEmbed = resolved.embedUrl ?? instantEmbed
    if (fallbackEmbed) setMode('embed')
    else setMode('image')
  }

  const applyTikTokSound = (enabled: boolean) => {
    postToTikTokPlayer(iframeRef.current, enabled ? 'unMute' : 'mute')
  }

  const applyVideoSound = (enabled: boolean) => {
    const el = videoRef.current
    if (!el) return
    el.muted = !enabled
    if (enabled) el.volume = 1
  }

  // Native <video>: only the active card plays; others sit on frame 0.
  // Seek-to-start only on active change — not on every mute toggle.
  useEffect(() => {
    const el = videoRef.current
    if (!el || mode !== 'video') return
    if (isActive) {
      try {
        el.currentTime = 0
      } catch {
        // ignore seek errors before metadata
      }
      applyVideoSound(soundEnabledRef.current)
      void el.play().catch(() => {
        // Autoplay with sound may be blocked until a user gesture.
      })
    } else {
      el.pause()
      try {
        el.currentTime = 0
      } catch {
        // ignore
      }
    }
  }, [isActive, mode, resolved.videoUrl, resolved.legacyMp4])

  // TikTok: neighbors stay paused on frame 0; active plays (autoplay URL + postMessage).
  useEffect(() => {
    if (mode !== 'embed' || platform !== 'tiktok') return

    const holdAtStart = () => {
      postToTikTokPlayer(iframeRef.current, 'pause')
      postToTikTokPlayer(iframeRef.current, 'seekTo', 0)
      postToTikTokPlayer(iframeRef.current, 'mute')
    }

    const kickPlay = () => {
      postToTikTokPlayer(iframeRef.current, 'play')
      applyTikTokSound(soundEnabledRef.current)
    }

    const startFromBeginning = () => {
      postToTikTokPlayer(iframeRef.current, 'seekTo', 0)
      kickPlay()
    }

    if (!isActive) {
      const iframeWin = () => iframeRef.current?.contentWindow ?? null
      const onMessage = (event: MessageEvent) => {
        if (!event.data?.['x-tiktok-player']) return
        if (event.source && event.source !== iframeWin()) return
        // Player ready or somehow started playing while inactive — pin to frame 0.
        if (event.data.type === 'onPlayerReady' || event.data.type === 'onStateChange') {
          if (event.data.type === 'onStateChange' && event.data.value !== 1) return
          holdAtStart()
        }
      }
      window.addEventListener('message', onMessage)
      const t1 = window.setTimeout(holdAtStart, 150)
      const t2 = window.setTimeout(holdAtStart, 500)
      const t3 = window.setTimeout(holdAtStart, 1200)
      return () => {
        window.removeEventListener('message', onMessage)
        window.clearTimeout(t1)
        window.clearTimeout(t2)
        window.clearTimeout(t3)
      }
    }

    const iframeWin = () => iframeRef.current?.contentWindow ?? null
    const onMessage = (event: MessageEvent) => {
      if (!event.data?.['x-tiktok-player']) return
      if (event.source && event.source !== iframeWin()) return
      if (event.data.type === 'onPlayerReady') {
        startFromBeginning()
      }
    }

    window.addEventListener('message', onMessage)
    // Seek once on select; later timers only re-assert play (mobile can drop the first).
    const fromStart = window.setTimeout(startFromBeginning, 200)
    const retry = window.setTimeout(kickPlay, 700)
    const retry2 = window.setTimeout(kickPlay, 1400)

    return () => {
      window.removeEventListener('message', onMessage)
      window.clearTimeout(fromStart)
      window.clearTimeout(retry)
      window.clearTimeout(retry2)
      holdAtStart()
    }
  }, [isActive, mode, platform, slide.id, embedSrc])

  // Mute/unmute while the same slide stays active (rail button)
  useEffect(() => {
    if (!isActive) return
    if (mode === 'embed' && platform === 'tiktok') {
      applyTikTokSound(soundEnabled)
    } else if (mode === 'video') {
      applyVideoSound(soundEnabled)
    }
  }, [soundEnabled, isActive, mode, platform])

  const distanceFromActive = index - currentIndex
  const isToTheRight = distanceFromActive > 0
  let zIndexValue = 1
  if (isActive) zIndexValue = totalSlides + 10
  else if (isToTheRight) zIndexValue = totalSlides - distanceFromActive
  else zIndexValue = 1

  const videoSrc = resolved.legacyMp4 ?? resolved.videoUrl
  const poster = resolved.thumbnailUrl || '/Stems/BetskiPEFFPEE.png'
  const isTikTokEmbed = mode === 'embed' && platform === 'tiktok'

  return (
    <div
      className={`video-card media-card${isActive ? ' active' : ''}${isTikTokEmbed ? ' media-card--tiktok' : ''}`}
      style={{ zIndex: zIndexValue }}
      onClick={() => {
        if (!soundEnabled) onSoundChange?.(true)
      }}
    >
      {mode === 'video' && videoSrc ? (
        <video
          ref={videoRef}
          className="video-element"
          src={videoSrc}
          poster={poster}
          loop
          playsInline
          muted={!soundEnabled}
          preload="metadata"
          onError={handleVideoError}
        />
      ) : mode === 'embed' && embedSrc && Math.abs(distanceFromActive) <= 1 ? (
        <iframe
          key={slide.id}
          ref={iframeRef}
          className="media-embed"
          src={embedSrc}
          title="Social video"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="no-referrer"
          // Cross-origin embeds swallow touches — keep swipes on our stage handlers.
          style={{ pointerEvents: 'none' }}
          tabIndex={-1}
          aria-hidden={!isActive}
        />
      ) : (
        <div
          className="media-poster"
          style={{ backgroundImage: `url(${poster})` }}
        />
      )}
    </div>
  )
}

export default MediaCard
