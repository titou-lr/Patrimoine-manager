/**
 * Moteur de simulation patrimoniale — fonctions pures, zéro import React.
 *
 * Logique de calcul :
 *  - Itération mensuelle sur toute la durée (précision intérêts composés)
 *  - Chaque mois : balance = (balance + versement_net) * (1 + r/12)
 *  - Versement annuel ajouté en décembre (bonus, etc.)
 *  - Frais appliqués mensuellement (entrée, ordre) et annuellement (gestion, garde)
 *  - Plafonds légaux : arrêt des versements quand totalContributed >= maxContribution
 *  - Dividendes CTO : taxés en décembre via abattement 40% + TMI + PS
 *  - Fiscalité à la sortie calculée via computeTax() (module taxation.ts)
 *  - Valeur réelle via la formule de Fisher exacte (module inflation.ts)
 *  - Événements de vie : effets mensuels via buildEnvelopeEffects() (lifeEventsEngine.ts)
 */

import type {
  Envelope,
  EnvelopeFees,
  EnvelopeType,
  GlobalParams,
  SimulationResult,
  EnvelopeResult,
  TaxProfile,
  InflationImpact,
  LifeEvent,
} from '../types'
import { computeTax, taxCTODividend } from './taxation'
import { realReturn, presentValue, resolveInflationRate } from './inflation'
import { buildEnvelopeEffects, type EnvelopeEffect } from './lifeEventsEngine'

// ─── Constantes ───────────────────────────────────────────────────────────────

const MONTHS_PER_YEAR = 12

/** Plafonds légaux de versements cumulés par type d'enveloppe (en €) — source unique */
export const ENVELOPE_CAPS: Partial<Record<EnvelopeType, number>> = {
  livret_a:      22_950,
  ldds:          12_000,
  livret_jeune:   1_600,
  pea:          150_000,
}

export const ZERO_FEES: EnvelopeFees = {
  orderFees: 0,
  orderFeesMin: 0,
  custodyFees: 0,
  entryFees: 0,
  managementFees: 0,
  exitFees: 0,
}

// ─── Fonctions internes ───────────────────────────────────────────────────────

/**
 * Rendement annuel pondéré par l'allocation de chaque actif.
 * Retourne un taux en décimal (ex : 0.07 pour 7%).
 */
function weightedAnnualReturn(envelope: Envelope): number {
  return envelope.assets.reduce(
    (sum, asset) => sum + (asset.expectedReturn / 100) * (asset.allocation / 100),
    0
  )
}

/**
 * Simule une enveloppe mois par mois sur toute la durée.
 *
 * Ordre de résolution par mois :
 *  1. Calculer le versement de base (monthlyContribution × fréquence)
 *  2. Appliquer les effets d'événements de vie → ownBase
 *  3. Ajouter l'éventuel surplus redirigé depuis d'autres enveloppes (extraContribPerMonth)
 *  4. Appliquer le plafond légal → monthlyGross, surplus = ce qui n'a pas pu être versé
 *  5. Appliquer les frais, puis les intérêts composés
 *
 * Retourne les résultats annuels ET la map surplus par mois (pour capRedirectTo).
 */
function simulateEnvelope(
  envelope: Envelope,
  years: number,
  inflationRate: number,
  taxProfile: TaxProfile,
  effectsMap: Map<number, EnvelopeEffect> = new Map(),
  extraContribPerMonth: Map<number, number> = new Map()
): { results: EnvelopeResult[]; surplusPerMonth: Map<number, number> } {
  const monthlyRate = weightedAnnualReturn(envelope) / MONTHS_PER_YEAR
  const fees = envelope.fees ?? ZERO_FEES
  const isOrderBased = envelope.type === 'pea' || envelope.type === 'cto'
  const inflationDecimal = inflationRate / 100
  const maxCont = envelope.maxContribution ?? ENVELOPE_CAPS[envelope.type] ?? Infinity
  const dividendRate = envelope.dividendRate ?? 0
  const freq = envelope.contributionFrequency ?? 'monthly'
  const monthlyDividendOut = (envelope.reinvestDividends === false)
    ? (envelope.estimatedMonthlyDividends ?? 0)
    : 0
  const yearsAlreadyHeld = envelope.openedAt
    ? Math.max(0, (Date.now() - new Date(envelope.openedAt).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 0

  // currentRealValue overrides balance start — initialCapital stays as cost basis
  let balance = (envelope.currentRealValue != null && envelope.currentRealValue > 0)
    ? envelope.currentRealValue
    : envelope.initialCapital
  let totalContributed = envelope.initialCapital
  let totalFeesPaid = 0
  let isCapped = false
  let capFirstYear: number | undefined = undefined
  let contribRealValueAccum = 0

  const results: EnvelopeResult[] = []
  const surplusPerMonth = new Map<number, number>()

  for (let y = 1; y <= years; y++) {
    let annualPerTaxSavings = 0
    const isClosed = envelope.closureHorizon != null && y > envelope.closureHorizon

    for (let m = 1; m <= MONTHS_PER_YEAR; m++) {
      const globalMonth = (y - 1) * MONTHS_PER_YEAR + m
      const effect = effectsMap.get(globalMonth)
      const extraContrib = extraContribPerMonth.get(globalMonth) ?? 0

      // ── Fréquence de versement + horizon de clôture ───────────────────────
      let freqActive = !isClosed
      if (freqActive && freq === 'quarterly') freqActive = m % 3 === 0
      if (freqActive && freq === 'annual') freqActive = m === 1

      const baseAmount = freq === 'quarterly'
        ? envelope.monthlyContribution * 3
        : freq === 'annual'
        ? envelope.monthlyContribution * 12
        : envelope.monthlyContribution

      // ── 1. Versement prévu (événements de vie appliqués EN PREMIER) ────────
      let ownBase: number
      if (!freqActive) {
        ownBase = 0
      } else if (effect?.contributionMultiplier === 0) {
        ownBase = 0
      } else if (effect) {
        ownBase = Math.max(0, baseAmount * effect.contributionMultiplier + effect.contributionDelta)
      } else {
        ownBase = baseAmount
      }

      // ── 2. Plafond versements — surplus = part écrêtée du versement propre ─
      let monthlyGross: number
      if (isCapped) {
        monthlyGross = 0
        if (ownBase > 0) surplusPerMonth.set(globalMonth, ownBase)
      } else {
        const available = maxCont - totalContributed
        const totalIntended = ownBase + extraContrib
        if (available <= 0) {
          monthlyGross = 0
          if (ownBase > 0) surplusPerMonth.set(globalMonth, ownBase)
          isCapped = true
          if (capFirstYear === undefined) capFirstYear = y - 1
        } else {
          monthlyGross = Math.min(totalIntended, available)
          const surplus = ownBase - Math.max(0, monthlyGross - extraContrib)
          if (surplus > 0) surplusPerMonth.set(globalMonth, surplus)
          if (totalIntended >= available) {
            isCapped = true
            if (capFirstYear === undefined) capFirstYear = y - 1
          }
        }
      }

      // ── Frais mensuels ────────────────────────────────────────────────────
      const entryFeeAmount = monthlyGross * (fees.entryFees / 100)
      let orderFeeAmount = 0
      if (isOrderBased && monthlyGross > 0) {
        orderFeeAmount = Math.max(fees.orderFeesMin, monthlyGross * (fees.orderFees / 100))
      }
      const effectiveContribution = Math.max(0, monthlyGross - entryFeeAmount - orderFeeAmount)
      totalFeesPaid += entryFeeAmount + orderFeeAmount

      // ── Intérêts composés ─────────────────────────────────────────────────
      balance = (balance + effectiveContribution) * (1 + monthlyRate)
      totalContributed += monthlyGross

      // ── Dividendes non réinvestis (retrait mensuel) ───────────────────────
      if (monthlyDividendOut > 0) {
        balance = Math.max(0, balance - monthlyDividendOut)
      }

      // ── Événements de vie : windfall / withdrawal ─────────────────────────
      if (effect?.balanceDelta) {
        balance = Math.max(0, balance + effect.balanceDelta)
      }

      // ── Versements en euros constants ─────────────────────────────────────
      const yearOffset = (y - 1) + (m - 1) / MONTHS_PER_YEAR
      contribRealValueAccum += presentValue(monthlyGross, inflationDecimal, yearOffset)

      // ── Économie fiscale PER ──────────────────────────────────────────────
      if (envelope.type === 'per' && monthlyGross > 0) {
        annualPerTaxSavings += monthlyGross * (taxProfile.tmi / 100)
      }

      // ── Opérations de fin d'année (décembre) ─────────────────────────────
      if (m === MONTHS_PER_YEAR) {
        // Versement annuel ponctuel (bonus, prime) — arrêté si enveloppe clôturée
        const yearlyGross = isClosed ? 0 : envelope.yearlyContribution
        if (yearlyGross > 0 && !isCapped) {
          const yearlyEntryFee = yearlyGross * (fees.entryFees / 100)
          balance += yearlyGross - yearlyEntryFee
          totalContributed += yearlyGross
          totalFeesPaid += yearlyEntryFee
          contribRealValueAccum += presentValue(yearlyGross, inflationDecimal, y)
          if (envelope.type === 'per') {
            annualPerTaxSavings += yearlyGross * (taxProfile.tmi / 100)
          }
        }

        // Frais annuels de gestion et de garde
        const annualFeeRate = (fees.custodyFees + fees.managementFees) / 100
        if (annualFeeRate > 0) {
          const annualFeeAmount = balance * annualFeeRate
          balance = Math.max(0, balance - annualFeeAmount)
          totalFeesPaid += annualFeeAmount
        }

        // Dividendes CTO : abattement 40%, barème TMI + PS (taxés chaque année)
        if (envelope.type === 'cto' && dividendRate > 0) {
          const annualDividends = balance * (dividendRate / 100)
          const divTax = taxCTODividend(annualDividends, taxProfile.tmi)
          balance = Math.max(0, balance - divTax)
        }
      }
    }

    // ── Snapshot annuel ───────────────────────────────────────────────────────
    const grossGains = Math.max(0, balance - totalContributed)
    const trueYearsHeld = y + yearsAlreadyHeld
    const taxResult = computeTax(envelope, grossGains, totalContributed, balance, trueYearsHeld, taxProfile)
    const netCapital = balance - taxResult.taxAmount
    const realValue = netCapital / Math.pow(1 + inflationDecimal, y)

    results.push({
      capital: netCapital,
      totalContributed,
      grossGains,
      tax: taxResult.taxAmount,
      totalGains: grossGains - taxResult.taxAmount,
      realValue,
      totalFeesPaid,
      capped: isCapped,
      capReachedYear: capFirstYear,
      perTaxSavings: annualPerTaxSavings,
      contributionsRealValue: contribRealValueAccum,
      taxDetails: taxResult.details,
    })
  }

  return { results, surplusPerMonth }
}

// ─── Export public ────────────────────────────────────────────────────────────

/**
 * Point d'entrée principal du moteur.
 * Simule chaque enveloppe active sur la durée définie dans params.
 */
export function runSimulation(
  envelopes: Envelope[],
  params: GlobalParams,
  events: LifeEvent[] = []
): SimulationResult[] {
  // Résolution du taux d'inflation
  const adjustedInflation = resolveInflationRate(params.inflationScenario, params.inflationRate)
  const inflationDecimal = adjustedInflation / 100

  // Profil fiscal à partir des paramètres globaux
  const isCouple = params.isCouple ?? false
  const taxProfile: TaxProfile = {
    tmi: params.tmi ?? 30,
    isCouple,
    avAbattement: isCouple ? 9200 : 4600,
  }

  const adjustedEnvelopes = envelopes

  // Defensive: treat active===undefined as true (handles old localStorage state)
  const active = adjustedEnvelopes.filter((e) => e.active !== false)
  const numActive = active.length

  // Rendement réel Fisher par enveloppe active (constant sur toute la durée)
  const realReturnByEnvelope: Record<string, number> = {}
  for (const env of active) {
    realReturnByEnvelope[env.id] = realReturn(weightedAnnualReturn(env), inflationDecimal)
  }

  // Construction des cartes d'effets par enveloppe (Feature 4 — événements de vie)
  const effectsMaps: Map<string, Map<number, EnvelopeEffect>> = new Map()
  if (events.length > 0) {
    for (const env of active) {
      effectsMaps.set(
        env.id,
        buildEnvelopeEffects(
          events,
          env.id,
          params.duration,
          numActive,
          params.monthlyIncome,
          params.investmentRate
        )
      )
    }
  }

  // Passe 1 : simuler toutes les enveloppes, collecter les surplus des sources capRedirectTo
  const rawSeries: Record<string, { results: EnvelopeResult[]; surplusPerMonth: Map<number, number> }> = {}
  for (const env of active) {
    rawSeries[env.id] = simulateEnvelope(
      env,
      params.duration,
      adjustedInflation,
      taxProfile,
      effectsMaps.get(env.id) ?? new Map()
    )
  }

  // Construire les extra-contributions mensuelles pour les enveloppes cibles
  const extraContribsByTarget: Record<string, Map<number, number>> = {}
  for (const env of active) {
    if (!env.capRedirectTo) continue
    const { surplusPerMonth } = rawSeries[env.id]
    if (surplusPerMonth.size === 0) continue
    if (!extraContribsByTarget[env.capRedirectTo]) {
      extraContribsByTarget[env.capRedirectTo] = new Map()
    }
    for (const [month, surplus] of surplusPerMonth) {
      const prev = extraContribsByTarget[env.capRedirectTo].get(month) ?? 0
      extraContribsByTarget[env.capRedirectTo].set(month, prev + surplus)
    }
  }

  // Passe 2 : re-simuler les enveloppes cibles avec les surplus reçus
  const byEnvelopeTimeSeries: Record<string, EnvelopeResult[]> = {}
  for (const env of active) {
    const extra = extraContribsByTarget[env.id]
    if (extra && extra.size > 0) {
      const { results } = simulateEnvelope(
        env,
        params.duration,
        adjustedInflation,
        taxProfile,
        effectsMaps.get(env.id) ?? new Map(),
        extra
      )
      byEnvelopeTimeSeries[env.id] = results
    } else {
      byEnvelopeTimeSeries[env.id] = rawSeries[env.id].results
    }
  }

  // Agrégation annuelle
  const results: SimulationResult[] = []

  for (let y = 0; y < params.duration; y++) {
    const byEnvelope: Record<string, EnvelopeResult> = {}
    let totalNominal = 0
    let totalReal = 0
    let totalContributed = 0
    let totalGains = 0
    let totalFeesPaid = 0
    let perTaxSavings = 0
    let contribRealValue = 0
    const cappedEnvelopes: string[] = []
    const taxByEnvelope: Record<string, number> = {}

    for (const env of active) {
      const r = byEnvelopeTimeSeries[env.id][y]
      byEnvelope[env.id] = r
      totalNominal += r.capital
      totalReal += r.realValue
      totalContributed += r.totalContributed
      totalGains += r.totalGains
      totalFeesPaid += r.totalFeesPaid
      perTaxSavings += r.perTaxSavings ?? 0
      contribRealValue += r.contributionsRealValue ?? 0
      taxByEnvelope[env.id] = r.tax
      if (r.capped) cappedEnvelopes.push(env.id)
    }

    const inflationImpact: InflationImpact = {
      totalNominal,
      totalReal,
      purchasingPowerLost: totalNominal - totalReal,
      contributionsRealValue: contribRealValue,
      realReturnByEnvelope,
    }

    results.push({
      year: y + 1,
      byEnvelope,
      totalNominal,
      totalReal,
      totalContributed,
      totalGains,
      totalFeesPaid,
      inflationImpact,
      perTaxSavings,
      cappedEnvelopes,
      taxByEnvelope,
    })
  }

  return results
}
