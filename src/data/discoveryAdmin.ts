import type { BatchPreviewItem } from '../types/discovery'
import { PLACEHOLDER_THUMB } from '../utils/thumbnailProxy'

export const createPreviewItem = (parentId: string): BatchPreviewItem => ({
  id: `${parentId}-vid-${Date.now()}`,
  sourceUrl: '',
  thumbnailUrl: PLACEHOLDER_THUMB,
  volume: 100
})
