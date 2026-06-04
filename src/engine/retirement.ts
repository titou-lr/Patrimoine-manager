/**
 * Module retraite — calculs purs sans dépendance UI.
 *
 * Logique :
 *  - Capital nécessaire = (dépenses - pension) × 12 / taux de retrait
 *  - Runway = simulation mois par mois jusqu'à épuisement du capital
 *  - Rendement pondéré = moyenne des rendements enveloppes pondérés par encours estimé
 */

import type { Envelope, SimulationResult, RetirementParams, GlobalParams } from '../types'

/** Limite absolue de la simulation de runway pour éviter toute boucle infinie */
const MAX_RUNWAY_MONTHS = 200 * 12

/**
 * Proxy d'encours sur 10 ans (120 mois) pour pondérer le rendement des enveloppes.
 * Permet d'estimer l'importance relative d'une enveloppe sans connaître son capital futur.
 */
const WEIGHT_HORIZON_MONTHS = 120

export interface RetirementAnalysis {
  capitalNeeded: number
  capitalAtRetirement: number
  passiveIncomeMonthly: number
  runwayYears: number | 'unlimited'
  monthlyGap: number
  yearsUntilRetirement: number
  shortfall: number
  accumulationData: Array<{ age: number; capital: number }>
  withdrawalData: Array<{ age: number; capital: number }>
}

/**
 * Capital total nécessaire pour couvrir le gap mensuel (dépenses - pension)
 * sur une durée indéfinie au taux de retrait donné.
 *
 * @param monthlyExpenses - Dépenses mensuelles cible en retraite
 * @param pensionMonthly - Pension mensuelle estimée
 * @param withdrawalRate - Taux de retrait annuel en % (ex : 4)
 */
export function computeCapitalNeeded(
  monthlyExpenses: number,
  pensionMonthly: number,
  withdrawalRate: number
): number {
  const gap = monthlyExpenses - pensionMonthly
  if (gap <= 0 || withdrawalRate <= 0) return 0
  return (gap * 12) / (withdrawalRate / 100)
}

/**
 * Nombre d'années avant épuisement du capital en phase de retrait.
 * Retourne 'unlimited' si les intérêts couvrent les retraits.
 *
 * @param capital - Capital initial en phase de retrait
 * @param monthlyWithdrawal - Montant mensuel retiré
 * @param annualReturn - Rendement annuel du portefeuille en %
 */
export function computeRunwayYears(
  capital: number,
  monthlyWithdrawal: number,
  annualReturn: number
): number | 'unlimited' {
  if (monthlyWithdrawal <= 0) return 'unlimited'
  const monthlyReturn = annualReturn / 100 / 12
  if (capital * monthlyReturn >= monthlyWithdrawal) return 'unlimited'

  let bal = capital
  let months = 0
  while (bal > 0 && months < MAX_RUNWAY_MONTHS) {
    bal = bal * (1 + monthlyReturn) - monthlyWithdrawal
    months++
  }
  if (months >= MAX_RUNWAY_MONTHS) return 'unlimited'
  return Math.floor(months / 12)
}

/**
 * Rendement annuel moyen pondéré par l'encours estimé de chaque enveloppe.
 * Le poids = versement mensuel + capital initial / WEIGHT_HORIZON_MONTHS.
 */
function computeWeightedReturn(envelopes: Envelope[]): number {
  const active = envelopes.filter((e) => e.active)
  if (active.length === 0) return 5
  const totalWeight = active.reduce(
    (s, e) => s + e.monthlyContribution + e.initialCapital / WEIGHT_HORIZON_MONTHS,
    0
  )
  return active.reduce((sum, env) => {
    const envReturn =
      env.assets.reduce((s, a) => s + (a.expectedReturn / 100) * (a.allocation / 100), 0) * 100
    const weight =
      totalWeight > 0
        ? (env.monthlyContribution + env.initialCapital / WEIGHT_HORIZON_MONTHS) / totalWeight
        : 1 / active.length
    return sum + envReturn * weight
  }, 0)
}

/**
 * Simule la phase de retrait année par année jusqu'à l'espérance de vie.
 *
 * @param capitalAtRetirement - Capital disponible au départ en retraite
 * @param monthlyWithdrawal - Montant mensuel retiré
 * @param annualReturn - Rendement annuel en %
 * @param ageRetirement - Âge de départ en retraite
 * @param lifeExpectancy - Âge cible de fin de simulation
 */
function computeWithdrawalPhase(
  capitalAtRetirement: number,
  monthlyWithdrawal: number,
  annualReturn: number,
  ageRetirement: number,
  lifeExpectancy: number
): Array<{ age: number; capital: number }> {
  const data: Array<{ age: number; capital: number }> = []
  const monthlyReturn = annualReturn / 100 / 12
  let capital = capitalAtRetirement
  for (let age = ageRetirement; age <= lifeExpectancy; age++) {
    data.push({ age, capital: Math.max(0, capital) })
    for (let m = 0; m < 12; m++) {
      capital = capital * (1 + monthlyReturn) - monthlyWithdrawal
    }
  }
  return data
}

/**
 * Calcule l'analyse retraite complète à partir des résultats de simulation.
 *
 * @param simulationResults - Snapshots annuels issus de runSimulation()
 * @param retirementParams - Paramètres retraite (âge, dépenses, pension...)
 * @param globalParams - Paramètres globaux (âge actuel, durée...)
 * @param envelopes - Liste des enveloppes (pour le rendement pondéré)
 */
export function computeRetirementAnalysis(
  simulationResults: SimulationResult[],
  retirementParams: RetirementParams,
  globalParams: GlobalParams,
  envelopes: Envelope[]
): RetirementAnalysis {
  const { ageRetirement, monthlyExpenses, pensionMonthly, withdrawalRate, lifeExpectancy } =
    retirementParams
  const { ageActuel } = globalParams

  const yearsUntilRetirement = Math.max(0, ageRetirement - ageActuel)
  const capitalNeeded = computeCapitalNeeded(monthlyExpenses, pensionMonthly, withdrawalRate)
  const monthlyGap = Math.max(0, monthlyExpenses - pensionMonthly)

  // Clamp à l'index valide ; si yearsUntilRetirement = 0 → idx = -1 → capital = 0
  const retirementIdx = Math.min(yearsUntilRetirement - 1, simulationResults.length - 1)
  const capitalAtRetirement =
    retirementIdx >= 0 && simulationResults.length > 0
      ? simulationResults[retirementIdx].totalNominal
      : 0

  const passiveIncomeMonthly = (capitalAtRetirement * (withdrawalRate / 100)) / 12
  const weightedReturn = computeWeightedReturn(envelopes)
  const runwayYears = computeRunwayYears(capitalAtRetirement, monthlyGap, weightedReturn)
  const shortfall = capitalNeeded - capitalAtRetirement

  const accumulationData: Array<{ age: number; capital: number }> = [{ age: ageActuel, capital: 0 }]
  for (const r of simulationResults) {
    accumulationData.push({ age: ageActuel + r.year, capital: r.totalNominal })
    if (ageActuel + r.year >= ageRetirement) break
  }

  const withdrawalData = computeWithdrawalPhase(
    capitalAtRetirement,
    monthlyGap,
    weightedReturn,
    ageRetirement,
    lifeExpectancy
  )

  return {
    capitalNeeded,
    capitalAtRetirement,
    passiveIncomeMonthly,
    runwayYears,
    monthlyGap,
    yearsUntilRetirement,
    shortfall,
    accumulationData,
    withdrawalData,
  }
}
