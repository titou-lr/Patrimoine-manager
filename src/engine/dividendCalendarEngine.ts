/**
 * Calendrier de dividendes — fonctions pures, zéro import React.
 * Estime les revenus passifs annuels par trimestre à partir des actifs
 * générateurs de revenus déjà saisis (SCPI, obligations, ETF distribuants,
 * dividendes CTO) et des rendements attendus configurés.
 */

import type { Envelope } from '../types'

export type IncomeKind = 'scpi' | 'bonds' | 'dividend_etf' | 'cto_dividends'

export interface IncomeSource {
  envelopeId: string
  envelopeLabel: string
  assetName: string
  kind: IncomeKind
  annualIncome: number
  /** Répartition dans l'année : trimestrielle, semestrielle (Q2/Q4) ou mensuelle */
  distribution: 'quarterly' | 'semiannual' | 'monthly'
}

export interface QuarterIncome {
  quarter: 1 | 2 | 3 | 4
  total: number
  bySource: { label: string; amount: number }[]
}

export interface DividendCalendar {
  sources: IncomeSource[]
  quarters: QuarterIncome[]
  annualTotal: number
  monthlyAverage: number
}

const KIND_PATTERNS: { kind: IncomeKind; re: RegExp; distribution: IncomeSource['distribution'] }[] = [
  { kind: 'scpi', re: /scpi|immobilier|foncier|pierre|reit/i, distribution: 'quarterly' },
  { kind: 'bonds', re: /obligat|bond|agregat|souverain|treasury|coupon/i, distribution: 'semiannual' },
  { kind: 'dividend_etf', re: /distribu|dividend|rendement|high.?yield/i, distribution: 'quarterly' },
]

/** Part du trimestre q pour une distribution donnée */
function quarterShare(distribution: IncomeSource['distribution'], q: number): number {
  if (distribution === 'semiannual') return q === 2 || q === 4 ? 0.5 : 0
  return 0.25 // quarterly et monthly : lissé sur les 4 trimestres
}

/**
 * @param envelopes         enveloppes actives (allocation, rendements, options dividendes)
 * @param capitalByEnvelope capital par enveloppe à l'année choisie
 */
export function computeDividendCalendar(
  envelopes: Envelope[],
  capitalByEnvelope: Record<string, number>
): DividendCalendar {
  const sources: IncomeSource[] = []

  for (const env of envelopes.filter((e) => e.active)) {
    const capital = capitalByEnvelope[env.id] ?? 0
    if (capital <= 0) continue

    const assets = env.assets ?? []
    const totalAlloc = assets.reduce((s, a) => s + (a.allocation ?? 0), 0) || 100

    // 1. Actifs distributifs par nature (SCPI, obligations, ETF distribuants)
    for (const asset of assets) {
      const match = KIND_PATTERNS.find((p) => p.re.test(asset.name))
      if (!match) continue
      const share = capital * (asset.allocation ?? 0) / totalAlloc
      const annualIncome = share * asset.expectedReturn / 100
      if (annualIncome <= 0) continue
      sources.push({
        envelopeId: env.id,
        envelopeLabel: env.label,
        assetName: asset.name,
        kind: match.kind,
        annualIncome,
        distribution: match.distribution,
      })
    }

    // 2. Dividendes CTO explicites (dividendRate ou estimation mensuelle saisie)
    if (env.type === 'cto') {
      if (env.reinvestDividends === false && (env.estimatedMonthlyDividends ?? 0) > 0) {
        sources.push({
          envelopeId: env.id,
          envelopeLabel: env.label,
          assetName: 'Dividendes (estimation saisie)',
          kind: 'cto_dividends',
          annualIncome: (env.estimatedMonthlyDividends ?? 0) * 12,
          distribution: 'monthly',
        })
      } else if ((env.dividendRate ?? 0) > 0) {
        const weightedReturn = assets.length > 0
          ? assets.reduce((s, a) => s + a.expectedReturn * (a.allocation ?? 0), 0) / totalAlloc
          : 0
        const annualIncome = capital * (weightedReturn / 100) * ((env.dividendRate ?? 0) / 100)
        if (annualIncome > 0) {
          sources.push({
            envelopeId: env.id,
            envelopeLabel: env.label,
            assetName: `Dividendes (${env.dividendRate}% des rendements)`,
            kind: 'cto_dividends',
            annualIncome,
            distribution: 'quarterly',
          })
        }
      }
    }
  }

  const quarters: QuarterIncome[] = ([1, 2, 3, 4] as const).map((q) => {
    const bySource = sources
      .map((s) => ({
        label: `${s.assetName} — ${s.envelopeLabel}`,
        amount: s.annualIncome * quarterShare(s.distribution, q),
      }))
      .filter((x) => x.amount > 0)
      .sort((a, b) => b.amount - a.amount)
    return { quarter: q, total: bySource.reduce((s, x) => s + x.amount, 0), bySource }
  })

  const annualTotal = sources.reduce((s, x) => s + x.annualIncome, 0)

  return { sources, quarters, annualTotal, monthlyAverage: annualTotal / 12 }
}
