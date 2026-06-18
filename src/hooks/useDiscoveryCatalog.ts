import { useSyncExternalStore } from 'react'
import { loadDiscoveryCatalog, subscribeDiscoveryCatalog, type DiscoveryCatalog } from '../data/discoveryStore'

export const useDiscoveryCatalog = (): DiscoveryCatalog =>
  useSyncExternalStore(subscribeDiscoveryCatalog, loadDiscoveryCatalog, loadDiscoveryCatalog)
