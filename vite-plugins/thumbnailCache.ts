import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { extractUpstreamThumbnailUrl } from '../src/utils/thumbnailProxy'

const CACHE_DIR = join(process.cwd(), 'public', 'cache', 'thumbnails')
const CACHE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'] as const

const ensureCacheDir = () => {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
}

const hashUrl = (url: string) =>
  createHash('sha256').update(extractUpstreamThumbnailUrl(url)).digest('hex').slice(0, 16)

const extFromContentType = (contentType: string) => {
  const type = contentType.toLowerCase()
  if (type.includes('png')) return '.png'
  if (type.includes('webp')) return '.webp'
  if (type.includes('gif')) return '.gif'
  return '.jpg'
}

export type CachedThumbnail = {
  filePath: string
  publicUrl: string
}

export const getCachedThumbnail = (url: string): CachedThumbnail | null => {
  ensureCacheDir()
  const hash = hashUrl(url)
  for (const ext of CACHE_EXTENSIONS) {
    const filePath = join(CACHE_DIR, `${hash}${ext}`)
    if (existsSync(filePath)) {
      return { filePath, publicUrl: `/cache/thumbnails/${hash}${ext}` }
    }
  }
  return null
}

export const writeCachedThumbnail = (
  url: string,
  buffer: Buffer,
  contentType: string
): string => {
  ensureCacheDir()
  const hash = hashUrl(url)
  const ext = extFromContentType(contentType)
  const fileName = `${hash}${ext}`
  const filePath = join(CACHE_DIR, fileName)
  writeFileSync(filePath, buffer)
  return `/cache/thumbnails/${fileName}`
}

export const readCachedThumbnail = (
  url: string
): { buffer: Buffer; contentType: string } | null => {
  const cached = getCachedThumbnail(url)
  if (!cached) return null

  const ext = cached.publicUrl.slice(cached.publicUrl.lastIndexOf('.'))
  const contentType =
    ext === '.png'
      ? 'image/png'
      : ext === '.webp'
        ? 'image/webp'
        : ext === '.gif'
          ? 'image/gif'
          : 'image/jpeg'

  return {
    buffer: readFileSync(cached.filePath),
    contentType
  }
}
