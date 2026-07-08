import type { Candle, Order, Position, Trade, TradingAccount } from '../types/finance'
import { checkPendingOrders, executeMarketOrder, updatePositionPrices } from './tradingEngine'

/**
 * Moteur de Bar Replay — fonctions pures, zéro import React.
 *
 * Une session de replay est un mini-compte ÉPHÉMÈRE (non persisté, indépendant
 * des comptes paper trading) : l'utilisateur choisit un point de départ dans
 * l'historique, le marché avance bougie par bougie, et il peut passer des ordres
 * comme en live. Les fills des ordres en attente sont testés sur le high/low de
 * chaque nouvelle bougie (pas seulement le close) et horodatés au temps de la
 * bougie — pattern thinkorswim OnDemand / TradingView Bar Replay.
 */

export interface ReplaySession {
  assetId: string
  ticker: string
  assetName: string
  currency: string
  candles: Candle[]
  startIndex: number
  currentIndex: number
  account: TradingAccount
  positions: Position[]
  pendingOrders: Order[]
  filledOrders: Order[]
  trades: Trade[]
  equityCurve: { time: number; value: number }[]
}

export interface ReplayConfig {
  assetId: string
  ticker: string
  assetName: string
  currency: string
  candles: Candle[]
  startIndex: number
  initialCapital: number
  commissionMode: 'percent' | 'flat'
  feeRate: number        // % si mode percent
  commissionFlat: number // € si mode flat
  slippagePct: number    // spread simulé %
}

export function createReplaySession(config: ReplayConfig): ReplaySession {
  const account: TradingAccount = {
    id: `replay-${Date.now()}`,
    name: 'Session replay',
    initialCapital: config.initialCapital,
    cashBalance: config.initialCapital,
    createdAt: Date.now(),
    currency: config.currency === 'USD' ? 'USD' : 'EUR',
    feeRate: config.feeRate / 100,
    commissionMode: config.commissionMode,
    commissionFlat: config.commissionFlat,
    slippagePct: config.slippagePct,
    autoRefreshEnabled: false,
    autoRefreshInterval: 30,
  }
  const startCandle = config.candles[config.startIndex]
  return {
    assetId: config.assetId,
    ticker: config.ticker,
    assetName: config.assetName,
    currency: config.currency,
    candles: config.candles,
    startIndex: config.startIndex,
    currentIndex: config.startIndex,
    account,
    positions: [],
    pendingOrders: [],
    filledOrders: [],
    trades: [],
    equityCurve: [{ time: startCandle?.time ?? Date.now(), value: config.initialCapital }],
  }
}

export function currentReplayCandle(session: ReplaySession): Candle {
  return session.candles[session.currentIndex]
}

export function isReplayFinished(session: ReplaySession): boolean {
  return session.currentIndex >= session.candles.length - 1
}

export function replayEquity(session: ReplaySession): number {
  const price = currentReplayCandle(session)?.close ?? 0
  const posValue = session.positions.reduce((s, p) => s + p.quantity * price, 0)
  return session.account.cashBalance + posValue
}

/** Avance d'une bougie : vérifie les ordres en attente sur le range de la nouvelle bougie. */
export function advanceReplayBar(session: ReplaySession): ReplaySession {
  if (isReplayFinished(session)) return session

  const newIndex = session.currentIndex + 1
  const candle = session.candles[newIndex]

  const prices = new Map<string, number>([[session.assetId, candle.close]])
  const ranges = new Map<string, { high: number; low: number }>([
    [session.assetId, { high: candle.high, low: candle.low }],
  ])

  const check = checkPendingOrders(
    session.pendingOrders,
    prices,
    session.account,
    session.positions,
    session.trades,
    ranges,
    candle.time,
  )

  const triggeredIds = new Set(check.triggeredOrders.map(o => o.id))
  const cancelledIds = new Set(check.cancelledOrderIds)
  const stillPending = session.pendingOrders
    .filter(o => !triggeredIds.has(o.id) && !cancelledIds.has(o.id))
    .map(o => (check.orderPatches[o.id] ? { ...o, ...check.orderPatches[o.id] } : o))
  const cancelled = session.pendingOrders
    .filter(o => cancelledIds.has(o.id))
    .map(o => ({ ...o, status: 'cancelled' as const, filledAt: candle.time }))

  const positions = updatePositionPrices(check.updatedPositions, prices)
  const cash = check.updatedAccount.cashBalance
  const equity = cash + positions.reduce((s, p) => s + p.quantity * candle.close, 0)

  return {
    ...session,
    currentIndex: newIndex,
    account: check.updatedAccount,
    positions,
    pendingOrders: stillPending,
    filledOrders: [...session.filledOrders, ...check.triggeredOrders, ...cancelled],
    trades: check.updatedTrades,
    equityCurve: [...session.equityCurve, { time: candle.time, value: equity }],
  }
}

export interface PlaceReplayOrderResult {
  session: ReplaySession
  error?: string
}

/** Passe un ordre dans la session : market = fill immédiat au close courant, sinon mis en attente. */
export function placeReplayOrder(session: ReplaySession, order: Order): PlaceReplayOrderResult {
  const candle = currentReplayCandle(session)
  if (!candle) return { session, error: 'Session invalide' }

  if (order.type === 'market') {
    const result = executeMarketOrder(order, candle.close, session.account, session.positions, session.trades, candle.time)
    if (result.error) return { session, error: result.error }
    const prices = new Map<string, number>([[session.assetId, candle.close]])
    return {
      session: {
        ...session,
        account: result.updatedAccount,
        positions: updatePositionPrices(result.updatedPositions, prices),
        trades: result.updatedTrades,
        filledOrders: [...session.filledOrders, result.filledOrder],
      },
    }
  }

  // Ordre en attente — initialise le trailing stop sur le prix courant
  const pending: Order = order.type === 'trailing_stop' && order.trailingStopPrice == null && order.trailingPct != null
    ? {
        ...order,
        trailingStopPrice: order.side === 'sell'
          ? candle.close * (1 - order.trailingPct / 100)
          : candle.close * (1 + order.trailingPct / 100),
      }
    : order
  return { session: { ...session, pendingOrders: [...session.pendingOrders, pending] } }
}

/** Annule un ordre en attente de la session. */
export function cancelReplayOrder(session: ReplaySession, orderId: string): ReplaySession {
  const order = session.pendingOrders.find(o => o.id === orderId)
  if (!order) return session
  return {
    ...session,
    pendingOrders: session.pendingOrders.filter(o => o.id !== orderId),
    filledOrders: [...session.filledOrders, { ...order, status: 'cancelled' }],
  }
}
