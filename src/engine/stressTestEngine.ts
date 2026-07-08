/**
 * Stress test de portefeuille — fonctions pures, zéro import React.
 * Applique un choc de marché au patrimoine et estime le temps de
 * récupération selon l'effort d'épargne mensuel actuel.
 */

import type { Envelope } from '../types'

export interface StressScenario {
  id: string
  label: string
  shockPct: number       // choc actions, négatif (ex : -50)
  description: string
}

export const STRESS_SCENARIOS: StressScenario[] = [
  { id: 'gfc2008', label: 'Crise 2008', shockPct: -50, description: 'Subprimes — S&P 500 -50 % sur 2007-2009' },
  { id: 'covid2020', label: 'Covid 2020', shockPct: -35, description: 'Krach éclair de mars 2020, -35 % en un mois' },
  { id: 'dotcom', label: 'Dot-com 2000', shockPct: -75, description: 'Éclatement de la bulle internet — Nasdaq -75 % sur 2000-2002' },
]

/** Sensibilité au choc actions par classe d'actif (facteur multiplicatif) */
const SHOCK_SENSITIVITY: Record<string, number> = {
  equity: 1.0,
  crypto: 1.5,
  real_estate: 0.5,
  bonds: 0.3,
  money_market: 0,
  regulated: 0,
}

const REGULATED_TYPES = new Set(['livret_a', 'ldds', 'livret_jeune'])

function classifyAsset(name: string): string {
  const n = name.toLowerCase()
  if (/crypto|bitcoin|btc|ethereum|eth|coin/i.test(n)) return 'crypto'
  if (/scpi|immobilier|reit|foncier|pierre/i.test(n)) return 'real_estate'
  if (/obligat|bond|agregat|souverain|treasury/i.test(n)) return 'bonds'
  if (/livret|monetaire|money.?market|fonds.?euro/i.test(n)) return 'money_market'
  return 'equity'
}

export interface StressTestResult {
  totalBefore: number
  loss: number
  totalAfter: number
  lossPct: number             // perte relative au patrimoine total (0–1)
  exposedAmount: number       // part du patrimoine sensible au choc
  recoveryMonths: number | null   // null si effort + rendement nuls
  avgAnnualReturnPct: number      // rendement pondéré utilisé pour la récupération
}

const MAX_RECOVERY_MONTHS = 600

/**
 * @param capitalByEnvelope capital par enveloppe au moment du choc
 * @param envelopes         config (allocation d'actifs, type)
 * @param monthlyEffort     versements mensuels totaux actuels €/mois
 * @param shockPct          choc actions, négatif (ex : -50)
 */
export function computeStressTest(
  capitalByEnvelope: Record<string, number>,
  envelopes: Envelope[],
  monthlyEffort: number,
  shockPct: number
): StressTestResult {
  let totalBefore = 0
  let loss = 0
  let exposedAmount = 0
  let weightedReturnSum = 0

  for (const env of envelopes.filter((e) => e.active)) {
    const capital = capitalByEnvelope[env.id] ?? 0
    if (capital <= 0) continue
    totalBefore += capital

    const assets = env.assets ?? []
    const totalAlloc = assets.reduce((s, a) => s + (a.allocation ?? 0), 0) || 100

    if (REGULATED_TYPES.has(env.type) || assets.length === 0) {
      const isRegulated = REGULATED_TYPES.has(env.type)
      const sensitivity = isRegulated ? 0 : SHOCK_SENSITIVITY.equity
      const hit = capital * sensitivity * Math.abs(shockPct) / 100
      loss += Math.min(capital, hit)
      if (sensitivity > 0) exposedAmount += capital
      const avgReturn = assets.length > 0
        ? assets.reduce((s, a) => s + a.expectedReturn * (a.allocation ?? 0), 0) / totalAlloc
        : (isRegulated ? 3 : 5)
      weightedReturnSum += avgReturn * capital
      continue
    }

    for (const asset of assets) {
      const share = capital * (asset.allocation ?? 0) / totalAlloc
      const sensitivity = SHOCK_SENSITIVITY[classifyAsset(asset.name)] ?? 1
      loss += Math.min(share, share * sensitivity * Math.abs(shockPct) / 100)
      if (sensitivity > 0) exposedAmount += share
      weightedReturnSum += asset.expectedReturn * share
    }
  }

  const totalAfter = totalBefore - loss
  const avgAnnualReturnPct = totalBefore > 0 ? weightedReturnSum / totalBefore : 0
  const monthlyRate = Math.pow(1 + avgAnnualReturnPct / 100, 1 / 12) - 1

  // Récupération : croissance + versements jusqu'à retrouver la valeur d'avant-choc
  let recoveryMonths: number | null
  if (loss > 0) {
    if (monthlyEffort <= 0 && monthlyRate <= 0) {
      recoveryMonths = null
    } else {
      let v = totalAfter
      let months = 0
      while (v < totalBefore && months < MAX_RECOVERY_MONTHS) {
        v = (v + monthlyEffort) * (1 + monthlyRate)
        months++
      }
      recoveryMonths = months >= MAX_RECOVERY_MONTHS ? null : months
    }
  } else {
    recoveryMonths = 0
  }

  return {
    totalBefore,
    loss,
    totalAfter,
    lossPct: totalBefore > 0 ? loss / totalBefore : 0,
    exposedAmount,
    recoveryMonths,
    avgAnnualReturnPct,
  }
}
