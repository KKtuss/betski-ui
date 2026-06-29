import type { Connect } from 'vite'
import type { Plugin } from 'vite'
import {
  needsThumbnailProxy,
  proxiedThumbnailUrl
} from '../src/utils/thumbnailProxy'
import {
  readCachedThumbnail,
  writeCachedThumbnail
} from './thumbnailCache'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import {
  fetchThumbnailBuffer,
  resolveLinkPreview,
  type LinkPreviewResult
} from '../api/_lib/linkPreviewCore'

export { needsThumbnailProxy, proxiedThumbnailUrl }
export type { LinkPreviewResult }
export { resolveLinkPreview, fetchThumbnailBuffer } from '../api/_lib/linkPreviewCore'

const DISCOVERY_STORAGE_FILE = join(process.cwd(), '.discovery-catalog.json')

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function loadDiscoveryCatalog(): string | null {
  try {
    console.log('Checking if file exists:', DISCOVERY_STORAGE_FILE)
    if (existsSync(DISCOVERY_STORAGE_FILE)) {
      const data = readFileSync(DISCOVERY_STORAGE_FILE, 'utf-8')
      console.log('File read successfully, size:', data.length)
      return data
    }
    console.log('File does not exist')
  } catch (error) {
    console.error('Failed to load discovery catalog:', error)
  }
  return null
}

function saveDiscoveryCatalog(data: string): void {
  try {
    console.log('Writing to file:', DISCOVERY_STORAGE_FILE)
    writeFileSync(DISCOVERY_STORAGE_FILE, data, 'utf-8')
    console.log('File written successfully')
  } catch (error) {
    console.error('Failed to save discovery catalog:', error)
  }
}

const linkPreviewMiddleware: Connect.NextHandleFunction = async (req, res, next) => {
  if (!req.url?.startsWith('/api/link-preview')) return next()

  const queryUrl = new URL(req.url, 'http://localhost').searchParams.get('url')
  if (!queryUrl) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Missing url parameter' }))
    return
  }

  try {
    const data = await resolveLinkPreview(queryUrl)
    if (!data?.thumbnailUrl && !data?.embedUrl && !data?.videoUrl) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Could not resolve thumbnail for this link' }))
      return
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      thumbnailUrl: data.thumbnailUrl,
      title: data.title ?? null,
      views: data.views ?? null,
      likes: data.likes ?? null,
      shares: data.shares ?? null,
      videoUrl: data.videoUrl ?? null,
      embedUrl: data.embedUrl ?? null
    }))
  } catch {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Failed to resolve link preview' }))
  }
}

const thumbnailProxyMiddleware: Connect.NextHandleFunction = async (req, res, next) => {
  if (!req.url?.startsWith('/api/thumbnail-proxy')) return next()

  const imgUrl = new URL(req.url, 'http://localhost').searchParams.get('url')
  if (!imgUrl) {
    res.statusCode = 400
    res.end('Missing url')
    return
  }

  try {
    const cached = readCachedThumbnail(imgUrl)
    if (cached) {
      res.statusCode = 200
      res.setHeader('Content-Type', cached.contentType)
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.end(cached.buffer)
      return
    }

    const fetched = await fetchThumbnailBuffer(imgUrl)
    if (!fetched) {
      res.statusCode = 502
      res.end('Upstream fetch failed')
      return
    }

    writeCachedThumbnail(imgUrl, fetched.buffer, fetched.contentType)

    res.statusCode = 200
    res.setHeader('Content-Type', fetched.contentType)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.end(fetched.buffer)
  } catch {
    res.statusCode = 502
    res.end('Thumbnail proxy error')
  }
}

const videoProxyMiddleware: Connect.NextHandleFunction = async (req, res, next) => {
  if (!req.url?.startsWith('/api/video-proxy')) return next()

  const videoUrl = new URL(req.url, 'http://localhost').searchParams.get('url')
  if (!videoUrl) {
    res.statusCode = 400
    res.end('Missing url')
    return
  }

  try {
    const parsed = new URL(videoUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      res.statusCode = 400
      res.end('Invalid url')
      return
    }

    const upstream = await fetch(videoUrl, {
      headers: {
        'User-Agent': BROWSER_UA,
        Referer: videoUrl.includes('tiktok') ? 'https://www.tiktok.com/' : parsed.origin + '/',
        Accept: 'video/*,*/*'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000)
    })

    if (!upstream.ok) {
      res.statusCode = upstream.status
      res.end('Upstream fetch failed')
      return
    }

    const contentType = upstream.headers.get('content-type') ?? 'video/mp4'
    const buffer = Buffer.from(await upstream.arrayBuffer())

    res.statusCode = 200
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.end(buffer)
  } catch {
    res.statusCode = 502
    res.end('Video proxy error')
  }
}

const discoveryCatalogMiddleware: Connect.NextHandleFunction = async (req, res, next) => {
  if (!req.url?.startsWith('/api/discovery-catalog')) return next()

  console.log('Discovery catalog API called:', req.method, req.url)

  if (req.method === 'GET') {
    console.log('Loading discovery catalog from file...')
    const data = loadDiscoveryCatalog()
    if (data) {
      console.log('Catalog loaded successfully, size:', data.length)
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(data)
    } else {
      console.log('Catalog not found in file')
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Catalog not found' }))
    }
  } else if (req.method === 'POST') {
    try {
      let body = ''
      req.on('data', chunk => { body += chunk.toString() })
      req.on('end', () => {
        console.log('Saving discovery catalog to file, size:', body.length)
        saveDiscoveryCatalog(body)
        console.log('Catalog saved successfully')
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true }))
      })
    } catch (err) {
      console.error('Failed to save catalog:', err)
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Failed to save catalog' }))
    }
  } else {
    next()
  }
}

/** Vite plugin: link preview + thumbnail proxy for dev/preview. */
export function linkPreviewApiPlugin(): Plugin {
  const attach = (server: { middlewares: Connect.Server }) => {
    server.middlewares.use(discoveryCatalogMiddleware)
    server.middlewares.use(videoProxyMiddleware)
    server.middlewares.use(thumbnailProxyMiddleware)
    server.middlewares.use(linkPreviewMiddleware)
  }

  return {
    name: 'link-preview-api',
    configureServer: attach,
    configurePreviewServer: attach
  }
}
