/**
 * Calendrier de prélèvements — fonctions pures, zéro import React.
 * Vue mensuelle : dépenses fixes/récurrentes réelles du mois + règles à venir.
 */

import type {
  BudgetCategory,
  BudgetTransaction,
  CalendarPaymentItem,
  RecurringRule,
} from '../types/budget'
import { txMonth } from './budgetEngine'
import { normalizeLabel } from './recurringDetector'

/** Nombre de jours du mois YYYY-MM */
export function daysInMonth(ym: string): number {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/**
 * Prélèvements du mois, indexés par jour (1..31).
 * - kind 'actual' : transactions expense réelles du mois dont la catégorie est
 *   du groupe 'fixed', OU générées par une règle récurrente (source 'recurring').
 * - kind 'upcoming' : règles mensuelles actives (expense) sans transaction
 *   correspondante ce mois-ci — affichées à leur dayOfMonth.
 *   Les règles trimestrielles/annuelles sont incluses seulement si leur dernière
 *   occurrence connue les rend dues ce mois-ci.
 */
export function computePaymentCalendar(
  month: string,
  transactions: BudgetTransaction[],
  recurringRules: RecurringRule[],
  categories: BudgetCategory[]
): Record<number, CalendarPaymentItem[]> {
  const byDay: Record<number, CalendarPaymentItem[]> = {}
  const push = (day: number, item: CalendarPaymentItem) => {
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(item)
  }

  const fixedCatIds = new Set(categories.filter((c) => c.group === 'fixed').map((c) => c.id))
  const monthTxs = transactions.filter((t) => txMonth(t.date) === month && t.type === 'expense')

  // 1. Transactions réelles (fixes ou issues d'une règle)
  const matchedRuleIds = new Set<string>()
  const matchedLabels = new Set<string>()
  for (const tx of monthTxs) {
    const isFixed = fixedCatIds.has(tx.categoryId)
    const isRecurring = tx.source === 'recurring' || !!tx.recurringRuleId
    if (!isFixed && !isRecurring) continue
    if (tx.recurringRuleId) matchedRuleIds.add(tx.recurringRuleId)
    matchedLabels.add(normalizeLabel(tx.label))
    const day = Number(tx.date.slice(8, 10))
    push(day, { label: tx.label, amount: tx.amount, kind: 'actual', categoryId: tx.categoryId })
  }

  // 2. Règles actives non encore matérialisées ce mois-ci
  const lastDay = daysInMonth(month)
  for (const rule of recurringRules) {
    if (!rule.active || rule.type !== 'expense' || rule.frequency === 'weekly') continue
    if (matchedRuleIds.has(rule.id) || matchedLabels.has(normalizeLabel(rule.label))) continue

    let dueThisMonth = rule.frequency === 'monthly'
    if (!dueThisMonth) {
      // Trimestriel/annuel : dû ce mois si la dernière occurrence + période tombe dans le mois
      const lastTx = transactions
        .filter((t) => t.recurringRuleId === rule.id || normalizeLabel(t.label) === normalizeLabel(rule.label))
        .sort((a, b) => (a.date < b.date ? 1 : -1))[0]
      if (lastTx) {
        const stepMonths = rule.frequency === 'quarterly' ? 3 : 12
        const [ly, lm] = txMonth(lastTx.date).split('-').map(Number)
        const [cy, cm] = month.split('-').map(Number)
        const monthsSince = (cy - ly) * 12 + (cm - lm)
        dueThisMonth = monthsSince > 0 && monthsSince % stepMonths === 0
      }
    }
    if (!dueThisMonth) continue

    const day = Math.min(rule.dayOfMonth ?? 1, lastDay)
    push(day, {
      label: rule.label,
      amount: rule.amount,
      kind: 'upcoming',
      frequency: rule.frequency,
      categoryId: rule.categoryId,
    })
  }

  return byDay
}

/** Total des prélèvements du mois (réels + à venir) */
export function calendarMonthTotal(byDay: Record<number, CalendarPaymentItem[]>): number {
  return Object.values(byDay).flat().reduce((s, i) => s + i.amount, 0)
}
