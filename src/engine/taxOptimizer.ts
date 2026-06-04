/**
 * Optimiseur fiscal — fonctions pures, zéro import React.
 * Analyse les enveloppes + résultats + profil fiscal et génère des suggestions.
 */

import type { Envelope, GlobalParams, SimulationResult, TaxProfile } from '../types'
import { formatEur } from '../utils/format'
import { PS_RATE } from './taxation'

export interface OptimizationSuggestion {
  id: string
  type: 'reallocation' | 'new_envelope' | 'timing'
  title: string
  description: string
  currentTax: number
  optimizedTax: number
  taxSaving: number
  effort: 'low' | 'medium' | 'high'
  actionLabel: string
  /** Patch à appliquer via updateEnvelope si l'utilisateur clique "Appliquer" */
  patch?: { envelopeId: string; monthlyContribution: number }
}

const FLAT_TAX = 0.30

export function analyzeTaxOptimization(
  envelopes: Envelope[],
  results: SimulationResult[],
  globalParams: GlobalParams,
  _taxProfile: TaxProfile
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = []
  const tmi = globalParams.tmi ?? 30
  const active = envelopes.filter((e) => e.active)
  const lastResult = results[results.length - 1]

  const cto = active.find((e) => e.type === 'cto')
  const pea = active.find((e) => e.type === 'pea')
  const per = active.find((e) => e.type === 'per')
  const av  = active.find((e) => e.type === 'assurance_vie')

  // ── Règle 1 — Arbitrage CTO → PEA ─────────────────────────────────────────
  if (cto && pea && tmi > 11) {
    const peaContrib = pea.currentRealValue ?? pea.initialCapital
    const peaCap = pea.maxContribution ?? 150_000
    const peaHeadroom = Math.max(0, peaCap - peaContrib)

    if (peaHeadroom > 1_000) {
      const ctoGains = lastResult ? (lastResult.byEnvelope[cto.id]?.grossGains ?? 0) : 0
      const currentTaxCTO  = ctoGains * FLAT_TAX
      const optimizedTaxPEA = ctoGains * PS_RATE
      const saving = currentTaxCTO - optimizedTaxPEA

      if (saving > 200) {
        const transferMonthly = Math.min(cto.monthlyContribution, Math.round(peaHeadroom / 12))
        suggestions.push({
          id: 'cto_to_pea',
          type: 'reallocation',
          title: 'Arbitrage CTO → PEA',
          description: `Avec votre TMI à ${tmi}%, déplacer ${formatEur(transferMonthly)}/mois du CTO vers le PEA réduit la fiscalité sur les gains de 30% (flat tax) à 17,2% (PS après 5 ans). Le PEA a encore ${formatEur(peaHeadroom)} de capacité.`,
          currentTax: currentTaxCTO,
          optimizedTax: optimizedTaxPEA,
          taxSaving: Math.round(saving),
          effort: 'medium',
          actionLabel: 'Réallouer vers le PEA',
          patch: cto && pea ? {
            envelopeId: cto.id,
            monthlyContribution: Math.max(0, cto.monthlyContribution - transferMonthly),
          } : undefined,
        })
      }
    }
  }

  // ── Règle 2 — Maximiser le PER si TMI élevé ───────────────────────────────
  if (tmi >= 30) {
    const annualIncome = globalParams.monthlyIncome * 12
    const perCap = annualIncome * 0.10
    const perAnnual = per ? per.monthlyContribution * 12 : 0
    const potential = Math.max(0, perCap - perAnnual)
    const taxSaving = Math.round(potential * (tmi / 100))

    if (taxSaving > 500) {
      if (per) {
        suggestions.push({
          id: 'per_maximize',
          type: 'reallocation',
          title: `Maximiser le PER (TMI ${tmi}%)`,
          description: `Vous versez ${formatEur(perAnnual)}/an sur votre PER. Le plafond déductible est ${formatEur(perCap)}/an (10% des revenus). En versant ${formatEur(potential)}/an supplémentaires, vous économiseriez ${formatEur(taxSaving)} d'impôts cette année.`,
          currentTax: 0,
          optimizedTax: 0,
          taxSaving,
          effort: 'low',
          actionLabel: 'Augmenter le PER',
          patch: {
            envelopeId: per.id,
            monthlyContribution: per.monthlyContribution + Math.round(potential / 12),
          },
        })
      } else {
        suggestions.push({
          id: 'per_open',
          type: 'new_envelope',
          title: `Ouvrir un PER (TMI ${tmi}%)`,
          description: `Vous n'avez pas de PER. Avec votre TMI à ${tmi}%, ouvrir un PER et y verser ${formatEur(perCap)}/an générerait ${formatEur(Math.round(perCap * tmi / 100))} d'économies fiscales annuelles.`,
          currentTax: 0,
          optimizedTax: 0,
          taxSaving: Math.round(perCap * tmi / 100),
          effort: 'high',
          actionLabel: 'Voir comment',
        })
      }
    }
  }

  // ── Règle 3 — Timing des retraits AV ──────────────────────────────────────
  if (av?.openedAt && av.closureHorizon != null) {
    const msPerYear = 365.25 * 24 * 3600 * 1000
    const yearsHeld = (Date.now() - new Date(av.openedAt).getTime()) / msPerYear
    const totalHeld = yearsHeld + av.closureHorizon

    if (yearsHeld < 8 && totalHeld < 8) {
      const avGains = lastResult ? (lastResult.byEnvelope[av.id]?.grossGains ?? 0) : 0
      const taxBefore = avGains * FLAT_TAX
      const abattement = globalParams.isCouple ? 9_200 : 4_600
      const taxAfter  = Math.max(0, avGains - abattement) * 0.247
      const saving = taxBefore - taxAfter

      if (saving > 200) {
        suggestions.push({
          id: 'av_timing',
          type: 'timing',
          title: 'Différer le retrait AV après 8 ans',
          description: `Votre assurance-vie est prévue pour être clôturée dans ${av.closureHorizon} an${av.closureHorizon > 1 ? 's' : ''}, avant les 8 ans fiscaux. En repoussant ce retrait après 8 ans, vous passez de 30% à 24,7% + abattement ${formatEur(abattement)}, soit ${formatEur(Math.round(saving))} d'économies estimées.`,
          currentTax: taxBefore,
          optimizedTax: taxAfter,
          taxSaving: Math.round(saving),
          effort: 'low',
          actionLabel: "Décaler l'horizon",
        })
      }
    }
  }

  // ── Règle 4 — Option barème CTO ───────────────────────────────────────────
  if (cto && tmi <= 11) {
    const ctoGains = lastResult ? (lastResult.byEnvelope[cto.id]?.grossGains ?? 0) : 0
    const flatTax    = ctoGains * FLAT_TAX
    const baremeTax  = ctoGains * (tmi / 100 + PS_RATE)
    const saving     = flatTax - baremeTax

    if (saving > 100) {
      suggestions.push({
        id: 'cto_bareme',
        type: 'timing',
        title: 'Barème progressif avantageux sur le CTO',
        description: `Avec votre TMI à ${tmi}%, le barème progressif (${tmi}% IR + 17,2% PS = ${(tmi + 17.2).toFixed(1)}%) est plus avantageux que la flat tax 30% sur votre CTO. Demandez l'option barème lors de votre déclaration d'impôts.`,
        currentTax: flatTax,
        optimizedTax: baremeTax,
        taxSaving: Math.round(saving),
        effort: 'low',
        actionLabel: 'Voir comment',
      })
    }
  }

  return suggestions.sort((a, b) => b.taxSaving - a.taxSaving)
}
