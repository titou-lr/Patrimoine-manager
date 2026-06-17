import type { BacktestConfig, BacktestResult, BacktestTrade, Candle } from '../types/finance'
import { getStrategy } from './strategies/index'

function computeMaxDrawdown(equityCurve: number[]): number {
  let peak = equityCurve[0] ?? 0
  let maxDD = 0
  for (const val of equityCurve) {
    if (val > peak) peak = val
    if (peak > 0) {
      const dd = (peak - val) / peak
      if (dd > maxDD) maxDD = dd
    }
  }
  return maxDD
}

export function runBacktest(config: BacktestConfig, candles: Candle[]): BacktestResult {
  const strategy = getStrategy(config.strategyId)
  if (!strategy) {
    return {
      config,
      trades: [],
      finalCapital: config.initialCapital,
      totalReturn: 0,
      totalReturnAbs: 0,
      maxDrawdown: 0,
      winRate: 0,
      totalTrades: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      buyAndHoldReturn: 0,
      equityCurve: [],
    }
  }

  // Filter candles in range
  const filtered = candles.filter(c => c.time >= config.startDate && c.time <= config.endDate)
  if (filtered.length < 2) {
    return {
      config,
      trades: [],
      finalCapital: config.initialCapital,
      totalReturn: 0,
      totalReturnAbs: 0,
      maxDrawdown: 0,
      winRate: 0,
      totalTrades: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      buyAndHoldReturn: 0,
      equityCurve: [],
    }
  }

  let cash = config.initialCapital
  let position = 0       // shares held
  let entryPrice = 0
  const backtestTrades: BacktestTrade[] = []
  const equityCurveValues: number[] = []
  const equityCurve: { time: number; value: number }[] = []

  const dailyReturns: number[] = []
  let prevEquity = config.initialCapital

  for (let i = 0; i < filtered.length - 1; i++) {
    const historySlice = filtered.slice(0, i + 1)
    const signal = strategy.run(historySlice, config.params)

    // Execute on next candle open to avoid look-ahead bias
    const nextCandle = filtered[i + 1]
    const execPrice = nextCandle.open

    if (signal.type === 'buy' && position === 0 && cash > 0) {
      const fees = execPrice * (config.feeRate)
      const costPerShare = execPrice + fees
      const qty = Math.floor(cash / costPerShare)
      if (qty > 0) {
        const totalCost = qty * execPrice * (1 + config.feeRate)
        cash -= totalCost
        position = qty
        entryPrice = execPrice
        backtestTrades.push({ side: 'buy', price: execPrice, quantity: qty, date: nextCandle.time })
      }
    } else if (signal.type === 'sell' && position > 0) {
      const fees = execPrice * position * config.feeRate
      const proceeds = execPrice * position - fees
      const pnl = proceeds - entryPrice * position * (1 + config.feeRate)
      cash += proceeds
      backtestTrades.push({ side: 'sell', price: execPrice, quantity: position, date: nextCandle.time, pnl })
      position = 0
      entryPrice = 0
    }

    // Equity at end of this bar
    const equity = cash + position * filtered[i].close
    equityCurveValues.push(equity)
    equityCurve.push({ time: filtered[i].time, value: equity })

    if (i > 0 && prevEquity > 0) {
      dailyReturns.push((equity - prevEquity) / prevEquity)
    }
    prevEquity = equity
  }

  // Close open position at end
  const lastCandle = filtered[filtered.length - 1]
  if (position > 0) {
    const fees = lastCandle.close * position * config.feeRate
    const proceeds = lastCandle.close * position - fees
    const pnl = proceeds - entryPrice * position * (1 + config.feeRate)
    cash += proceeds
    backtestTrades.push({ side: 'sell', price: lastCandle.close, quantity: position, date: lastCandle.time, pnl })
    position = 0
  }
  equityCurve.push({ time: lastCandle.time, value: cash })
  equityCurveValues.push(cash)

  // Metrics
  const finalCapital = cash
  const totalReturnAbs = finalCapital - config.initialCapital
  const totalReturn = config.initialCapital > 0 ? (totalReturnAbs / config.initialCapital) * 100 : 0
  const maxDrawdown = computeMaxDrawdown(equityCurveValues)

  const sellTrades = backtestTrades.filter(t => t.side === 'sell' && t.pnl !== undefined)
  const winningTrades = sellTrades.filter(t => (t.pnl ?? 0) > 0)
  const winRate = sellTrades.length > 0 ? winningTrades.length / sellTrades.length : 0
  const totalTrades = sellTrades.length

  const grossProfit = winningTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const grossLoss = Math.abs(sellTrades.filter(t => (t.pnl ?? 0) <= 0).reduce((s, t) => s + (t.pnl ?? 0), 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

  // Sharpe ratio (annualized, risk-free = 0)
  let sharpeRatio = 0
  if (dailyReturns.length > 1) {
    const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
    const variance = dailyReturns.reduce((a, r) => a + (r - mean) ** 2, 0) / dailyReturns.length
    const std = Math.sqrt(variance)
    sharpeRatio = std > 0 ? (mean / std) * Math.sqrt(252) : 0
  }

  const firstClose = filtered[0].close
  const lastClose = filtered[filtered.length - 1].close
  const buyAndHoldReturn = firstClose > 0 ? ((lastClose - firstClose) / firstClose) * 100 : 0

  return {
    config,
    trades: backtestTrades,
    finalCapital,
    totalReturn,
    totalReturnAbs,
    maxDrawdown,
    winRate,
    totalTrades,
    profitFactor,
    sharpeRatio,
    buyAndHoldReturn,
    equityCurve,
  }
}
