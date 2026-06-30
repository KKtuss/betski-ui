import { PROFILE_AVATARS } from '../data/profileRegistry'
import { simulateInboundMessage } from '../data/socialStore'
import {
  emitNewsNotification,
  emitTrackedTradeNotification,
  emitWatchlistNotification,
  notifyWagerFillFromOther
} from './notificationEmitter'

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)]

const demoScenarios = [
  () =>
    simulateInboundMessage({
      chatId: 'dm-1',
      senderHandle: 'MarkDiTob',
      text: 'You seeing this YES move on Triple T?'
    }),
  () =>
    simulateInboundMessage({
      chatId: 'group-1',
      senderHandle: 'NovaTape',
      text: 'Adding size before resolution — who else is in?'
    }),
  () =>
    emitTrackedTradeNotification({
      handle: 'MarkDiTob',
      marketName: 'Triple T going 10x virality before EOM ?',
      side: 'YES',
      usdAmount: 2400,
      price: 0.62,
      avatarUrl: PROFILE_AVATARS.MarkDiTob
    }),
  () =>
    emitTrackedTradeNotification({
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
