import type { Order, Position, Trade, TradingAccount } from '../types/finance'

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export interface ExecuteResult {
  updatedAccount: TradingAccount
  updatedPositions: Position[]
  updatedTrades: Trade[]
  filledOrder: Order
  error?: string
}

export function executeMarketOrder(
  order: Order,
  currentPrice: number,
  account: TradingAccount,
  positions: Position[],
  trades: Trade[],
): ExecuteResult {
  const fillPrice = currentPrice
  const fees = fillPrice * order.quantity * account.feeRate
  const totalCost = fillPrice * order.quantity + fees

  if (order.side === 'buy') {
    if (account.cashBalance < totalCost) {
      const filledOrder: Order = { ...order, status: 'cancelled', filledAt: Date.now() }
      return { updatedAccount: account, updatedPositions: positions, updatedTrades: trades, filledOrder, error: 'Solde insuffisant' }
    }

    const existingIdx = positions.findIndex(p => p.assetId === order.assetId)
    let updatedPositions: Position[]

    if (existingIdx >= 0) {
      const existing = positions[existingIdx]
      const newQty = existing.quantity + order.quantity
      const newAvg = (existing.avgEntryPrice * existing.quantity + fillPrice * order.quantity) / newQty
      updatedPositions = positions.map((p, i) =>
        i === existingIdx
          ? {
              ...p,
              quantity: newQty,
              avgEntryPrice: newAvg,
              currentPrice: fillPrice,
              totalInvested: p.totalInvested + fillPrice * order.quantity,
              unrealizedPnL: (fillPrice - newAvg) * newQty,
              unrealizedPnLPct: newAvg > 0 ? ((fillPrice - newAvg) / newAvg) * 100 : 0,
            }
          : p
      )
    } else {
      updatedPositions = [
        ...positions,
        {
          assetId: order.assetId,
          ticker: order.ticker,
          quantity: order.quantity,
          avgEntryPrice: fillPrice,
          currentPrice: fillPrice,
          unrealizedPnL: 0,
          unrealizedPnLPct: 0,
          totalInvested: fillPrice * order.quantity,
        },
      ]
    }

    const updatedAccount: TradingAccount = {
      ...account,
      cashBalance: account.cashBalance - totalCost,
    }
    const filledOrder: Order = { ...order, status: 'filled', fillPrice, filledAt: Date.now() }
    return { updatedAccount, updatedPositions, updatedTrades: trades, filledOrder }
  }

  // SELL
  const existingIdx = positions.findIndex(p => p.assetId === order.assetId)
  if (existingIdx < 0) {
    const filledOrder: Order = { ...order, status: 'cancelled', filledAt: Date.now() }
    return { updatedAccount: account, updatedPositions: positions, updatedTrades: trades, filledOrder, error: 'Position introuvable' }
  }

  const existing = positions[existingIdx]
  if (existing.quantity < order.quantity) {
    const filledOrder: Order = { ...order, status: 'cancelled', filledAt: Date.now() }
    return { updatedAccount: account, updatedPositions: positions, updatedTrades: trades, filledOrder, error: 'Quantité insuffisante' }
  }

  const realizedPnL = (fillPrice - existing.avgEntryPrice) * order.quantity - fees
  const realizedPnLPct = existing.avgEntryPrice > 0
    ? ((fillPrice - existing.avgEntryPrice) / existing.avgEntryPrice) * 100
    : 0

  const trade: Trade = {
    id: genId(),
    assetId: order.assetId,
    ticker: order.ticker,
    side: 'sell',
    quantity: order.quantity,
    entryPrice: existing.avgEntryPrice,
    exitPrice: fillPrice,
    realizedPnL,
    realizedPnLPct,
    openedAt: order.createdAt,
    closedAt: Date.now(),
    strategyId: order.strategyId,
    fees,
  }

  let updatedPositions: Position[]
  const remainingQty = existing.quantity - order.quantity
  if (remainingQty <= 0) {
    updatedPositions = positions.filter((_, i) => i !== existingIdx)
  } else {
    updatedPositions = positions.map((p, i) =>
      i === existingIdx
        ? {
            ...p,
            quantity: remainingQty,
            totalInvested: p.avgEntryPrice * remainingQty,
            unrealizedPnL: (fillPrice - p.avgEntryPrice) * remainingQty,
            unrealizedPnLPct: p.avgEntryPrice > 0 ? ((fillPrice - p.avgEntryPrice) / p.avgEntryPrice) * 100 : 0,
          }
        : p
    )
  }

  const proceeds = fillPrice * order.quantity - fees
  const updatedAccount: TradingAccount = {
    ...account,
    cashBalance: account.cashBalance + proceeds,
  }
  const filledOrder: Order = { ...order, status: 'filled', fillPrice, filledAt: Date.now() }
  return { updatedAccount, updatedPositions, updatedTrades: [...trades, trade], filledOrder }
}

export interface CheckPendingResult {
  triggeredOrders: Order[]
  updatedAccount: TradingAccount
  updatedPositions: Position[]
  updatedTrades: Trade[]
}

export function checkPendingOrders(
  pendingOrders: Order[],
  currentPrices: Map<string, number>,
  account: TradingAccount,
  positions: Position[],
  trades: Trade[],
): CheckPendingResult {
  let acc = account
  let pos = positions
  let trd = trades
  const triggered: Order[] = []

  for (const order of pendingOrders) {
    const price = currentPrices.get(order.assetId) ?? currentPrices.get(order.ticker)
    if (price == null || order.limitPrice == null) continue

    let shouldTrigger = false
    if (order.type === 'limit' && order.side === 'buy' && price <= order.limitPrice) shouldTrigger = true
    if (order.type === 'limit' && order.side === 'sell' && price >= order.limitPrice) shouldTrigger = true
    if (order.type === 'stop_loss' && price <= order.limitPrice) shouldTrigger = true
    if (order.type === 'take_profit' && price >= order.limitPrice) shouldTrigger = true

    if (shouldTrigger) {
      const result = executeMarketOrder(order, price, acc, pos, trd)
      if (!result.error) {
        acc = result.updatedAccount
        pos = result.updatedPositions
        trd = result.updatedTrades
        triggered.push(result.filledOrder)
      }
    }
  }

  return { triggeredOrders: triggered, updatedAccount: acc, updatedPositions: pos, updatedTrades: trd }
}

export interface AccountStats {
  totalValue: number
  totalPnL: number
  totalPnLPct: number
  unrealizedPnL: number
  realizedPnL: number
  todayPnL: number
}

export function computeAccountStats(
  account: TradingAccount,
  positions: Position[],
  trades: Trade[],
  currentPrices: Map<string, number>,
): AccountStats {
  const unrealizedPnL = positions.reduce((sum, p) => {
    const price = currentPrices.get(p.assetId) ?? currentPrices.get(p.ticker) ?? p.currentPrice
    return sum + (price - p.avgEntryPrice) * p.quantity
  }, 0)

  const positionsValue = positions.reduce((sum, p) => {
    const price = currentPrices.get(p.assetId) ?? currentPrices.get(p.ticker) ?? p.currentPrice
    return sum + price * p.quantity
  }, 0)

  const realizedPnL = trades.reduce((sum, t) => sum + t.realizedPnL, 0)
  const totalValue = account.cashBalance + positionsValue
  const totalPnL = totalValue - account.initialCapital
  const totalPnLPct = account.initialCapital > 0 ? (totalPnL / account.initialCapital) * 100 : 0

  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const todayPnL = trades
    .filter(t => t.closedAt >= dayStart.getTime())
    .reduce((sum, t) => sum + t.realizedPnL, 0)

  return { totalValue, totalPnL, totalPnLPct, unrealizedPnL, realizedPnL, todayPnL }
}

export function updatePositionPrices(
  positions: Position[],
  currentPrices: Map<string, number>,
): Position[] {
  return positions.map(p => {
    const price = currentPrices.get(p.assetId) ?? currentPrices.get(p.ticker) ?? p.currentPrice
    const unrealizedPnL = (price - p.avgEntryPrice) * p.quantity
    const unrealizedPnLPct = p.avgEntryPrice > 0 ? ((price - p.avgEntryPrice) / p.avgEntryPrice) * 100 : 0
    return { ...p, currentPrice: price, unrealizedPnL, unrealizedPnLPct }
  })
}
