import { resolveLinkPreview } from '../lib/linkPreviewCore.js'

/** Vercel serverless handler — mirrors the Vite dev /api/link-preview middleware. */
export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const raw = req.query?.url
  const targetUrl = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined
  if (!targetUrl) {
    res.status(400).json({ error: 'Missing url parameter' })
    return
  }

  try {
    const data = await resolveLinkPreview(targetUrl)
    if (!data?.thumbnailUrl && !data?.embedUrl && !data?.videoUrl) {
      res.status(404).json({ error: 'Could not resolve thumbnail for this link' })
      return
    }

    res.status(200).json({
      thumbnailUrl: data.thumbnailUrl,
      title: data.title ?? null,
      views: data.views ?? null,
      likes: data.likes ?? null,
      shares: data.shares ?? null,
      videoUrl: data.videoUrl ?? null,
      embedUrl: data.embedUrl ?? null
    })
  } catch {
    res.status(500).json({ error: 'Failed to resolve link preview' })
  }
}
