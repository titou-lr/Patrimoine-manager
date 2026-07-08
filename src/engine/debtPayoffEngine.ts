/**
 * Plan de remboursement de dettes — fonctions pures, zéro import React.
 * Compare les stratégies avalanche (taux le plus élevé d'abord) et
 * snowball (plus petit solde d'abord). Lecture seule sur les Liability
 * du store principal — n'écrit jamais.
 */

import type { Liability } from '../types'

export type PayoffStrategy = 'avalanche' | 'snowball'

export interface PayoffScheduleEntry {
  month: number                          // 1-based depuis aujourd'hui
  totalRemaining: number
  perLiability: Record<string, number>
}

export interface PayoffResult {
  strategy: PayoffStrategy
  months: number                         // durée totale jusqu'au désendettement
  totalInterest: number                  // intérêts payés sur la durée
  payoffOrder: { id: string; label: string; month: number }[]
  schedule: PayoffScheduleEntry[]        // série mensuelle pour le graphique
  stalled: boolean                       // true si les paiements ne couvrent pas les intérêts
}

const MAX_MONTHS = 1200  // garde-fou : 100 ans

/**
 * Simule le remboursement mois par mois.
 * - Chaque dette reçoit sa mensualité minimale.
 * - `extraMonthly` + les mensualités des dettes soldées (effet boule de neige,
 *   si `rollover`) sont dirigés vers la dette cible selon la stratégie.
 */
export function computePayoffPlan(
  liabilities: Liability[],
  extraMonthly: number,
  strategy: PayoffStrategy,
  rollover: boolean = true
): PayoffResult {
  const debts = liabilities
    .filter((l) => l.active !== false && l.remainingAmount > 0)
    .map((l) => ({
      id: l.id,
      label: l.label,
      balance: l.remainingAmount,
      rate: l.interestRate / 100 / 12,
      minPayment: l.monthlyPayment,
      paidOffMonth: 0,
    }))

  const schedule: PayoffScheduleEntry[] = []
  const payoffOrder: PayoffResult['payoffOrder'] = []
  let totalInterest = 0
  let month = 0
  let stalled = false

  const pickTarget = () => {
    const open = debts.filter((d) => d.balance > 0.005)
    if (open.length === 0) return null
    return strategy === 'avalanche'
      ? open.reduce((a, b) => (b.rate > a.rate ? b : a))
      : open.reduce((a, b) => (b.balance < a.balance ? b : a))
  }

  while (debts.some((d) => d.balance > 0.005) && month < MAX_MONTHS) {
    month++
    let freedUp = 0

    // Intérêts + mensualités minimales
    for (const d of debts) {
      if (d.balance <= 0.005) {
        if (rollover) freedUp += d.minPayment
        continue
      }
      const interest = d.balance * d.rate
      totalInterest += interest
      d.balance += interest
      const payment = Math.min(d.minPayment, d.balance)
      d.balance -= payment
      if (d.balance <= 0.005 && d.paidOffMonth === 0) {
        d.paidOffMonth = month
        payoffOrder.push({ id: d.id, label: d.label, month })
      }
    }

    // Effort supplémentaire + mensualités libérées → dette cible
    let extra = extraMonthly + freedUp
    let guard = 0
    while (extra > 0.005 && guard < debts.length + 1) {
      const target = pickTarget()
      if (!target) break
      const payment = Math.min(extra, target.balance)
      target.balance -= payment
      extra -= payment
      if (target.balance <= 0.005 && target.paidOffMonth === 0) {
        target.paidOffMonth = month
        payoffOrder.push({ id: target.id, label: target.label, month })
      }
      guard++
    }

    const totalRemaining = debts.reduce((s, d) => s + Math.max(0, d.balance), 0)
    const perLiability: Record<string, number> = {}
    for (const d of debts) perLiability[d.id] = Math.max(0, d.balance)
    schedule.push({ month, totalRemaining, perLiability })
  }

  if (month >= MAX_MONTHS) stalled = true

  return { strategy, months: month, totalInterest, payoffOrder, schedule, stalled }
}

export interface PayoffComparison {
  avalanche: PayoffResult
  snowball: PayoffResult
  baseline: PayoffResult                 // mensualités minimales, sans boule de neige
  interestSavedAvalanche: number         // vs baseline
  interestSavedSnowball: number
}

export function comparePayoffStrategies(
  liabilities: Liability[],
  extraMonthly: number
): PayoffComparison {
  const avalanche = computePayoffPlan(liabilities, extraMonthly, 'avalanche', true)
  const snowball = computePayoffPlan(liabilities, extraMonthly, 'snowball', true)
  const baseline = computePayoffPlan(liabilities, 0, 'avalanche', false)
  return {
    avalanche,
    snowball,
    baseline,
    interestSavedAvalanche: Math.max(0, baseline.totalInterest - avalanche.totalInterest),
    interestSavedSnowball: Math.max(0, baseline.totalInterest - snowball.totalInterest),
  }
}

/** YYYY-MM après `months` mois à partir d'aujourd'hui */
export function payoffEndDate(months: number, today: Date = new Date()): string {
  const d = new Date(today.getFullYear(), today.getMonth() + months, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
