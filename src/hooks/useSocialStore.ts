import { useSyncExternalStore } from 'react'
import { loadSocialState, subscribeSocialState } from '../data/socialStore'

export const useSocialStore = () =>
  useSyncExternalStore(subscribeSocialState, loadSocialState, loadSocialState)
