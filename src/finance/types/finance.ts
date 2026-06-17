// ---- Données de marché ----

export type AssetClass = 'equity' | 'etf' | 'crypto' | 'forex' | 'commodity' | 'bond'

export interface FinanceAsset {
  id: string
  ticker: string
  name: string
  assetClass: AssetClass
  currency: string
  description?: string
}

export interface PriceQuote {
  ticker: string
  price: number
  change: number
  changePct: number
  open: number
  high: number
  low: number
  previousClose: number
  volume?: number
  marketCap?: number
  timestamp: number
}

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface HistoricalData {
  ticker: string
  candles: Candle[]
  fetchedAt: number
}

// ---- Cache ----

export interface PriceCache {
  [ticker: string]: {
    quote: PriceQuote
    fetchedAt: number
  }
}

export interface HistoricalCache {
  [ticker: string]: HistoricalData
}

// ---- Watchlist ----

export interface WatchlistItem {
  assetId: string
  addedAt: number
}

// ---- Alertes prix ----

export type AlertCondition = 'above' | 'below' | 'change_pct_up' | 'change_pct_down'

export interface PriceAlert {
  id: string
  assetId: string
  condition: AlertCondition
  threshold: number
  triggered: boolean
  createdAt: number
  triggeredAt?: number
  note?: string
}

// ---- Période historique ----

export type HistoricalPeriod = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y'

// ---- Sous-onglets Finance ----

export type FinanceTab = 'market' | 'analysis' | 'trading' | 'screener' | 'ai' | 'alerts'

// ---- Trading ----

export type OrderType = 'market' | 'limit' | 'stop_loss' | 'take_profit'
export type OrderSide = 'buy' | 'sell'
export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'expired'

export interface Order {
  id: string
  assetId: string
  ticker: string
  side: OrderSide
  type: OrderType
  quantity: number
  limitPrice?: number
  fillPrice?: number
  status: OrderStatus
  createdAt: number
  filledAt?: number
  expiresAt?: number
  strategyId?: string
}

export interface Position {
  assetId: string
  ticker: string
  quantity: number
  avgEntryPrice: number
  currentPrice: number
  unrealizedPnL: number
  unrealizedPnLPct: number
  totalInvested: number
}

export interface Trade {
  id: string
  assetId: string
  ticker: string
  side: OrderSide
  quantity: number
  entryPrice: number
  exitPrice: number
  realizedPnL: number
  realizedPnLPct: number
  openedAt: number
  closedAt: number
  strategyId?: string
  fees: number
}

export interface TradingAccount {
  id: string
  name: string
  initialCapital: number
  cashBalance: number
  createdAt: number
  currency: 'EUR' | 'USD'
  feeRate: number
  autoRefreshEnabled: boolean
  autoRefreshInterval: number
}

// ---- Stratégies ----

export type SignalType = 'buy' | 'sell' | 'hold'

export interface Signal {
  type: SignalType
  strength: number
  reason: string
}

export interface StrategyParam {
  key: string
  label: string
  type: 'number' | 'select'
  defaultValue: number | string
  min?: number
  max?: number
  step?: number
  options?: { value: string; label: string }[]
}

export interface TradingStrategy {
  id: string
  label: string
  description: string
  params: StrategyParam[]
  run: (candles: Candle[], params: Record<string, number | string>) => Signal
}

// ---- Screener ----

export interface ScreenerFilter {
  assetClasses: AssetClass[]
  minChangePct?: number
  maxChangePct?: number
  rsiMin?: number
  rsiMax?: number
  minVolume?: number
  period: HistoricalPeriod
}

export interface ScreenerResult {
  asset: FinanceAsset
  quote: PriceQuote
  rsi?: number
  atr?: number
  signal?: SignalType
}

// ---- Backtest ----

export interface BacktestConfig {
  strategyId: string
  assetId: string
  params: Record<string, number | string>
  startDate: number
  endDate: number
  initialCapital: number
  feeRate: number
}

export interface BacktestTrade {
  side: OrderSide
  price: number
  quantity: number
  date: number
  pnl?: number
}

export interface BacktestResult {
  config: BacktestConfig
  trades: BacktestTrade[]
  finalCapital: number
  totalReturn: number
  totalReturnAbs: number
  maxDrawdown: number
  winRate: number
  totalTrades: number
  profitFactor: number
  sharpeRatio: number
  buyAndHoldReturn: number
  equityCurve: { time: number; value: number }[]
}
