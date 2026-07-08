/**
 * Benchmark de portefeuille — fonctions pures, zéro import React.
 * Réplique les flux de versements de la simulation (totalContributed annuel)
 * investis dans un indice de référence à rendement annualisé constant.
 */

import type { SimulationResult } from '../types'

export interface BenchmarkPoint {
  year: number
  portfolio: number   // patrimoine simulé (nominal)
  benchmark: number   // mêmes versements investis dans l'indice
}

/**
 * Série annuelle : pour chaque année, les versements de l'année (delta de
 * totalContributed) sont injectés mensuellement et capitalisés au taux de
 * l'indice. Comparaison à flux identiques — seule la performance diffère.
 */
export function computeBenchmarkSeries(
  results: SimulationResult[],
  annualReturnPct: number
): BenchmarkPoint[] {
  const monthlyRate = Math.pow(1 + annualReturnPct / 100, 1 / 12) - 1
  const points: BenchmarkPoint[] = []
  let value = 0
  let prevContributed = 0

  for (const r of results) {
    const yearContribution = Math.max(0, r.totalContributed - prevContributed)
    const monthlyContribution = yearContribution / 12
    for (let m = 0; m < 12; m++) {
      value = (value + monthlyContribution) * (1 + monthlyRate)
    }
    prevContributed = r.totalContributed
    points.push({ year: r.year, portfolio: r.totalNominal, benchmark: value })
  }

  return points
}
