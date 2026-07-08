import type { PerformanceStats, Trade } from '../types/finance'

/**
 * Moteur de statistiques de performance — fonctions pures, zéro import React.
 * Toutes les métriques sont calculées sur le P&L NET (après commissions),
 * sur la courbe d'equity réalisée (trades fermés triés par date de clôture).
 */

export const EMPTY_PERFORMANCE_STATS: PerformanceStats = {
  totalTrades: 0,
  winRate: 0,
  profitFactor: 0,
  expectancy: 0,
  maxDrawdownPct: 0,
  maxDrawdownAbs: 0,
  sharpeRatio: 0,
  avgRRR: null,
  maxConsecutiveWins: 0,
  maxConsecutiveLosses: 0,
  avgWin: 0,
  avgLoss: 0,
  totalNetPnL: 0,
  totalFees: 0,
  avgDurationMs: 0,
}

/** Courbe d'equity réalisée : capital initial + P&L net cumulé, un point par trade fermé. */
export function realizedEquityCurve(trades: Trade[], initialCapital: number): { time: number; value: number }[] {
  const sorted = [...trades].sort((a, b) => a.closedAt - b.closedAt)
  let equity = initialCapital
  const curve: { time: number; value: number }[] = []
  for (const t of sorted) {
    equity += t.realizedPnL
    curve.push({ time: t.closedAt, value: equity })
  }
  return curve
}

/** Clé de semaine ISO-simplifiée : lundi 00:00 local de la semaine du timestamp. */
function weekStart(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = dimanche
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return d.getTime()
}

/**
 * Sharpe ratio annualisé sur base hebdomadaire :
 * regroupe le P&L net par semaine calendaire, construit la série d'equity de fin
 * de semaine, calcule les rendements hebdomadaires puis mean/std × √52 (risk-free = 0).
 * Retourne 0 si moins de 2 semaines de données.
 */
export function weeklySharpe(trades: Trade[], initialCapital: number): number {
  if (trades.length === 0 || initialCapital <= 0) return 0
  const sorted = [...trades].sort((a, b) => a.closedAt - b.closedAt)

  // P&L net agrégé par semaine
  const pnlByWeek = new Map<number, number>()
  for (const t of sorted) {
    const w = weekStart(t.closedAt)
    pnlByWeek.set(w, (pnlByWeek.get(w) ?? 0) + t.realizedPnL)
  }

  // Série continue de semaines entre la première et la dernière (les semaines sans trade = 0)
  const weeks = [...pnlByWeek.keys()].sort((a, b) => a - b)
  const first = weeks[0]
  const last = weeks[weeks.length - 1]
  const WEEK_MS = 7 * 24 * 3600 * 1000

  const returns: number[] = []
  let equity = initialCapital
  for (let w = first; w <= last; w += WEEK_MS) {
    const pnl = pnlByWeek.get(weekStart(w)) ?? 0
    const prev = equity
    equity += pnl
    if (prev > 0) returns.push((equity - prev) / prev)
  }

  if (returns.length < 2) return 0
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (returns.length - 1)
  const std = Math.sqrt(variance)
  return std > 0 ? (mean / std) * Math.sqrt(52) : 0
}

export function computePerformanceStats(trades: Trade[], initialCapital: number): PerformanceStats {
  if (trades.length === 0) return EMPTY_PERFORMANCE_STATS

  const sorted = [...trades].sort((a, b) => a.closedAt - b.closedAt)
  const wins = sorted.filter(t => t.realizedPnL > 0)
  const losses = sorted.filter(t => t.realizedPnL <= 0)

  const grossProfit = wins.reduce((s, t) => s + t.realizedPnL, 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.realizedPnL, 0))

  const winRate = wins.length / sorted.length
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

  const totalNetPnL = sorted.reduce((s, t) => s + t.realizedPnL, 0)
  const expectancy = totalNetPnL / sorted.length

  // Max drawdown sur la courbe d'equity réalisée (le capital initial est le premier pic)
  let peak = initialCapital
  let maxDrawdownAbs = 0
  let maxDrawdownPct = 0
  let equity = initialCapital
  for (const t of sorted) {
    equity += t.realizedPnL
    if (equity > peak) peak = equity
    const ddAbs = peak - equity
    if (ddAbs > maxDrawdownAbs) maxDrawdownAbs = ddAbs
    if (peak > 0) {
      const ddPct = ddAbs / peak
      if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct
    }
  }

  // Séries de gains / pertes consécutifs
  let maxConsecutiveWins = 0
  let maxConsecutiveLosses = 0
  let curWins = 0
  let curLosses = 0
  for (const t of sorted) {
    if (t.realizedPnL > 0) {
      curWins++
      curLosses = 0
      if (curWins > maxConsecutiveWins) maxConsecutiveWins = curWins
    } else {
      curLosses++
      curWins = 0
      if (curLosses > maxConsecutiveLosses) maxConsecutiveLosses = curLosses
    }
  }

  const withRRR = sorted.filter(t => t.rrr != null)
  const avgRRR = withRRR.length > 0
    ? withRRR.reduce((s, t) => s + (t.rrr ?? 0), 0) / withRRR.length
    : null

  const avgWin = wins.length > 0 ? grossProfit / wins.length : 0
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0
  const totalFees = sorted.reduce((s, t) => s + t.fees, 0)
  const avgDurationMs = sorted.reduce((s, t) => s + Math.max(0, t.closedAt - t.openedAt), 0) / sorted.length

  return {
    totalTrades: sorted.length,
    winRate,
    profitFactor,
    expectancy,
    maxDrawdownPct,
    maxDrawdownAbs,
    sharpeRatio: weeklySharpe(sorted, initialCapital),
    avgRRR,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    avgWin,
    avgLoss,
    totalNetPnL,
    totalFees,
    avgDurationMs,
  }
}

/** Formatte une durée de position en libellé court (ex. "3j 4h", "2h 15m", "45s"). */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '—'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}j ${h % 24}h`
  if (h > 0) return `${h}h ${m % 60}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}
