import type {
  BudgetEnvelope,
  BudgetTransaction,
  EnvelopeMonthlyStat,
  MonthlyBudgetSnapshot,
  SimulationGapResult,
} from '../types/budget'
import type { GlobalParams } from '../../types'

// ── Helpers partagés du module Budget (source unique) ───────────────────────

export function txMonth(date: string): string {
  return date.slice(0, 7)  // YYYY-MM-DD → YYYY-MM
}

export function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function computeEnvelopeStat(
  envelope: BudgetEnvelope,
  transactions: BudgetTransaction[],
  month: string,
  carryOver: number
): EnvelopeMonthlyStat {
  const monthTxs = transactions.filter(
    (t) => t.envelopeId === envelope.id && txMonth(t.date) === month && t.type === 'expense'
  )
  const spent = monthTxs.reduce((sum, t) => sum + t.amount, 0)
  const allocated = envelope.monthlyAllocation + (envelope.rollover ? carryOver : 0)
  const remaining = allocated - spent

  return {
    envelopeId: envelope.id,
    allocated,
    spent,
    remaining,
    carryOverFromPrevious: envelope.rollover ? carryOver : 0,
  }
}

export function computeMonthlySnapshot(
  transactions: BudgetTransaction[],
  envelopes: BudgetEnvelope[],
  month: string,
  previousSnapshot?: MonthlyBudgetSnapshot
): MonthlyBudgetSnapshot {
  const monthTxs = transactions.filter((t) => txMonth(t.date) === month)

  const totalIncome = monthTxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = monthTxs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalSaved = Math.max(0, totalIncome - totalExpenses)
  const realSavingsRate = totalIncome > 0 ? totalSaved / totalIncome : 0

  const byEnvelope: Record<string, EnvelopeMonthlyStat> = {}
  for (const envelope of envelopes.filter((e) => e.active)) {
    const prevStat = previousSnapshot?.byEnvelope[envelope.id]
    const prevRemaining = prevStat?.remaining ?? 0
    const carryOver = envelope.rollover && prevRemaining > 0 ? prevRemaining : 0
    byEnvelope[envelope.id] = computeEnvelopeStat(envelope, transactions, month, carryOver)
  }

  return {
    month,
    totalIncome,
    totalExpenses,
    totalSaved,
    realSavingsRate,
    byEnvelope,
  }
}

export function compareToSimulationAssumption(
  snapshot: MonthlyBudgetSnapshot,
  globalParams: GlobalParams
): SimulationGapResult {
  const assumedSavingsRate = (globalParams.investmentRate ?? 0) / 100
  const realSavingsRate = snapshot.realSavingsRate
  const deltaPct = (realSavingsRate - assumedSavingsRate) * 100

  let severity: SimulationGapResult['severity']
  if (Math.abs(deltaPct) < 5) {
    severity = 'ok'
  } else if (Math.abs(deltaPct) < 15) {
    severity = 'warning'
  } else {
    severity = 'critical'
  }

  return {
    assumedSavingsRate,
    realSavingsRate,
    deltaPct,
    severity,
  }
}
