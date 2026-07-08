/**
 * Objectifs d'épargne — fonctions pures, zéro import React.
 * Progression mesurée depuis les transactions budget réelles :
 * - objectif lié à une enveloppe : cumul des transactions (expense/transfer)
 *   affectées à cette enveloppe depuis la création de l'objectif
 * - sinon : cumul de l'épargne mensuelle globale (revenus - dépenses)
 *   depuis la création de l'objectif
 * Le rythme d'épargne = moyenne des 3 derniers mois pleins.
 */

import type { BudgetTransaction, SavingsGoal, SavingsGoalProgress } from '../types/budget'
import { addMonths, txMonth } from './budgetEngine'

/** Épargne nette d'un mois donné (revenus - dépenses, plancher 0) */
function monthlySaved(transactions: BudgetTransaction[], month: string): number {
  let income = 0
  let expenses = 0
  for (const t of transactions) {
    if (txMonth(t.date) !== month) continue
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') expenses += t.amount
  }
  return Math.max(0, income - expenses)
}

/** Montant versé sur une enveloppe un mois donné (expense + transfer) */
function monthlyEnvelopeInflow(transactions: BudgetTransaction[], envelopeId: string, month: string): number {
  return transactions
    .filter((t) => t.envelopeId === envelopeId && txMonth(t.date) === month && (t.type === 'expense' || t.type === 'transfer'))
    .reduce((s, t) => s + t.amount, 0)
}

export function computeGoalProgress(
  goal: SavingsGoal,
  transactions: BudgetTransaction[],
  today: Date = new Date()
): SavingsGoalProgress {
  const nowMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const createdMonth = goal.createdAt.slice(0, 7)

  // Cumul depuis la création
  let accumulated = 0
  let m = createdMonth
  let guard = 0
  while (m <= nowMonth && guard < 600) {
    accumulated += goal.linkedEnvelopeId
      ? monthlyEnvelopeInflow(transactions, goal.linkedEnvelopeId, m)
      : monthlySaved(transactions, m)
    m = addMonths(m, 1)
    guard++
  }

  const current = goal.startingAmount + accumulated
  const pct = goal.targetAmount > 0 ? Math.min(1, current / goal.targetAmount) : 0

  // Rythme : moyenne des 3 derniers mois pleins (mois courant exclu)
  let paceSum = 0
  for (let i = 1; i <= 3; i++) {
    const pm = addMonths(nowMonth, -i)
    paceSum += goal.linkedEnvelopeId
      ? monthlyEnvelopeInflow(transactions, goal.linkedEnvelopeId, pm)
      : monthlySaved(transactions, pm)
  }
  const monthlyPace = paceSum / 3

  const remaining = Math.max(0, goal.targetAmount - current)
  let monthsRemaining: number | null = null
  let projectedMonth: string | null = null
  if (remaining === 0) {
    monthsRemaining = 0
    projectedMonth = nowMonth
  } else if (monthlyPace > 0) {
    monthsRemaining = Math.ceil(remaining / monthlyPace)
    projectedMonth = addMonths(nowMonth, monthsRemaining)
  }

  let onTrack: boolean | null = null
  if (goal.targetDate) {
    onTrack = projectedMonth !== null && projectedMonth <= goal.targetDate
  }

  return { goalId: goal.id, current, pct, monthlyPace, projectedMonth, monthsRemaining, onTrack }
}

/** Progression moyenne (0–1) d'une liste d'objectifs — null si aucune */
export function averageGoalsProgress(
  goals: SavingsGoal[],
  transactions: BudgetTransaction[],
  today: Date = new Date()
): number | null {
  if (goals.length === 0) return null
  const sum = goals.reduce((s, g) => s + computeGoalProgress(g, transactions, today).pct, 0)
  return sum / goals.length
}
