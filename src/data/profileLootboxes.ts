export const LOOTBOX_LOCK_REST_SRC = '/assets/lock/sequence/lock red_00059.png'

/** Opening animation when tapping an available lootbox (`public/Stems/…`) */
export const LOOTBOX_OPEN_VIDEO_SRC = '/Stems/looboks%20simple.mp4'

export const LOOTBOX_CHIP_IMAGE_SRC = '/Stems/Lootbox.png'

export const LOOTBOX_COUNT = 16

export const LOOTBOX_AVAILABLE_COUNT = 4

export type LootboxItem = { index: number; isAvailable: boolean }

/** Pre-sorted: available chips first (same sort as inline ProfilePanel logic). */
export const LOOTBOX_ITEMS: LootboxItem[] = Array.from({ length: LOOTBOX_COUNT }, (_, i) => ({
  index: i,
  isAvailable: i < LOOTBOX_AVAILABLE_COUNT
})).sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable))
