/**
 * Export Excel du bilan net — SheetJS (xlsx).
 * Exception documentée : xlsx est aussi utilisé par budget/engine/xlsxImport.ts.
 * 4 feuilles : Bilan net (projection 5 ans), Actifs par enveloppe, Passifs, Synthèse.
 */

import * as XLSX from 'xlsx'
import type { Envelope, Liability, SimulationResult } from '../types'
import { computeNetWorth, liabilityInterestCost, liabilityRemainingAt } from '../engine/netWorthEngine'

const LIABILITY_LABELS: Record<Liability['type'], string> = {
  mortgage: 'Crédit immobilier',
  car_loan: 'Crédit auto',
  consumer_credit: 'Crédit conso',
  student_loan: 'Prêt étudiant',
  other: 'Autre dette',
}

export function exportNetWorthXlsx(
  results: SimulationResult[],
  envelopes: Envelope[],
  liabilities: Liability[]
): void {
  const wb = XLSX.utils.book_new()
  const activeEnvelopes = envelopes.filter((e) => e.active)
  const activeLiabilities = liabilities.filter((l) => l.active !== false)
  const horizon = Math.min(5, results.length - 1)
  const yearIndices = Array.from({ length: horizon + 1 }, (_, i) => i)  // 0..5

  // ── Feuille 1 : Bilan net — projection 5 ans ────────────────────────────
  const bilanRows: (string | number)[][] = [
    ['Bilan net de patrimoine', '', '', '', ''],
    [],
    ['Année', 'Actifs totaux (€)', 'Passifs totaux (€)', 'Patrimoine net (€)', "Ratio d'endettement (%)"],
  ]
  for (const i of yearIndices) {
    const snap = computeNetWorth(results, activeLiabilities, i)
    bilanRows.push([
      i === 0 ? 'Aujourd\'hui (an 1)' : `Année ${results[i].year}`,
      Math.round(snap.totalAssets),
      Math.round(snap.totalLiabilities),
      Math.round(snap.netWorth),
      Math.round(snap.debtRatio * 100),
    ])
  }
  const wsBilan = XLSX.utils.aoa_to_sheet(bilanRows)
  wsBilan['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(wb, wsBilan, 'Bilan net')

  // ── Feuille 2 : Actifs par enveloppe ────────────────────────────────────
  const header = ['Enveloppe', 'Type', ...yearIndices.map((i) => `Année ${results[i].year} (€)`)]
  const actifRows: (string | number)[][] = [header]
  for (const env of activeEnvelopes) {
    actifRows.push([
      env.label,
      env.type,
      ...yearIndices.map((i) => Math.round(results[i].byEnvelope[env.id]?.capital ?? 0)),
    ])
  }
  actifRows.push([
    'TOTAL',
    '',
    ...yearIndices.map((i) => Math.round(results[i].totalNominal)),
  ])
  const wsActifs = XLSX.utils.aoa_to_sheet(actifRows)
  wsActifs['!cols'] = [{ wch: 22 }, { wch: 14 }, ...yearIndices.map(() => ({ wch: 15 }))]
  XLSX.utils.book_append_sheet(wb, wsActifs, 'Actifs par enveloppe')

  // ── Feuille 3 : Passifs ──────────────────────────────────────────────────
  const passifRows: (string | number)[][] = [
    ['Libellé', 'Type', 'Restant dû (€)', 'Mensualité (€)', 'Taux (%)', 'Mois restants', 'Intérêts restants (€)', 'Restant dû dans 5 ans (€)'],
  ]
  for (const l of activeLiabilities) {
    passifRows.push([
      l.label,
      LIABILITY_LABELS[l.type],
      Math.round(l.remainingAmount),
      Math.round(l.monthlyPayment),
      l.interestRate,
      l.remainingMonths,
      Math.round(liabilityInterestCost(l, 0)),
      Math.round(liabilityRemainingAt(l, 5)),
    ])
  }
  if (activeLiabilities.length === 0) passifRows.push(['Aucune dette renseignée'])
  const wsPassifs = XLSX.utils.aoa_to_sheet(passifRows)
  wsPassifs['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 15 }, { wch: 14 }, { wch: 10 }, { wch: 13 }, { wch: 19 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(wb, wsPassifs, 'Passifs')

  const today = new Date()
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  XLSX.writeFile(wb, `bilan-net-${dateStr}.xlsx`)
}
