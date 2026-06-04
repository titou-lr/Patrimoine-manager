/**
 * Moteur d'événements de vie — fonctions pures, zéro import React.
 *
 * Transforme la liste des LifeEvent en une Map<globalMonth, EnvelopeEffect>
 * par enveloppe, utilisée par simulateEnvelope() dans simulation.ts.
 *
 * globalMonth = (year - 1) * 12 + month  (1-indexed depuis le début de sim)
 */

import type { LifeEvent } from '../types'

export interface EnvelopeEffect {
  /** 0 = versements suspendus, 1 = normaux */
  contributionMultiplier: number
  /** Variation absolue €/mois ajoutée au versement après multiplicateur */
  contributionDelta: number
  /** Montant one-shot ajouté (+) ou retiré (-) du solde ce mois */
  balanceDelta: number
}

function getOrInit(map: Map<number, EnvelopeEffect>, month: number): EnvelopeEffect {
  if (!map.has(month)) {
    map.set(month, { contributionMultiplier: 1, contributionDelta: 0, balanceDelta: 0 })
  }
  return map.get(month)!
}

/**
 * Construit la Map d'effets mensuels pour une enveloppe donnée.
 *
 * Les événements globaux (sans envelopeId) sont répartis équitablement
 * entre toutes les enveloppes actives (numActiveEnvs).
 */
export function buildEnvelopeEffects(
  events: LifeEvent[],
  envelopeId: string,
  durationYears: number,
  numActiveEnvs: number,
  currentMonthlyIncome: number,
  investmentRate: number
): Map<number, EnvelopeEffect> {
  const map = new Map<number, EnvelopeEffect>()
  const maxMonth = durationYears * 12
  const n = Math.max(1, numActiveEnvs)

  for (const event of events) {
    const startMonth = Math.max(1, Math.round(event.yearOffset * 12) + 1)
    if (startMonth > maxMonth) continue

    const durationMonths = event.duration != null ? Math.round(event.duration * 12) : 1
    const endMonth = Math.min(maxMonth, startMonth + durationMonths - 1)

    // Does this event target this specific envelope, or all?
    const affectsThis = !event.envelopeId || event.envelopeId === envelopeId

    const type = event.type

    if (type === 'pause') {
      if (!affectsThis) continue
      for (let m = startMonth; m <= endMonth; m++) {
        getOrInit(map, m).contributionMultiplier = 0
      }

    } else if (type === 'windfall') {
      if (!affectsThis) continue
      const perEnv = event.envelopeId ? (event.amount ?? 0) : (event.amount ?? 0) / n
      getOrInit(map, startMonth).balanceDelta += perEnv

    } else if (type === 'withdrawal') {
      if (!affectsThis) continue
      const perEnv = event.envelopeId ? (event.amount ?? 0) : (event.amount ?? 0) / n
      getOrInit(map, startMonth).balanceDelta -= perEnv

    } else if (type === 'expense_increase' || type === 'child') {
      // Réduction globale répartie proportionnellement sur toutes les enveloppes
      const delta = -Math.abs(event.monthlyImpact ?? 0) / n
      for (let m = startMonth; m <= endMonth; m++) {
        getOrInit(map, m).contributionDelta += delta
      }

    } else if (type === 'custom') {
      if (!affectsThis) continue
      const delta = event.monthlyImpact ?? 0
      for (let m = startMonth; m <= endMonth; m++) {
        getOrInit(map, m).contributionDelta += delta
      }

    } else {
      // salary_increase : event.amount = nouveau salaire mensuel
      // Recalcule l'effort et distribue le delta sur toutes les enveloppes
      const newSalary = event.amount ?? currentMonthlyIncome
      const oldEffort = (currentMonthlyIncome * investmentRate) / 100
      const newEffort = (newSalary * investmentRate) / 100
      const delta = (newEffort - oldEffort) / n
      for (let m = startMonth; m <= maxMonth; m++) {
        getOrInit(map, m).contributionDelta += delta
      }
    }
  }

  return map
}
