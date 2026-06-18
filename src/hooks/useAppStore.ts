import { useSyncExternalStore } from 'react'
import { loadAppState, subscribeAppState, type AppState } from '../data/appStore'

export const useAppStore = (): AppState =>
  useSyncExternalStore(subscribeAppState, loadAppState, loadAppState)
