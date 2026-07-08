import type { Order, Position, Trade, TradingAccount } from '../types/finance'

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ---- Modèle d'exécution : commissions + slippage ----

/** Commission d'un fill selon le mode du compte (rétrocompat : absent = 'percent' sur feeRate). */
export function computeCommission(account: TradingAccount, notional: number): number {
  if (account.commissionMode === 'flat') return account.commissionFlat ?? 0
  return notional * account.feeRate
}

/** Demi-spread simulé (le spread bid-ask total est slippagePct, chaque fill en paie la moitié). */
export function halfSpreadRate(account: TradingAccount): number {
  return (account.slippagePct ?? 0) / 100 / 2
}

/** Prix de fill après slippage défavorable (achat au ask, vente au bid). */
export function applySlippage(midPrice: number, side: 'buy' | 'sell', account: TradingAccount): number {
  const half = halfSpreadRate(account)
  return side === 'buy' ? midPrice * (1 + half) : midPrice * (1 - half)
}

export interface ExecuteResult {
  updatedAccount: TradingAccount
  updatedPositions: Position[]
  updatedTrades: Trade[]
  filledOrder: Order
  error?: string
}

/**
 * Exécute un ordre à un prix donné.
 * `withSlippage: true` pour les exécutions "market" (market, stop déclenché, trailing déclenché) ;
 * `false` pour les fills limite (le prix limite est garanti, pas de slippage).
 * `now` permet au mode replay d'horodater avec le temps de la bougie.
 */
export function fillOrder(
  order: Order,
  rawPrice: number,
  withSlippage: boolean,
  account: TradingAccount,
  positions: Position[],
  trades: Trade[],
  now: number = Date.now(),
): ExecuteResult {
  const fillPrice = withSlippage ? applySlippage(rawPrice, order.side, account) : rawPrice
  const slippageApplied = Math.abs(fillPrice - rawPrice)
  const notional = fillPrice * order.quantity
  const commission = computeCommission(account, notional)

  if (order.side === 'buy') {
    const totalCost = notional + commission
    if (account.cashBalance < totalCost) {
      const filledOrder: Order = { ...order, status: 'cancelled', filledAt: now }
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
              totalInvested: p.totalInvested + notional,
              entryCommission: (p.entryCommission ?? 0) + commission,
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
          totalInvested: notional,
          openedAt: now,
          entryCommission: commission,
        },
      ]
    }

    const updatedAccount: TradingAccount = {
      ...account,
      cashBalance: account.cashBalance - totalCost,
    }
    const filledOrder: Order = { ...order, status: 'filled', fillPrice, commission, slippageApplied, filledAt: now }
    return { updatedAccount, updatedPositions, updatedTrades: trades, filledOrder }
  }

  // SELL
  const existingIdx = positions.findIndex(p => p.assetId === order.assetId)
  if (existingIdx < 0) {
    const filledOrder: Order = { ...order, status: 'cancelled', filledAt: now }
    return { updatedAccount: account, updatedPositions: positions, updatedTrades: trades, filledOrder, error: 'Position introuvable' }
  }

  const existing = positions[existingIdx]
  if (existing.quantity < order.quantity) {
    const filledOrder: Order = { ...order, status: 'cancelled', filledAt: now }
    return { updatedAccount: account, updatedPositions: positions, updatedTrades: trades, filledOrder, error: 'Quantité insuffisante' }
  }

  // Commission d'entrée imputée au prorata de la quantité vendue
  const proratedEntryFees = (existing.entryCommission ?? 0) * (order.quantity / existing.quantity)
  const totalFees = commission + proratedEntryFees
  const grossPnL = (fillPrice - existing.avgEntryPrice) * order.quantity
  const realizedPnL = grossPnL - totalFees
  const realizedPnLPct = existing.avgEntryPrice > 0
    ? ((fillPrice - existing.avgEntryPrice) / existing.avgEntryPrice) * 100
    : 0

  // RRR réalisé si un stop initial était défini sur la position
  let rrr: number | undefined
  const stop = existing.plannedStopPrice
  if (stop != null && existing.avgEntryPrice > stop) {
    const riskPerShare = existing.avgEntryPrice - stop
    rrr = (fillPrice - existing.avgEntryPrice) / riskPerShare
  }

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
    grossPnL,
    openedAt: existing.openedAt ?? order.createdAt,
    closedAt: now,
    strategyId: order.strategyId,
    fees: totalFees,
    rrr,
    initialStopPrice: stop,
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
            entryCommission: (p.entryCommission ?? 0) - proratedEntryFees,
            unrealizedPnL: (fillPrice - p.avgEntryPrice) * remainingQty,
            unrealizedPnLPct: p.avgEntryPrice > 0 ? ((fillPrice - p.avgEntryPrice) / p.avgEntryPrice) * 100 : 0,
          }
        : p
    )
  }

  const proceeds = notional - commission
  const updatedAccount: TradingAccount = {
    ...account,
    cashBalance: account.cashBalance + proceeds,
  }
  const filledOrder: Order = { ...order, status: 'filled', fillPrice, commission, slippageApplied, filledAt: now }
  return { updatedAccount, updatedPositions, updatedTrades: [...trades, trade], filledOrder }
}

/** Ordre market : fill immédiat au prix courant, slippage + commission appliqués. */
export function executeMarketOrder(
  order: Order,
  currentPrice: number,
  account: TradingAccount,
  positions: Position[],
  trades: Trade[],
  now?: number,
): ExecuteResult {
  return fillOrder(order, currentPrice, true, account, positions, trades, now)
}

// ---- Vérification des ordres en attente ----

/** Range de prix observé depuis le dernier tick (replay : high/low de la bougie). */
export interface PriceRange {
  high: number
  low: number
}

export interface CheckPendingResult {
  triggeredOrders: Order[]
  /** Ordres annulés par une exécution OCO. */
  cancelledOrderIds: string[]
  /** Patches d'état à persister sur les ordres toujours pending (trailing stop, stop-limit activé). */
  orderPatches: Record<string, Partial<Order>>
  updatedAccount: TradingAccount
  updatedPositions: Position[]
  updatedTrades: Trade[]
}

/**
 * Vérifie et exécute les ordres en attente selon la sémantique broker :
 * - limit : exécuté seulement si le prix CROISE le niveau (strictement au-delà), fill au prix limite sans slippage
 * - stop / stop_loss : à l'activation, déclenche un ordre market (slippage appliqué)
 * - stop_limit : l'activation du stop arme une jambe limite, exécutée aux conditions limit
 * - trailing_stop : le niveau suit le plus haut (sell) / plus bas (buy) à distance trailingPct
 * - OCO : l'exécution d'un ordre annule les autres ordres du même ocoGroupId
 *
 * `priceRanges` (optionnel, mode replay) permet de tester le franchissement sur le high/low
 * de la bougie plutôt que sur le seul dernier prix.
 */
export function checkPendingOrders(
  pendingOrders: Order[],
  currentPrices: Map<string, number>,
  account: TradingAccount,
  positions: Position[],
  trades: Trade[],
  priceRanges?: Map<string, PriceRange>,
  now: number = Date.now(),
): CheckPendingResult {
  let acc = account
  let pos = positions
  let trd = trades
  const triggered: Order[] = []
  const cancelledOrderIds: string[] = []
  const cancelledSet = new Set<string>()
  const orderPatches: Record<string, Partial<Order>> = {}

  for (const order of pendingOrders) {
    if (cancelledSet.has(order.id)) continue

    const price = currentPrices.get(order.assetId) ?? currentPrices.get(order.ticker)
    if (price == null) continue
    const range = priceRanges?.get(order.assetId) ?? priceRanges?.get(order.ticker)
    const hi = range?.high ?? price
    const lo = range?.low ?? price

    // Fusionne les patches déjà accumulés (trailing mis à jour plus tôt dans la même passe)
    const o: Order = { ...order, ...orderPatches[order.id] }

    let fillAt: { price: number; withSlippage: boolean } | null = null

    switch (o.type) {
      case 'limit': {
        if (o.limitPrice == null) break
        // Croisement strict : le prix doit dépasser le niveau, pas seulement le toucher
        if (o.side === 'buy' && lo < o.limitPrice) fillAt = { price: o.limitPrice, withSlippage: false }
        if (o.side === 'sell' && hi > o.limitPrice) fillAt = { price: o.limitPrice, withSlippage: false }
        break
      }
      case 'take_profit': {
        // Héritage : jambe limite de vente
        if (o.limitPrice == null) break
        if (hi > o.limitPrice) fillAt = { price: o.limitPrice, withSlippage: false }
        break
      }
      case 'stop_loss': {
        const stop = o.stopPrice ?? o.limitPrice
        if (stop == null) break
        // Le stop déclenche un ordre market au niveau d'activation
        if (o.side === 'sell' && lo <= stop) fillAt = { price: stop, withSlippage: true }
        if (o.side === 'buy' && hi >= stop) fillAt = { price: stop, withSlippage: true }
        break
      }
      case 'stop_limit': {
        const stop = o.stopPrice ?? o.limitPrice
        if (stop == null || o.limitPrice == null) break
        let armed = o.stopTriggered === true
        if (!armed) {
          const hit = o.side === 'sell' ? lo <= stop : hi >= stop
          if (hit) {
            armed = true
            orderPatches[o.id] = { ...orderPatches[o.id], stopTriggered: true }
          }
        }
        if (armed) {
          // Jambe limite : sell exécuté si le marché est au niveau ou au-delà du limite
          if (o.side === 'sell' && hi >= o.limitPrice) fillAt = { price: o.limitPrice, withSlippage: false }
          if (o.side === 'buy' && lo <= o.limitPrice) fillAt = { price: o.limitPrice, withSlippage: false }
        }
        break
      }
      case 'trailing_stop': {
        const pct = o.trailingPct
        if (pct == null || pct <= 0) break
        if (o.side === 'sell') {
          const trail = o.trailingStopPrice ?? price * (1 - pct / 100)
          // Déclenchement testé sur le niveau AVANT mise à jour (le plus bas de la barre peut toucher l'ancien stop)
          if (lo <= trail) {
            fillAt = { price: trail, withSlippage: true }
          } else {
            const newTrail = Math.max(trail, hi * (1 - pct / 100))
            if (newTrail !== o.trailingStopPrice) {
              orderPatches[o.id] = { ...orderPatches[o.id], trailingStopPrice: newTrail }
            }
          }
        } else {
          const trail = o.trailingStopPrice ?? price * (1 + pct / 100)
          if (hi >= trail) {
            fillAt = { price: trail, withSlippage: true }
          } else {
            const newTrail = Math.min(trail, lo * (1 + pct / 100))
            if (newTrail !== o.trailingStopPrice) {
              orderPatches[o.id] = { ...orderPatches[o.id], trailingStopPrice: newTrail }
            }
          }
        }
        break
      }
      case 'market':
        // Un market ne devrait pas être pending ; fill immédiat par sécurité
        fillAt = { price, withSlippage: true }
        break
    }

    if (fillAt) {
      const result = fillOrder(o, fillAt.price, fillAt.withSlippage, acc, pos, trd, now)
      if (!result.error) {
        acc = result.updatedAccount
        pos = result.updatedPositions
        trd = result.updatedTrades
        triggered.push(result.filledOrder)
        delete orderPatches[o.id]
        // OCO : annule les autres ordres du groupe
        if (o.ocoGroupId) {
          for (const other of pendingOrders) {
            if (other.id !== o.id && other.ocoGroupId === o.ocoGroupId && !cancelledSet.has(other.id)) {
              cancelledSet.add(other.id)
              cancelledOrderIds.push(other.id)
              delete orderPatches[other.id]
            }
          }
        }
      }
    }
  }

  return { triggeredOrders: triggered, cancelledOrderIds, orderPatches, updatedAccount: acc, updatedPositions: pos, updatedTrades: trd }
}

// ---- Stats de compte ----

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
