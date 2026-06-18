# Betski UI Cleanup Roadmap

> HomePanel is excluded from this roadmap. See [CLEANUP_NOTES.md](./CLEANUP_NOTES.md).

## Completed (Phases 0–2)

| Step | Change |
|------|--------|
| Phase 0 | `CLEANUP_NOTES.md` — HomePanel deferral note |
| Phase 2a | `RECENT_TRADES_MAX`, `CHART_TAIL_MAX`, `HOME_MOBILE_BREAKPOINT` → `src/constants/layout.ts` |
| Phase 2b | `useHomeMobileLayout` → `src/hooks/useHomeMobileLayout.ts` |
| Phase 2c | `buildShareMarket` → `src/utils/buildShareMarket.ts` |
| Phase 2d | Pending share types → `src/types/layoutShare.ts` |

`Layout.tsx`: **715 → 623 lines** (after Phase 2 extractions).

---

## Files still over 500 lines (TS + CSS)

| Lines | File | Notes |
|------:|------|-------|
| 1093 | `DiscoveryPanel.css` | Shell/grid — do not split yet |
| 823 | `HomePanel.css` | **Deferred** redesign |
| 574 | `discovery/CreateWagerView.css` | Leaf CSS already extracted |
| 623 | `Layout.tsx` | Next hook extractions (medium risk) |
| 614 | `HomePanel.tsx` | **Deferred** redesign |
| 560 | `OrderbookPanel.tsx` | Inline `TradingForm` ~400 lines |
| 543 | `Panel.css` | Shared foundation — high risk |
| 530 | `DiscoveryAdminPanel.tsx` | Inline `PreviewLinksEditor` |
| 509 | `ChartPanel.tsx` | Path builders + mock data inline |
| 505 | `ProfilePanel.css` | Shell only after Phase 1 split |
| 482 | `SocialsPanel.css` | Shell portions — defer |
| 547 | `DiscoveryPanel.tsx` | Row shell CSS still in shell |

---

## Safest next 10 cleanup steps (zero visual-risk unless noted)

1. ~~`CLEANUP_NOTES.md` HomePanel deferral~~ ✅
2. ~~Layout constants → `src/constants/layout.ts`~~ ✅
3. ~~`useHomeMobileLayout` → `src/hooks/useHomeMobileLayout.ts`~~ ✅
4. ~~`buildShareMarket` → `src/utils/buildShareMarket.ts`~~ ✅
5. ~~Pending share types → `src/types/layoutShare.ts`~~ ✅
6. `formatTime` → `src/utils/chartFormat.ts`
7. `moveItem` → `src/utils/moveItem.ts`
8. `createPreviewItem` → `src/data/discoveryAdmin.ts`
9. Orderbook `defaultRecentTrades` factory → `src/data/mockRecentTrades.ts`
10. Extract `PreviewLinksEditor` to `src/components/discovery/admin/PreviewLinksEditor.tsx` (TSX only, no CSS)

---

## Zero visual-risk steps (remaining)

Steps 6–9 above — pure moves, no JSX/CSS/value changes.

---

## Medium / high risk steps (defer)

| Step | Risk | File |
|------|------|------|
| Extract Layout live tick effect to `useLiveMarketFeed` | **High** | `Layout.tsx` |
| Extract `TradingForm` from OrderbookPanel | **Medium** | `OrderbookPanel.tsx` |
| Chart path builders / Y-scale extraction | **Medium** | `ChartPanel.tsx` |
| Layout tab/share state hooks | **Medium** | `Layout.tsx` |
| MarketRow/WagerRow CSS split | **High** | `DiscoveryPanel.css` |
| `Panel.css` split | **High** | shared panels |
| `DiscoveryPanel.css` shell split | **Medium** | grid tracks must stay paired |
| Layout presentational extractions (`ChartsRulesBlock`, `VideoStage`, etc.) | **Low–Medium** | `Layout.tsx` |

---

## CSS files not to touch yet

- `HomePanel.css` (deferred redesign)
- `DiscoveryPanel.css` shell/grid sections
- `Panel.css` (shared foundation)
- `Layout.css` (responsive grid)
- `SocialsPanel.css`, `ProfilePanel.css` shell portions

---

## Ready for visual polish?

**Partially.** Profile and Discovery leaf components are modularized with co-located CSS. Safe polish targets: extracted profile/discovery leaf components. **Not ready** for global polish until Layout, OrderbookPanel, and ChartPanel shrink and HomePanel redesign is scoped separately.

---

## Panel audits (read-only)

### Layout.tsx (623 lines)

**Responsibilities:** App shell grid, tab routing, hash sync, market/wager context, live chart tail + tick simulation, trade modes, home feed rail, socials share handoff, discovery wager injection, profile navigation, panel mounting.

**Hook candidates:** `useLayoutTabSync`, `useLayoutShareState`, `useLayoutChats`, `useLiveMarketFeed` (high risk), `useWagerMarketReset`.

**Presentational extractions:** `ChartsRulesBlock`, `VideoStage`, `OrderbookSlot`, `MainTabGrid`.

**Do not touch yet:** Live tick `useEffect`, `openMarket`/`openProfile`/`handleDiscoveryTrade`, BottomBar `onTabClick`, `homePanelProps`, initial hash bootstrap, `effectiveMarketId` math.

### OrderbookPanel.tsx (560 lines)

**Mixed concerns:** Inline `TradingForm` (~400 lines, lines 21–425), mode switching via `AnimatePresence`, default mock `recentTrades` (lines 429–441), recent trades list, share mode delegates to `ShareForm`.

**Safest next step:** Extract `defaultRecentTrades` factory to `src/data/mockRecentTrades.ts`.

**Single highest-value step:** Extract `TradingForm` to `src/components/trading/TradingForm.tsx` (verbatim inline styles).

### ChartPanel.tsx (509 lines)

**Logic:** Time window state, ResizeObserver, internal mock data generation, Y-axis range, path builders, hover crosshair, Framer Motion path animation, time window tabs.

**Safest next step:** Move `formatTime` to `src/utils/chartFormat.ts`.

**Do not touch:** Framer Motion `d` path morphing, padding constants, `hasMountedRef` guard, external vs internal data resolution.

### DiscoveryAdminPanel.tsx (530 lines)

**Mixed concerns:** Inline `PreviewLinksEditor` (lines 43–171), catalog CRUD, tab UI, persistence via `discoveryStore`, co-located `DiscoveryAdminPanel.css`.

**Safest next step:** Move `moveItem` to `src/utils/moveItem.ts`.

**Child UI to extract:** `PreviewLinksEditor`, `AdminBatchRow`, `AdminWagerRow`.
