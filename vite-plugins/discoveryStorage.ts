import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const STORAGE_FILE = join(process.cwd(), '.discovery-catalog.json')

export function loadDiscoveryCatalogFromFile(): string | null {
  try {
    if (existsSync(STORAGE_FILE)) {
      return readFileSync(STORAGE_FILE, 'utf-8')
    }
  } catch (error) {
    console.error('Failed to load discovery catalog from file:', error)
  }
  return null
}

export function saveDiscoveryCatalogToFile(data: string): void {
  try {
    writeFileSync(STORAGE_FILE, data, 'utf-8')
  } catch (error) {
    console.error('Failed to save discovery catalog to file:', error)
  }
}
