import type { BudgetTransaction, CashflowForecastPoint, RecurringRule, RecurringFrequency } from '../types/budget'
import { txMonth, addMonths, currentYearMonth } from './budgetEngine'

function isMonthComplete(ym: string): boolean {
  return ym < currentYearMonth()
}

function getCompletedMonths(transactions: BudgetTransaction[]): string[] {
  const months = new Set<string>()
  for (const tx of transactions) {
    const m = txMonth(tx.date)
    if (isMonthComplete(m)) months.add(m)
  }
  return [...months].sort()
}

function recurringAmountForMonth(rule: RecurringRule): number {
  if (!rule.active) return 0

  const freq: RecurringFrequency = rule.frequency
  if (freq === 'monthly') return rule.amount
  if (freq === 'annual') {
    // approximate: 1/12 per month
    return rule.amount / 12
  }
  if (freq === 'quarterly') {
    // approximate: 1/3 per applicable month
    return rule.amount / 3
  }
  if (freq === 'weekly') {
    // ~4.33 weeks per month
    return rule.amount * 4.33
  }
  return 0
}

export function forecastCashflow(
  transactions: BudgetTransaction[],
  recurringRules: RecurringRule[],
  monthsAhead = 6
): CashflowForecastPoint[] {
  const completedMonths = getCompletedMonths(transactions)
  const historyCount = completedMonths.length

  const confidence: CashflowForecastPoint['confidence'] =
    historyCount >= 3 ? 'high' : historyCount >= 1 ? 'medium' : 'low'

  // Compute average income/expenses per completed month
  let avgIncome = 0
  let avgExpenses = 0

  if (historyCount > 0) {
    let totalIncome = 0
    let totalExpenses = 0
    for (const month of completedMonths) {
      const monthTxs = transactions.filter((t) => txMonth(t.date) === month)
      totalIncome += monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      totalExpenses += monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    }
    avgIncome = totalIncome / historyCount
    avgExpenses = totalExpenses / historyCount
  }

  // Recurring adjustments on top of historical baseline
  const recurringIncome = recurringRules
    .filter((r) => r.active && r.type === 'income')
    .reduce((s, r) => s + recurringAmountForMonth(r), 0)

  const recurringExpenses = recurringRules
    .filter((r) => r.active && r.type === 'expense')
    .reduce((s, r) => s + recurringAmountForMonth(r), 0)

  const baseIncome = historyCount > 0 ? avgIncome : recurringIncome
  const baseExpenses = historyCount > 0 ? avgExpenses + recurringExpenses : recurringExpenses

  const result: CashflowForecastPoint[] = []
  const startMonth = addMonths(currentYearMonth(), 1)

  for (let i = 0; i < monthsAhead; i++) {
    const month = addMonths(startMonth, i)
    const projectedIncome = Math.round(baseIncome * 100) / 100
    const projectedExpenses = Math.round(baseExpenses * 100) / 100
    const projectedBalance = Math.round((projectedIncome - projectedExpenses) * 100) / 100

    result.push({
      month,
      projectedIncome,
      projectedExpenses,
      projectedBalance,
      confidence,
    })
  }

  return result
}
