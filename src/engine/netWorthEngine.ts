/**
 * Moteur patrimoine net — fonctions pures, zéro import React.
 * Calcule actifs, passifs et snapshot NetWorthSnapshot à une année donnée.
 */

import type { Liability, NetWorthSnapshot, SimulationResult } from '../types'

/**
 * Capital restant d'un passif à l'année yearIndex.
 * Approximation linéaire pour v1 (amortissement exact possible via formule PMT).
 */
export function liabilityRemainingAt(liability: Liability, yearIndex: number): number {
  const monthsElapsed = yearIndex * 12
  if (monthsElapsed >= liability.remainingMonths) return 0

  // Amortissement précis : formule du capital restant après k versements
  // PV_remaining = P * [(1+r)^n - (1+r)^k] / [(1+r)^n - 1]
  const r = liability.interestRate / 100 / 12
  if (r === 0) {
    // Taux 0 — décroissance linéaire
    return liability.remainingAmount * (1 - monthsElapsed / liability.remainingMonths)
  }
  const n = liability.remainingMonths
  const k = monthsElapsed
  const pow_n = Math.pow(1 + r, n)
  const pow_k = Math.pow(1 + r, k)
  return liability.remainingAmount * (pow_n - pow_k) / (pow_n - 1)
}

/**
 * Intérêts restants à payer sur un passif (coût total - capital restant).
 */
export function liabilityInterestCost(liability: Liability, yearIndex: number = 0): number {
  const remaining = liabilityRemainingAt(liability, yearIndex)
  const monthsLeft = Math.max(0, liability.remainingMonths - yearIndex * 12)
  const totalPayments = liability.monthlyPayment * monthsLeft
  return Math.max(0, totalPayments - remaining)
}

/**
 * Snapshot patrimoine net à l'année yearIndex.
 * totalAssets = capital nominal de tous les résultats de simulation.
 * totalLiabilities = somme des capitaux restants actifs à yearIndex.
 */
export function computeNetWorth(
  simulationResults: SimulationResult[],
  liabilities: Liability[],
  yearIndex: number
): NetWorthSnapshot {
  const result = simulationResults[Math.min(Math.max(0, yearIndex), simulationResults.length - 1)]
  const totalAssets = result ? result.totalNominal : 0

  const activeLiabilities = liabilities.filter((l) => l.active !== false)

  let totalLiabilities = 0
  let monthlyDebtBurden = 0

  for (const liability of activeLiabilities) {
    const remaining = liabilityRemainingAt(liability, yearIndex)
    totalLiabilities += remaining
    if (remaining > 0) {
      monthlyDebtBurden += liability.monthlyPayment
    }
  }

  const debtRatio = totalAssets > 0 ? totalLiabilities / totalAssets : 0

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    debtRatio,
    monthlyDebtBurden,
  }
}

/**
 * Série annuelle de NetWorthSnapshot sur toute la durée de simulation.
 * Utilisée pour les graphiques d'évolution du patrimoine net.
 */
export function computeNetWorthSeries(
  simulationResults: SimulationResult[],
  liabilities: Liability[]
): NetWorthSnapshot[] {
  return simulationResults.map((_, i) => computeNetWorth(simulationResults, liabilities, i))
}
