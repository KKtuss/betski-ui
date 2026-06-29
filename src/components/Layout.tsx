import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import VideoContainer from './VideoContainer'
import ChartPanel from './ChartPanel'
import RulesPanel from './RulesPanel'
import OrderbookPanel from './OrderbookPanel'
import type { Trade } from '../types/trading'
import WagerHeatmapPanel from './WagerHeatmapPanel'
import WagerLiquidityPanel from './WagerLiquidityPanel'
import BottomBar from './BottomBar'
import MobileTradeSheet from './MobileTradeSheet'
import SocialsPanel from './SocialsPanel'
import DiscoveryPanel from './DiscoveryPanel'
import { CreateWagerView } from './discovery/CreateWagerView'
import ProfilePanel from './ProfilePanel'
import HomePanel from './HomePanel'
import NotificationCenterPanel from './NotificationCenterPanel'
import type { OpenBet, Wager } from '../types/discovery'
import type { PendingShare, PendingShareText, PendingShareTrade } from '../types/layoutShare'
import { useMarketTick } from '../hooks/useMarketTick'
import { useAppStore } from '../hooks/useAppStore'
import { useHashNavigation } from '../hooks/useHashNavigation'
import { useHomeMobileLayout } from '../hooks/useHomeMobileLayout'
import { useDiscoveryCatalog } from '../hooks/useDiscoveryCatalog'
import { useNotificationWatcher } from '../hooks/useNotificationWatcher'
import { useSocialStore } from '../hooks/useSocialStore'
import {
  executeTrade,
  setSelectedMarketId,
  setViewingProfileHandle,
  type MarketId
} from '../data/appStore'
import { addWager, advanceBatchMarketTick, applyWagerLiquidityBuy, ensureDiscoveryThumbnails } from '../data/discoveryStore'
import {
  buildMarketCatalog,
  getMarketById
} from '../data/marketCatalog'
import { buildMarketViewData } from '../utils/buildMarketViewData'
import { buildShareMarket } from '../utils/buildShareMarket'
import { consensusYesFromOpenBets, getWagerFills } from '../utils/wagerFills'
import { parseNotificationTargetRoute } from '../utils/notificationEmitter'
import type { AppNotification } from '../types/notifications'
import { addDmChat, hasUnreadMessages, markChatRead } from '../data/socialStore'
import { RECENT_TRADES_MAX } from '../constants/layout'
import './Layout.css'

const Layout = () => {
  const appState = useAppStore()
  const discoveryCatalog = useDiscoveryCatalog()
  const socialState = useSocialStore()
  const { route, navigate } = useHashNavigation()
  useNotificationWatcher()

  const [activeTab, setActiveTab] = useState<'main' | 'socials' | 'discovery' | 'profile' | 'notifications'>(() => {
    if (route.type === 'discovery') return 'discovery'
    if (route.type === 'socials') return 'socials'
    if (route.type === 'profile') return 'profile'
    if (route.type === 'notifications') return 'notifications'
    return 'main'
  })

  const [createWagerOpen, setCreateWagerOpen] = useState(false)
  const [pendingWager, setPendingWager] = useState<Wager | null>(null)
  const [homeFeedOpen, setHomeFeedOpen] = useState(false)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const homeMobileLayout = useHomeMobileLayout()
  const [homeFeedSide, setHomeFeedSide] = useState<'left' | 'right'>('left')
  const [activeMode, setActiveMode] = useState<'orderbook' | 'long' | 'short' | 'share'>('orderbook')
  const [requestedPreviewIndex, setRequestedPreviewIndex] = useState<number | null>(null)
  const [socialsInitialChatId, setSocialsInitialChatId] = useState<string | null>(null)
  const [pendingShare, setPendingShare] = useState<PendingShare | null>(null)
  const [pendingShareText, setPendingShareText] = useState<PendingShareText | null>(null)
  const [pendingShareTrade, setPendingShareTrade] = useState<PendingShareTrade | null>(null)
  const [tradeMarketId, setTradeMarketId] = useState<MarketId | null>(null)
  const [outcomeSide, setOutcomeSide] = useState<'no' | 'yes'>('yes')
  const [chartNow] = useState(() => Date.now())
  const [wagerSelectedOdds, setWagerSelectedOdds] = useState(50)
  const [wagerFillTarget, setWagerFillTarget] = useState<OpenBet | undefined>(undefined)

  const selectedMarketId = appState.ui.selectedMarketId ?? 'legacy-1'
  const selectedMarket = useMemo(
    () => getMarketById(selectedMarketId) ?? buildMarketCatalog()[0],
    [selectedMarketId, appState.trades.length, discoveryCatalog]
  )

  const isWagerMarket = selectedMarket.type === 'wager'
  const liveWager = useMemo(
    () => (isWagerMarket ? discoveryCatalog.wagers.find((w) => w.id === selectedMarketId) : undefined),
    [isWagerMarket, selectedMarketId, discoveryCatalog]
  )
  const wagerFills = useMemo(
    () => (liveWager ? getWagerFills(liveWager, appState.trades) : []),
    [liveWager, appState.trades]
  )

  const openMarket = useCallback(
    (marketId: MarketId) => {
      setSelectedMarketId(marketId)
      setOutcomeSide('yes')
      const market = getMarketById(marketId)
      setActiveMode(market?.type === 'wager' ? 'long' : 'orderbook')
      setTradeMarketId(market?.type === 'wager' ? marketId : null)
      setWagerFillTarget(undefined)
      setActiveTab('main')
      setHomeFeedOpen(false)
      navigate({ type: 'main', marketId })
    },
    [navigate]
  )

  const openProfile = useCallback(
    (handle: string | null) => {
      setViewingProfileHandle(handle)
      setActiveTab('profile')
      navigate({ type: 'profile', handle: handle ?? undefined })
    },
    [navigate]
  )

  const openNotifications = useCallback(() => {
    setActiveTab('notifications')
    setHomeFeedOpen(false)
    navigate({ type: 'notifications' })
  }, [navigate])

  const handleOpenNotification = useCallback(
    (notification: AppNotification) => {
      const dest = parseNotificationTargetRoute(notification.target)
      setHomeFeedOpen(false)
      setMobileSheetOpen(false)
      if (dest.chatId) setSocialsInitialChatId(dest.chatId)
      if (dest.marketId) {
        openMarket(dest.marketId)
        return
      }
      if (dest.tab === 'profile') {
        openProfile(dest.handle ?? null)
        return
      }
      if (dest.tab === 'socials') {
        setActiveTab('socials')
        navigate({ type: 'socials', chatId: dest.chatId })
        return
      }
      if (dest.tab === 'discovery') {
        setActiveTab('discovery')
        navigate({ type: 'discovery' })
        return
      }
      if (dest.tab === 'notifications') {
        openNotifications()
      }
    },
    [navigate, openMarket, openNotifications, openProfile]
  )

  useEffect(() => {
    void ensureDiscoveryThumbnails()
  }, [])

  useEffect(() => {
    if (route.type === 'main' && route.marketId) {
      setSelectedMarketId(route.marketId)
      setActiveTab('main')
    } else if (route.type === 'discovery') setActiveTab('discovery')
    else if (route.type === 'socials') {
      setActiveTab('socials')
      if (route.chatId) setSocialsInitialChatId(route.chatId)
    } else if (route.type === 'profile') {
      setActiveTab('profile')
      setViewingProfileHandle(route.handle ?? null)
    } else if (route.type === 'notifications') setActiveTab('notifications')
    else if (route.type === 'main') setActiveTab('main')
  }, [
    route.type,
    route.type === 'main' ? route.marketId : undefined,
    route.type === 'profile' ? route.handle : undefined,
    route.type === 'socials' ? route.chatId : undefined
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash) return
    navigate({ type: 'main', marketId: selectedMarketId })
  }, [])

  const chats = socialState.chats

  const addFriendChat = (handle: string) => addDmChat(handle)

  const handleChatRead = (chatId: string) => {
    markChatRead(chatId)
  }

  const hasUnreadMessagesFlag = hasUnreadMessages()

  const effectiveMarketId =
    activeMode === 'long' || activeMode === 'short'
      ? tradeMarketId ?? selectedMarketId
      : selectedMarketId

  const effectiveMarket = useMemo(
    () => getMarketById(effectiveMarketId) ?? selectedMarket,
    [effectiveMarketId, selectedMarket]
  )

  const marketData = useMemo(
    () => buildMarketViewData(effectiveMarket, outcomeSide, chartNow),
    [effectiveMarket, outcomeSide, chartNow]
  )

  const tick = useMarketTick(3600, 900)
  const [liveTrades, setLiveTrades] = useState<Trade[]>(marketData.recentTrades)
  const canonicalSeries = marketData.chartDataByWindow['1D']
  const livePrice = canonicalSeries?.length ? canonicalSeries[canonicalSeries.length - 1].value : marketData.basePrice
  const liveChartDataByWindow = marketData.chartDataByWindow

  useEffect(() => {
    setLiveTrades(marketData.recentTrades)
  }, [marketData])

  useEffect(() => {
    if (!isWagerMarket || !liveWager) return
    setWagerSelectedOdds(consensusYesFromOpenBets(liveWager.openBets))
    setWagerFillTarget(undefined)
    setActiveMode('long')
    setTradeMarketId(liveWager.id)
  }, [selectedMarketId, isWagerMarket, liveWager?.id])

  useEffect(() => {
    if (tick.idx === 0) return
    if (activeTab === 'main' && selectedMarketId.startsWith('batch-')) {
      advanceBatchMarketTick(selectedMarketId, tick.t, tick.rng)
    }

    if (tick.rng() < 0.65) {
      const isBuy = tick.rng() < 0.52
      const trade: Trade = {
        id: `live-${tick.idx}-${Math.floor(tick.rng() * 1e6).toString(36)}`,
        time: new Date(tick.t).toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        price: livePrice + (tick.rng() - 0.5) * 0.2,
        quantity: Math.floor(14 + tick.rng() * 480),
        type: isBuy ? 'buy' : 'sell'
      }
      setLiveTrades((prev) => {
        const updated = [trade, ...prev]
        return updated.length > RECENT_TRADES_MAX ? updated.slice(0, RECENT_TRADES_MAX) : updated
      })
    }
  }, [tick.idx, activeTab, selectedMarketId, livePrice])

  const openTrade = (mode: 'long' | 'short') => {
    setTradeMarketId(selectedMarketId)
    setActiveMode(mode)
    if (homeMobileLayout) setMobileSheetOpen(true)
  }

  const closeMobileSheet = () => {
    setMobileSheetOpen(false)
    setActiveMode('orderbook')
    setTradeMarketId(null)
  }

  const longPos = appState.positions[selectedMarketId]?.side === 'long' ? appState.positions[selectedMarketId] : undefined
  const shortPos = appState.positions[selectedMarketId]?.side === 'short' ? appState.positions[selectedMarketId] : undefined
  const displayPrice = isWagerMarket ? wagerSelectedOdds : livePrice
  const displaySeries = liveChartDataByWindow['1D'] ?? marketData.chartDataByWindow['1D']
  const displayStartPrice = displaySeries?.[0]?.value
  const displayPriceChange =
    displayStartPrice && displayStartPrice > 0
      ? ((displayPrice - displayStartPrice) / displayStartPrice) * 100
      : 0
  const longUsd = (longPos?.shares ?? 0) * (displayPrice / 100)
  const shortUsd = (shortPos?.shares ?? 0) * ((100 - displayPrice) / 100)

  const tradePos = tradeMarketId ? appState.positions[tradeMarketId] : undefined
  const holdingShares =
    activeMode === 'long'
      ? tradePos?.side === 'long'
        ? tradePos.shares
        : 0
      : activeMode === 'short'
        ? tradePos?.side === 'short'
          ? tradePos.shares
          : 0
        : 0
  const tradeAvgEntry =
    activeMode === 'long' && tradePos?.side === 'long'
      ? tradePos.avgEntry
      : activeMode === 'short' && tradePos?.side === 'short'
        ? tradePos.avgEntry
        : undefined

  const shareMarketPayload = buildShareMarket({
    selectedMarket,
    liveChartDataByWindow,
    marketChartDataByWindow: marketData.chartDataByWindow,
    livePrice
  })

  const handleDiscoveryTrade = useCallback(
    (params: { marketId: MarketId; marketName: string; side: 'yes' | 'no'; usdAmount: number; price: number }) => {
      const isWager = params.marketId.startsWith('wager')
      const result = executeTrade({
        marketId: params.marketId,
        marketName: params.marketName,
        side: params.side === 'yes' ? 'long' : 'short',
        action: 'buy',
        usdAmount: params.usdAmount,
        price: params.price / 100,
        source: isWager ? 'wager' : 'discovery'
      })
      if (result.ok && isWager) {
        applyWagerLiquidityBuy(
          params.marketId,
          params.price,
          params.usdAmount,
          params.side === 'yes' ? 'YES' : 'NO'
        )
      }
    },
    []
  )

  const homePanelProps = {
    onOpenMarket: openMarket,
    onViewProfile: (handle: string) => openProfile(handle),
    onOpenNotifications: openNotifications,
    onCollapse: () => setHomeFeedOpen(false),
    side: homeFeedSide,
    onToggleSide: () => setHomeFeedSide((prev) => (prev === 'left' ? 'right' : 'left')),
    tickIdx: tick.idx
  } as const

  const chartsRulesBlock = isWagerMarket && liveWager ? (
    <>
      <WagerHeatmapPanel
        wager={liveWager}
        selectedOdds={wagerSelectedOdds}
        fillTarget={wagerFillTarget}
        fills={wagerFills}
        onSelectOdds={(odds, fillTarget) => {
          setWagerSelectedOdds(odds)
          setWagerFillTarget(fillTarget)
        }}
        onFillSide={(side) => {
          setActiveMode(side === 'YES' ? 'long' : 'short')
          setTradeMarketId(liveWager.id)
        }}
      />
      <RulesPanel
        variant="wager"
        rules={marketData.rules}
        openBets={liveWager.openBets}
        wagerFills={wagerFills}
        poolTotal={liveWager.pool}
        outcomeSide={outcomeSide}
        onOutcomeSideChange={setOutcomeSide}
      />
    </>
  ) : (
    <>
      <ChartPanel
        dataByWindow={liveChartDataByWindow}
        timeLeftLabel={effectiveMarket.timeLeftLabel}
        resolutionTimestamp={effectiveMarket.resolutionTimestamp}
      />
      <RulesPanel
        rules={marketData.rules}
        topHolders={marketData.topHolders}
        lpPositions={marketData.lpPositions}
        outcomeSide={outcomeSide}
        onOutcomeSideChange={setOutcomeSide}
      />
    </>
  )

  const videoBlock = (
    <div className="video-stage">
      <div className="panel video-panel">
        <VideoContainer
          market={selectedMarket}
          livePrice={displayPrice}
          priceChange={displayPriceChange}
          longUsd={longUsd}
          shortUsd={shortUsd}
          onLongClick={() => openTrade('long')}
          onShortClick={() => openTrade('short')}
          onShareClick={() => {
            setActiveMode('share')
            setTradeMarketId(null)
            if (homeMobileLayout) setMobileSheetOpen(true)
          }}
          requestedIndex={requestedPreviewIndex}
          onRequestedIndexHandled={() => setRequestedPreviewIndex(null)}
        />
      </div>
    </div>
  )

  const orderbookBlock =
    isWagerMarket && liveWager ? (
      <WagerLiquidityPanel
        wager={liveWager}
        selectedOdds={wagerSelectedOdds}
        fillTarget={wagerFillTarget}
        fills={wagerFills}
        walletBalance={appState.wallet.balanceUsd}
        activeMode={activeMode}
        compact={homeMobileLayout}
        onBack={() => {
          setActiveMode('orderbook')
          setTradeMarketId(null)
        }}
        onSelectSide={(side) => {
          setActiveMode(side === 'yes' ? 'long' : 'short')
          setTradeMarketId(liveWager.id)
        }}
        onExecuteTrade={handleDiscoveryTrade}
      />
    ) : (
      <OrderbookPanel
        activeMode={activeMode}
        currentPrice={livePrice / 100}
        compact={homeMobileLayout}
        onBack={() => {
          setActiveMode('orderbook')
          setTradeMarketId(null)
        }}
        recentTrades={liveTrades}
        walletBalance={appState.wallet.balanceUsd}
        holdingShares={holdingShares}
        marketTitle={effectiveMarket.name}
        volume24h={effectiveMarket.volume24h}
        priceChange24h={displayPriceChange}
        avgEntry={tradeAvgEntry}
        onTradeExecuted={(trade) => {
          const mId = tradeMarketId ?? selectedMarketId
          const m = getMarketById(mId)
          const isWager = mId.startsWith('wager')
          const result = executeTrade({
            marketId: mId,
            marketName: m?.name ?? 'Market',
            side: trade.side,
            action: trade.action,
            usdAmount: trade.usdAmount,
            price: trade.price,
            source: isWager ? 'wager' : 'main'
          })
          if (result.ok && isWager && trade.action === 'buy') {
            applyWagerLiquidityBuy(
              mId,
              trade.price * 100,
              trade.usdAmount,
              trade.side === 'long' ? 'YES' : 'NO'
            )
          }
        }}
        shareTargets={chats.filter((c) => c.kind === 'dm' || c.kind === 'group') as Array<{
          id: string
          kind: 'dm' | 'group'
          title: string
        }>}
        onShareToChat={(chatId) => {
          setSocialsInitialChatId(chatId)
          setPendingShare({
            key: `share-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            chatId,
            market: shareMarketPayload
          })
          setActiveMode('orderbook')
          setTradeMarketId(null)
          setActiveTab('socials')
          navigate({ type: 'socials' })
        }}
      />
    )

  const mobileActivityBlock = (
    <OrderbookPanel
      activeMode="orderbook"
      currentPrice={livePrice / 100}
      recentTrades={liveTrades}
      walletBalance={appState.wallet.balanceUsd}
      compact={homeMobileLayout}
    />
  )

  const showHomeMobileFull = activeTab === 'main' && homeFeedOpen && homeMobileLayout
  const isMobileMain = activeTab === 'main' && homeMobileLayout && !showHomeMobileFull
  const isMobileTab = homeMobileLayout && !isMobileMain

  return (
    <motion.div
      className={`layout${homeMobileLayout ? ' layout--mobile' : ''}${isMobileMain ? ' layout--mobile-main' : ''}${isMobileTab ? ' layout--mobile-tab' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {showHomeMobileFull ? (
        <motion.div
          className="layout-center layout-home-full layout-mobile-panel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          style={{ gridColumn: '1 / -1' }}
        >
          <HomePanel variant="fullscreen" {...homePanelProps} />
        </motion.div>
      ) : isMobileMain ? (
        <motion.main
          className="mobile-app"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <section className="mobile-video-section" aria-label="Market video">
            {videoBlock}
          </section>
        </motion.main>
      ) : activeTab === 'main' ? (
        <>
          <motion.div
            className={`layout-left${homeFeedOpen && !homeMobileLayout && homeFeedSide === 'left' ? ' layout-home-feed' : ''}`}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {homeFeedOpen && !homeMobileLayout && homeFeedSide === 'left' ? (
              <HomePanel variant="rail" {...homePanelProps} />
            ) : (
              chartsRulesBlock
            )}
          </motion.div>
          <motion.div
            className="layout-center"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {videoBlock}
          </motion.div>
          <motion.div
            className={`layout-right${homeFeedOpen && !homeMobileLayout && homeFeedSide === 'right' ? ' layout-home-feed' : ''}`}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {homeFeedOpen && !homeMobileLayout && homeFeedSide === 'right' ? (
              <HomePanel variant="rail" {...homePanelProps} />
            ) : (
              orderbookBlock
            )}
          </motion.div>
        </>
      ) : activeTab === 'notifications' ? (
        <motion.div
          className="layout-center layout-mobile-panel"
          initial={homeMobileLayout ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          style={{ gridColumn: '1 / -1' }}
        >
          <NotificationCenterPanel
            onBack={() => {
              setActiveTab('main')
              setHomeFeedOpen(true)
              navigate({ type: 'main', marketId: selectedMarketId })
            }}
            onOpenNotification={handleOpenNotification}
          />
        </motion.div>
      ) : activeTab === 'socials' ? (
        <motion.div
          className="layout-center layout-mobile-panel"
          initial={homeMobileLayout ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          style={{ gridColumn: '1 / -1' }}
        >
          <SocialsPanel
            onBack={() => {
              setActiveTab('main')
              navigate({ type: 'main', marketId: selectedMarketId })
            }}
            chats={chats}
            onChatRead={handleChatRead}
            shareMarket={shareMarketPayload}
            initialActiveChatId={socialsInitialChatId ?? undefined}
            pendingShare={pendingShare ?? undefined}
            onPendingShareHandled={() => setPendingShare(null)}
            pendingShareText={pendingShareText ?? undefined}
            onPendingShareTextHandled={() => setPendingShareText(null)}
            pendingShareTrade={pendingShareTrade ?? undefined}
            onPendingShareTradeHandled={() => setPendingShareTrade(null)}
            onAddFriend={(handle) => addFriendChat(handle)}
            onOpenMarket={openMarket}
            onViewProfile={(handle) => openProfile(handle)}
          />
        </motion.div>
      ) : activeTab === 'profile' ? (
        <motion.div
          className="layout-center layout-mobile-panel"
          initial={homeMobileLayout ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          style={{ gridColumn: '1 / -1' }}
        >
          <ProfilePanel
            viewingHandle={appState.ui.viewingProfileHandle}
            onBackToSelfProfile={() => openProfile(null)}
            onOpenMarket={openMarket}
            onSharePnL={(text) => {
              const targetChatId = 'group-1'
              setSocialsInitialChatId(targetChatId)
              setPendingShare(null)
              setPendingShareTrade(null)
              setPendingShareText({ key: `pnl-${Date.now()}`, chatId: targetChatId, text })
              setActiveTab('socials')
              navigate({ type: 'socials' })
            }}
            onShareTrade={(trade) => {
              const targetChatId = 'group-1'
              setSocialsInitialChatId(targetChatId)
              setPendingShare(null)
              setPendingShareText(null)
              setPendingShareTrade({ key: `trade-${Date.now()}`, chatId: targetChatId, trade })
              setActiveTab('socials')
              navigate({ type: 'socials' })
            }}
          />
        </motion.div>
      ) : null}

      {activeTab === 'discovery' && (
        <div
          className="layout-center layout-mobile-panel"
          style={{ gridColumn: '1 / -1' }}
        >
          <DiscoveryPanel
            isVisible={activeTab === 'discovery'}
            onBack={() => {
              setActiveTab('main')
              navigate({ type: 'main', marketId: selectedMarketId })
            }}
            onCreateWager={() => setCreateWagerOpen(true)}
            injectWager={pendingWager}
            onWagerInjected={() => setPendingWager(null)}
            onOpenMarket={openMarket}
            onExecuteTrade={handleDiscoveryTrade}
            onViewProfile={(handle) => openProfile(handle)}
            walletBalance={appState.wallet.balanceUsd}
          />
        </div>
      )}

      {isMobileMain && (
        <MobileTradeSheet
          open={mobileSheetOpen}
          initialPage={1}
          onClose={closeMobileSheet}
          tradeLabel={isWagerMarket ? (activeMode === 'short' ? 'Buy NO' : 'Buy YES') : activeMode === 'short' ? 'Short' : 'Long'}
          rules={chartsRulesBlock}
          trade={orderbookBlock}
          activity={mobileActivityBlock}
        />
      )}

      <BottomBar
        currentTab={
          activeTab === 'main'
            ? 'center'
            : activeTab === 'discovery'
              ? 'tab2'
              : activeTab === 'socials'
                ? 'tab3'
                : 'tab4'
        }
        hasUnreadMessages={hasUnreadMessagesFlag}
        onTabClick={(tabId) => {
          setMobileSheetOpen(false)
          if (tabId === 'tab1') {
            setActiveTab('main')
            setHomeFeedOpen((prev) => !prev)
            navigate({ type: 'main', marketId: selectedMarketId })
            return
          }
          if (tabId === 'center') {
            if (activeTab === 'main') {
              setCreateWagerOpen(true)
              return
            }
            setActiveTab('main')
            setHomeFeedOpen(false)
            navigate({ type: 'main', marketId: selectedMarketId })
            return
          }
          if (tabId === 'tab2') {
            setHomeFeedOpen(false)
            setActiveMode('orderbook')
            setTradeMarketId(null)
            setSocialsInitialChatId(null)
            setPendingShare(null)
            setActiveTab('discovery')
            navigate({ type: 'discovery' })
            return
          }
          if (tabId === 'tab3') {
            setHomeFeedOpen(false)
            setActiveMode('orderbook')
            setTradeMarketId(null)
            setSocialsInitialChatId(null)
            setPendingShare(null)
            setActiveTab('socials')
            navigate({ type: 'socials' })
            return
          }
          if (tabId === 'tab4') {
            setHomeFeedOpen(false)
            setActiveMode('orderbook')
            setTradeMarketId(null)
            setPendingShare(null)
            setSocialsInitialChatId(null)
            openProfile(null)
          }
        }}
      />

      <AnimatePresence>
        {createWagerOpen && (
          <CreateWagerView
            onClose={() => setCreateWagerOpen(false)}
            onPublish={(w) => {
              addWager(w)
              setPendingWager(w)
              setCreateWagerOpen(false)
              setActiveTab('discovery')
              navigate({ type: 'discovery' })
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default Layout
