/**
 * Gestionnaire d'abonnements — fonctions pures, zéro import React.
 * Un abonnement = dépense récurrente mensuelle/trimestrielle/annuelle,
 * issue d'une RecurringRule active OU détectée dans les transactions
 * (via detectRecurringCandidates) sans règle confirmée.
 */

import type {
  BudgetTransaction,
  RecurringFrequency,
  RecurringRule,
  SubscriptionInfo,
} from '../types/budget'
import { detectRecurringCandidates, normalizeLabel } from './recurringDetector'

const MONTHS_PER_PERIOD: Record<RecurringFrequency, number> = {
  weekly: 12 / 52,
  monthly: 1,
  quarterly: 3,
  annual: 12,
}

const DAYS_PER_PERIOD: Record<RecurringFrequency, number> = {
  weekly: 7,
  monthly: 30,
  quarterly: 91,
  annual: 365,
}

export const RENEWAL_ALERT_DAYS = 7

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysFromToday(dateIso: string, today: Date): number {
  const target = new Date(dateIso)
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((target.getTime() - t0.getTime()) / 86_400_000)
}

/** Date du prochain renouvellement d'une règle mensuelle (dayOfMonth), ≥ aujourd'hui */
function nextMonthlyRenewal(dayOfMonth: number, today: Date): string {
  const y = today.getFullYear()
  const m = today.getMonth()
  const clampDay = (yy: number, mm: number) => Math.min(dayOfMonth, new Date(yy, mm + 1, 0).getDate())
  const thisMonth = new Date(y, m, clampDay(y, m))
  if (thisMonth.getTime() >= new Date(y, m, today.getDate()).getTime()) return toIso(thisMonth)
  return toIso(new Date(y, m + 1, clampDay(y, m + 1)))
}

/** Prochain renouvellement basé sur la dernière transaction connue + période */
function nextRenewalFromLastTx(lastTxDate: string, freq: RecurringFrequency, today: Date): string | null {
  const period = DAYS_PER_PERIOD[freq]
  let next = new Date(lastTxDate)
  const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  let guard = 0
  while (next.getTime() < todayMs && guard < 400) {
    next = new Date(next.getTime() + period * 86_400_000)
    guard++
  }
  return guard < 400 ? toIso(next) : null
}

/** Dernière transaction rattachable à une règle (par id de règle ou libellé normalisé) */
function lastMatchingTxDate(
  rule: Pick<RecurringRule, 'id' | 'label'>,
  transactions: BudgetTransaction[]
): string | null {
  const normLabel = normalizeLabel(rule.label)
  let last: string | null = null
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue
    const matches = tx.recurringRuleId === rule.id || normalizeLabel(tx.label) === normLabel
    if (matches && (!last || tx.date > last)) last = tx.date
  }
  return last
}

/**
 * Liste les abonnements : règles récurrentes actives (expense, non hebdo)
 * + candidats détectés dans les transactions sans règle correspondante.
 * Triés par prochain renouvellement croissant.
 */
export function listSubscriptions(
  recurringRules: RecurringRule[],
  transactions: BudgetTransaction[],
  today: Date = new Date()
): SubscriptionInfo[] {
  const subs: SubscriptionInfo[] = []
  const coveredLabels = new Set<string>()

  // 1. Règles confirmées
  for (const rule of recurringRules) {
    if (!rule.active || rule.type !== 'expense' || rule.frequency === 'weekly') continue
    coveredLabels.add(normalizeLabel(rule.label))

    let nextDate: string | null
    if (rule.frequency === 'monthly' && rule.dayOfMonth) {
      nextDate = nextMonthlyRenewal(rule.dayOfMonth, today)
    } else {
      const lastTx = lastMatchingTxDate(rule, transactions)
      nextDate = lastTx ? nextRenewalFromLastTx(lastTx, rule.frequency, today) : null
    }

    subs.push({
      id: `sub_rule_${rule.id}`,
      label: rule.label,
      amount: rule.amount,
      frequency: rule.frequency,
      monthlyCost: rule.amount / MONTHS_PER_PERIOD[rule.frequency],
      annualCost: (rule.amount / MONTHS_PER_PERIOD[rule.frequency]) * 12,
      nextRenewalDate: nextDate,
      daysUntilRenewal: nextDate ? daysFromToday(nextDate, today) : null,
      source: 'rule',
      categoryId: rule.categoryId,
    })
  }

  // 2. Détection complémentaire — candidats sans règle confirmée
  const candidates = detectRecurringCandidates(transactions)
  for (const cand of candidates) {
    if (cand.type !== 'expense' || cand.frequency === 'weekly') continue
    if (coveredLabels.has(normalizeLabel(cand.label))) continue

    const lastTx = lastMatchingTxDate(cand, transactions)
    const nextDate = lastTx ? nextRenewalFromLastTx(lastTx, cand.frequency, today) : null

    subs.push({
      id: `sub_detected_${cand.id}`,
      label: cand.label,
      amount: cand.amount,
      frequency: cand.frequency,
      monthlyCost: cand.amount / MONTHS_PER_PERIOD[cand.frequency],
      annualCost: (cand.amount / MONTHS_PER_PERIOD[cand.frequency]) * 12,
      nextRenewalDate: nextDate,
      daysUntilRenewal: nextDate ? daysFromToday(nextDate, today) : null,
      source: 'detected',
      categoryId: cand.categoryId,
    })
  }

  return subs.sort((a, b) => (a.daysUntilRenewal ?? 9999) - (b.daysUntilRenewal ?? 9999))
}

/** Totaux agrégés d'une liste d'abonnements */
export function subscriptionTotals(subs: SubscriptionInfo[]): { monthly: number; annual: number } {
  return {
    monthly: subs.reduce((s, x) => s + x.monthlyCost, 0),
    annual: subs.reduce((s, x) => s + x.annualCost, 0),
  }
}
