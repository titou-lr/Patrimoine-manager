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

// ---- Timeframe des chandeliers (indépendant de la période) ----
// 'auto' = mapping historique période → intervalle (comportement legacy)

export type CandleInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1wk' | '1mo'

// ---- Sous-onglets Finance ----

export type FinanceTab = 'market' | 'analysis' | 'trading' | 'journal' | 'replay' | 'screener' | 'ai' | 'alerts'

// ---- Trading ----

export type OrderType = 'market' | 'limit' | 'stop_loss' | 'take_profit' | 'stop_limit' | 'trailing_stop'
export type OrderSide = 'buy' | 'sell'
export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'expired'

export interface Order {
  id: string
  assetId: string
  ticker: string
  side: OrderSide
  type: OrderType
  quantity: number
  limitPrice?: number        // limit / take_profit / stop_limit (jambe limite)
  stopPrice?: number         // stop_loss / stop_limit (niveau d'activation) — les anciens stop_loss utilisent limitPrice en fallback
  trailingPct?: number       // trailing_stop — distance en % du plus haut (sell) / plus bas (buy)
  trailingStopPrice?: number // trailing_stop — niveau courant du stop (high-water mark)
  stopTriggered?: boolean    // stop_limit — true une fois le stop activé (devient une jambe limite)
  ocoGroupId?: string        // OCO — l'exécution d'un ordre du groupe annule les autres
  fillPrice?: number
  commission?: number        // commission payée au fill
  slippageApplied?: number   // écart de prix dû au spread simulé (€ par unité)
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
  openedAt?: number          // timestamp de la première entrée (durée de détention réelle)
  entryCommission?: number   // commissions d'entrée cumulées (imputées au prorata à la sortie)
  plannedStopPrice?: number  // stop initial prévu (position sizing) — sert au calcul du RRR réalisé
}

export interface Trade {
  id: string
  assetId: string
  ticker: string
  side: OrderSide
  quantity: number
  entryPrice: number
  exitPrice: number
  realizedPnL: number        // P&L net (après commissions entrée + sortie)
  realizedPnLPct: number
  grossPnL?: number          // P&L brut avant commissions
  openedAt: number
  closedAt: number
  strategyId?: string
  fees: number               // commissions totales imputées (entrée au prorata + sortie)
  rrr?: number               // RRR réalisé = (exit-entry)/(entry-stop) si un stop initial était défini
  initialStopPrice?: number
  note?: string              // note libre de l'utilisateur (journal)
}

export type CommissionMode = 'percent' | 'flat'

export interface TradingAccount {
  id: string
  name: string
  initialCapital: number
  cashBalance: number
  createdAt: number
  currency: 'EUR' | 'USD'
  feeRate: number                    // commission % (mode 'percent') — champ historique
  commissionMode?: CommissionMode    // absent = 'percent' (rétrocompat)
  commissionFlat?: number            // € par ordre (mode 'flat')
  slippagePct?: number               // spread bid-ask simulé en % (half-spread appliqué par fill)
  autoRefreshEnabled: boolean
  autoRefreshInterval: number
}

// ---- Journal / Performance ----

export interface PerformanceStats {
  totalTrades: number
  winRate: number            // 0-1
  profitFactor: number       // gains bruts / pertes brutes (net de frais)
  expectancy: number         // espérance de gain net moyenne par trade (€)
  maxDrawdownPct: number     // 0-1, sur la courbe d'equity réalisée
  maxDrawdownAbs: number     // €
  sharpeRatio: number        // annualisé, base hebdomadaire (√52), risk-free = 0
  avgRRR: number | null      // moyenne des RRR réalisés (trades avec stop initial défini)
  maxConsecutiveWins: number
  maxConsecutiveLosses: number
  avgWin: number             // gain net moyen des trades gagnants (€)
  avgLoss: number            // perte nette moyenne des trades perdants (€, valeur positive)
  totalNetPnL: number
  totalFees: number
  avgDurationMs: number
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
