import { fetchThumbnailBuffer } from '../lib/linkPreviewCore.js'

/** Vercel serverless handler — proxies hotlink-blocked CDN thumbnails (TikTok, IG, etc.). */
export default async function handler(req, res) {
  const method = req.method || 'GET'
  if (method !== 'GET' && method !== 'HEAD') {
    res.status(405).end('Method not allowed')
    return
  }

  const raw = req.query?.url
  const imgUrl = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined
  if (!imgUrl) {
    res.status(400).end('Missing url')
    return
  }

  try {
    const fetched = await fetchThumbnailBuffer(imgUrl)
    if (!fetched) {
      res.status(502).end('Upstream fetch failed')
      return
    }

    res.status(200)
    res.setHeader('Content-Type', fetched.contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
    // Client hydrate uses HEAD to verify proxy URLs — return headers only.
    if (method === 'HEAD') {
      res.setHeader('Content-Length', String(fetched.buffer.length))
      res.end()
      return
    }
    res.send(fetched.buffer)
  } catch {
    res.status(502).end('Thumbnail proxy error')
  }
}
