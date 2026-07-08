/**
 * Alertes budgétaires — fonctions pures, zéro import React.
 * Complète generateAlerts() de alertsEngine.ts au niveau du composant SmartAlerts.
 */

import type { Alert } from '../../engine/alertsEngine'
import type {
  BudgetCategory,
  BudgetEnvelope,
  BudgetTransaction,
  MonthlyBudgetSnapshot,
  RecurringRule,
  SimulationGapResult,
} from '../types/budget'
import { formatEur, formatPct } from '../../utils/format'
import { addMonths, txMonth } from './budgetEngine'
import { normalizeLabel } from './recurringDetector'

// Allows 'budget' as an actionTarget without modifying the shared Alert type.
type AlertInput = Omit<Alert, 'actionTarget'> & {
  actionTarget?: 'envelopes' | 'dashboard' | 'budget'
}

function mkAlert(input: AlertInput): Alert {
  return input as unknown as Alert
}

export function generateBudgetAlerts(
  snapshot: MonthlyBudgetSnapshot,
  envelopes: BudgetEnvelope[],
  categories: BudgetCategory[],
  transactions: BudgetTransaction[],
  gapResult: SimulationGapResult,
  recurringRules: RecurringRule[] = [],
  today: Date = new Date()
): Alert[] {
  const alerts: Alert[] = []

  const catById = new Map(categories.map((c) => [c.id, c]))
  const activeEnvelopes = envelopes.filter((e) => e.active)
  const envById = new Map(activeEnvelopes.map((e) => [e.id, e]))

  // ── Rule a: envelope overruns ─────────────────────────────────────────────

  for (const [envId, stat] of Object.entries(snapshot.byEnvelope)) {
    if (stat.remaining >= 0) continue
    const env = envById.get(envId)
    if (!env) continue
    const cat = catById.get(env.categoryId)
    if (!cat || (cat.group !== 'fixed' && cat.group !== 'variable')) continue

    const overrun = Math.abs(stat.remaining)
    const isFixed = cat.group === 'fixed'

    alerts.push(mkAlert({
      id: `budget_overrun_${envId}`,
      type: isFixed ? 'warning' : 'tip',
      priority: isFixed ? 1 : 2,
      title: `Dépassement : ${env.label}`,
      message: `L'enveloppe "${env.label}" est dépassée de ${formatEur(overrun)} ce mois-ci.`,
      actionLabel: 'Voir le budget',
      actionTarget: 'budget',
    }))
  }

  // ── Rule b: savings rate gap vs simulation assumption ─────────────────────

  if (gapResult.severity !== 'ok') {
    const direction = gapResult.deltaPct < 0 ? 'inférieur' : 'supérieur'
    const pts = Math.abs(Math.round(gapResult.deltaPct))
    const assumed = formatPct(gapResult.assumedSavingsRate * 100, 0)
    const real = formatPct(gapResult.realSavingsRate * 100, 0)

    alerts.push(mkAlert({
      id: 'budget_savings_gap',
      type: gapResult.severity === 'critical' ? 'warning' : 'tip',
      priority: gapResult.severity === 'critical' ? 1 : 2,
      title: `Écart taux d'épargne${gapResult.severity === 'critical' ? ' critique' : ''}`,
      message: `Votre taux d'épargne réel (${real}) est ${direction} de ${pts} point${pts > 1 ? 's' : ''} par rapport à votre hypothèse de simulation (${assumed}).`,
      actionLabel: 'Ajuster la simulation',
      actionTarget: 'envelopes',
    }))
  }

  // ── Rule c: savings better than expected ──────────────────────────────────

  if (gapResult.realSavingsRate > gapResult.assumedSavingsRate + 0.05) {
    alerts.push(mkAlert({
      id: 'budget_savings_overperform',
      type: 'success',
      priority: 3,
      title: 'Épargne supérieure à la simulation',
      message: `Vous épargnez ${formatPct(gapResult.realSavingsRate * 100, 0)} de vos revenus, au-dessus de votre hypothèse (${formatPct(gapResult.assumedSavingsRate * 100, 0)}). Pensez à augmenter les versements dans votre simulation.`,
      actionLabel: 'Ajuster les versements',
      actionTarget: 'envelopes',
    }))
  }

  // ── Rule d: orphaned transactions (expense with category but no envelope) ─

  const coveredCategoryIds = new Set(activeEnvelopes.map((e) => e.categoryId))
  const monthTxs = transactions.filter(
    (t) => t.date.slice(0, 7) === snapshot.month && t.type === 'expense'
  )
  const orphaned = monthTxs.filter((t) => t.categoryId && !coveredCategoryIds.has(t.categoryId))

  if (orphaned.length > 0) {
    alerts.push(mkAlert({
      id: 'budget_orphaned_transactions',
      type: 'tip',
      priority: 2,
      title: 'Transactions sans enveloppe',
      message: `${orphaned.length} transaction${orphaned.length > 1 ? 's' : ''} de ce mois ${orphaned.length > 1 ? 'ne sont pas couvertes' : "n'est pas couverte"} par une enveloppe budget active. Créez une enveloppe pour suivre ces dépenses.`,
      actionLabel: 'Voir le budget',
      actionTarget: 'budget',
    }))
  }

  // ── Rule e: category anomaly — spending >40% above the 3-month average ────

  const ANOMALY_THRESHOLD = 0.4
  const ANOMALY_MIN_DELTA_EUR = 20

  const spentByCatForMonth = (month: string): Map<string, number> => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      if (t.type !== 'expense' || txMonth(t.date) !== month) continue
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount)
    }
    return map
  }

  const currentByCat = spentByCatForMonth(snapshot.month)
  const prevMonths = [1, 2, 3].map((i) => spentByCatForMonth(addMonths(snapshot.month, -i)))

  for (const [catId, spent] of currentByCat) {
    const cat = catById.get(catId)
    if (!cat || cat.group === 'income' || cat.group === 'savings') continue

    const prevValues = prevMonths.map((m) => m.get(catId) ?? 0)
    const monthsWithData = prevValues.filter((v) => v > 0).length
    if (monthsWithData < 2) continue  // pas assez d'historique pour parler d'anomalie
    const mean = prevValues.reduce((s, v) => s + v, 0) / 3
    if (mean <= 0) continue

    const excess = spent - mean
    if (spent > mean * (1 + ANOMALY_THRESHOLD) && excess >= ANOMALY_MIN_DELTA_EUR) {
      const pctOver = Math.round((spent / mean - 1) * 100)
      alerts.push(mkAlert({
        id: `budget_category_anomaly_${catId}`,
        type: 'tip',
        priority: 2,
        title: `Dépenses inhabituelles : ${cat.label}`,
        message: `${formatEur(spent)} dépensés ce mois-ci en "${cat.label}", soit +${pctOver}% par rapport à votre moyenne des 3 derniers mois (${formatEur(mean)}).`,
        actionLabel: 'Voir le budget',
        actionTarget: 'budget',
      }))
    }
  }

  // ── Rule f: probable unused subscription — no matching transaction at D+5 ─

  const todayMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const todayDay = today.getDate()

  // Seulement pour le mois courant : à J+5 d'une date habituelle sans transaction
  if (snapshot.month === todayMonth) {
    for (const rule of recurringRules) {
      if (!rule.active || rule.type !== 'expense' || rule.frequency !== 'monthly') continue
      const expectedDay = rule.dayOfMonth ?? 1
      if (todayDay < expectedDay + 5) continue

      const normRuleLabel = normalizeLabel(rule.label)
      const hasMatch = transactions.some((t) =>
        t.type === 'expense' &&
        txMonth(t.date) === snapshot.month &&
        (t.recurringRuleId === rule.id || normalizeLabel(t.label) === normRuleLabel)
      )
      if (hasMatch) continue

      alerts.push(mkAlert({
        id: `budget_unused_subscription_${rule.id}`,
        type: 'tip',
        priority: 3,
        title: `Abonnement sans transaction : ${rule.label}`,
        message: `"${rule.label}" (${formatEur(rule.amount)}/mois, habituellement le ${expectedDay}) n'a pas de transaction ce mois-ci à J+5. Vérifiez si cet abonnement est toujours actif — ou résiliez-le.`,
        actionLabel: 'Voir le budget',
        actionTarget: 'budget',
      }))
    }
  }

  return alerts.sort((a, b) => a.priority - b.priority)
}
