import { PROFILE_AVATARS } from '../data/profileRegistry'
import { simulateInboundMessage } from '../data/socialStore'
import {
  emitMessageNotification,
  emitNewsNotification,
  emitTrackedTradeNotification,
  emitWatchlistNotification,
  notifyWagerFillFromOther
} from './notificationEmitter'

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)]

/** Live demo events — notifications/toasts only; do not auto-append social chat messages. */
const demoScenarios = [
  () =>
    emitMessageNotification({
      chatId: 'dm-1',
      chatTitle: 'MarkDiTob',
      preview: 'You seeing this YES move on Triple T?',
      senderHandle: 'MarkDiTob',
      avatarUrl: PROFILE_AVATARS.MarkDiTob
    }),
  () =>
    emitMessageNotification({
      chatId: 'group-1',
      chatTitle: 'Betskiing',
      preview: 'Adding size before resolution — who else is in?',
      senderHandle: 'NovaTape',
      avatarUrl: PROFILE_AVATARS.NovaTape
    }),
  () =>
    emitTrackedTradeNotification({
      id: `demo-tracked-mark-${Date.now()}`,
      handle: 'MarkDiTob',
      marketName: 'Triple T going 10x virality before EOM ?',
      side: 'YES',
      usdAmount: 2400,
      price: 0.62,
      avatarUrl: PROFILE_AVATARS.MarkDiTob
    }),
  () =>
    emitTrackedTradeNotification({
      id: `demo-tracked-desk-${Date.now()}`,
      handle: 'DeskWhale',
      marketName: "D4vd's story having a 3x regain in virality over 2 weeks ?",
      side: 'NO',
      usdAmount: 850,
      price: 0.41,
      avatarUrl: PROFILE_AVATARS.DeskWhale
    }),
  () =>
    notifyWagerFillFromOther({
      wagerId: 'wager-demo',
      wagerName: 'D4vd regen in virality over 2 weeks?',
      fillId: `demo-${Date.now()}`,
      handle: 'ClipQueen',
      side: 'YES',
      usdAmount: 125,
      avatarUrl: PROFILE_AVATARS.ClipQueen
    }),
  () =>
    emitWatchlistNotification({
      id: `watchlist-demo-${Date.now()}`,
      count: 2,
      preview: 'D4vd batch closes in 3h — 2 markets on your watchlist.',
      marketId: 'batch-3'
    }),
  () =>
    emitNewsNotification({
      title: 'Trending now',
      body: 'Triple T batch +18% volume in the last hour.',
      marketId: 'batch-1'
    })
]

/** Fire one random demo notification (respects active profile prefs). */
export const fireDemoNotification = (): void => {
  pick(demoScenarios)()
}

/** Fire a message notification immediately — good for permission / toast testing. */
export const fireDemoMessageNotification = (): void => {
  simulateInboundMessage({
    chatId: 'dm-1',
    senderHandle: 'MarkDiTob',
    text: 'Test alert — tap to open this chat.'
  })
}
