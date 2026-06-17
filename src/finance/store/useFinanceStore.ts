import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  FinanceAsset, WatchlistItem, PriceAlert, FinanceTab,
  TradingAccount, Order, Position, Trade,
} from '../types/finance'
import { FINANCE_ASSETS } from '../data/financeAssets'

interface FinanceStore {
  activeTab: FinanceTab
  setActiveTab: (tab: FinanceTab) => void

  selectedAssetId: string | null
  setSelectedAssetId: (id: string | null) => void

  watchlist: WatchlistItem[]
  addToWatchlist: (assetId: string) => void
  removeFromWatchlist: (assetId: string) => void

  priceAlerts: PriceAlert[]
  addPriceAlert: (alert: PriceAlert) => void
  removePriceAlert: (id: string) => void
  triggerPriceAlert: (id: string) => void

  aiApiKey: string
  setAiApiKey: (key: string) => void

  autoRefreshEnabled: boolean
  autoRefreshInterval: number
  setAutoRefresh: (enabled: boolean, intervalSec?: number) => void

  // ---- Comptes de trading ----
  tradingAccounts: TradingAccount[]
  activeTradingAccountId: string | null
  addTradingAccount: (account: TradingAccount) => void
  updateTradingAccount: (id: string, patch: Partial<TradingAccount>) => void
  removeTradingAccount: (id: string) => void
  setActiveTradingAccount: (id: string) => void

  // ---- Ordres par compte ----
  orders: Record<string, Order[]>
  addOrder: (accountId: string, order: Order) => void
  updateOrder: (accountId: string, orderId: string, patch: Partial<Order>) => void
  cancelOrder: (accountId: string, orderId: string) => void

  // ---- Positions par compte ----
  positions: Record<string, Position[]>
  setPositions: (accountId: string, positions: Position[]) => void

  // ---- Trades fermés par compte ----
  trades: Record<string, Trade[]>
  addTrade: (accountId: string, trade: Trade) => void
  setTrades: (accountId: string, trades: Trade[]) => void

  // ---- Stratégie active par compte ----
  activeStrategyId: Record<string, string>
  setActiveStrategy: (accountId: string, strategyId: string) => void
  strategyParams: Record<string, Record<string, number | string>>
  setStrategyParams: (accountId: string, params: Record<string, number | string>) => void
}

const DEFAULT_WATCHLIST_IDS = [
  'cac40', 'sp500', 'nasdaq',
  'apple', 'nvidia', 'lvmh', 'totalenergies',
  'msci_world', 'sp500_etf',
  'bitcoin', 'ethereum', 'solana',
  'eurusd', 'gbpusd',
  'gold', 'oil_wti',
  'us10y',
  'airbus', 'sanofi', 'schneider',
]

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set) => ({
      activeTab: 'market',
      setActiveTab: (tab) => set({ activeTab: tab }),

      selectedAssetId: null,
      setSelectedAssetId: (id) => set({ selectedAssetId: id }),

      watchlist: DEFAULT_WATCHLIST_IDS.map((id) => ({ assetId: id, addedAt: Date.now() })),
      addToWatchlist: (assetId) =>
        set((s) => ({
          watchlist: s.watchlist.some((w) => w.assetId === assetId)
            ? s.watchlist
            : [...s.watchlist, { assetId, addedAt: Date.now() }],
        })),
      removeFromWatchlist: (assetId) =>
        set((s) => ({ watchlist: s.watchlist.filter((w) => w.assetId !== assetId) })),

      priceAlerts: [],
      addPriceAlert: (alert) => set((s) => ({ priceAlerts: [...s.priceAlerts, alert] })),
      removePriceAlert: (id) => set((s) => ({ priceAlerts: s.priceAlerts.filter((a) => a.id !== id) })),
      triggerPriceAlert: (id) =>
        set((s) => ({
          priceAlerts: s.priceAlerts.map((a) =>
            a.id === id ? { ...a, triggered: true, triggeredAt: Date.now() } : a
          ),
        })),

      aiApiKey: '',
      setAiApiKey: (key) => set({ aiApiKey: key }),

      autoRefreshEnabled: false,
      autoRefreshInterval: 30,
      setAutoRefresh: (enabled, intervalSec) =>
        set((s) => ({
          autoRefreshEnabled: enabled,
          autoRefreshInterval: intervalSec ?? s.autoRefreshInterval,
        })),

      // ---- Trading ----

      tradingAccounts: [],
      activeTradingAccountId: null,
      addTradingAccount: (account) =>
        set((s) => ({ tradingAccounts: [...s.tradingAccounts, account] })),
      updateTradingAccount: (id, patch) =>
        set((s) => ({
          tradingAccounts: s.tradingAccounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
      removeTradingAccount: (id) =>
        set((s) => ({
          tradingAccounts: s.tradingAccounts.filter((a) => a.id !== id),
          activeTradingAccountId: s.activeTradingAccountId === id ? null : s.activeTradingAccountId,
        })),
      setActiveTradingAccount: (id) => set({ activeTradingAccountId: id }),

      orders: {},
      addOrder: (accountId, order) =>
        set((s) => ({
          orders: {
            ...s.orders,
            [accountId]: [...(s.orders[accountId] ?? []), order],
          },
        })),
      updateOrder: (accountId, orderId, patch) =>
        set((s) => ({
          orders: {
            ...s.orders,
            [accountId]: (s.orders[accountId] ?? []).map((o) =>
              o.id === orderId ? { ...o, ...patch } : o
            ),
          },
        })),
      cancelOrder: (accountId, orderId) =>
        set((s) => ({
          orders: {
            ...s.orders,
            [accountId]: (s.orders[accountId] ?? []).map((o) =>
              o.id === orderId ? { ...o, status: 'cancelled' as const } : o
            ),
          },
        })),

      positions: {},
      setPositions: (accountId, positions) =>
        set((s) => ({ positions: { ...s.positions, [accountId]: positions } })),

      trades: {},
      addTrade: (accountId, trade) =>
        set((s) => ({
          trades: {
            ...s.trades,
            [accountId]: [...(s.trades[accountId] ?? []), trade],
          },
        })),
      setTrades: (accountId, trades) =>
        set((s) => ({ trades: { ...s.trades, [accountId]: trades } })),

      activeStrategyId: {},
      setActiveStrategy: (accountId, strategyId) =>
        set((s) => ({ activeStrategyId: { ...s.activeStrategyId, [accountId]: strategyId } })),

      strategyParams: {},
      setStrategyParams: (accountId, params) =>
        set((s) => ({ strategyParams: { ...s.strategyParams, [accountId]: params } })),
    }),
    {
      name: 'patrimoine-finance',
      partialize: (s) => ({
        watchlist: s.watchlist,
        priceAlerts: s.priceAlerts,
        aiApiKey: s.aiApiKey,
        autoRefreshInterval: s.autoRefreshInterval,
        tradingAccounts: s.tradingAccounts,
        activeTradingAccountId: s.activeTradingAccountId,
        orders: s.orders,
        positions: s.positions,
        trades: s.trades,
        activeStrategyId: s.activeStrategyId,
        strategyParams: s.strategyParams,
      }),
    }
  )
)

export function getAssetById(id: string): FinanceAsset | undefined {
  return FINANCE_ASSETS.find((a) => a.id === id)
}
