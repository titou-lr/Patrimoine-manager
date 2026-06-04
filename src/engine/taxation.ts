/**
 * Fonctions pures de calcul fiscal — zéro import React.
 * Couvre tous les types d'enveloppes fiscales françaises supportées.
 */

import type { Envelope, TaxProfile, TaxResult } from '../types'

// ─── Constantes fiscales ──────────────────────────────────────────────────────

export const PS_RATE = 0.172       // Prélèvements sociaux
const FLAT_TAX_RATE = 0.30         // PFU : 12.8% IR + 17.2% PS
const AV_REDUCED_RATE = 0.247      // AV > 8 ans : 7.5% IR + 17.2% PS
const AV_THRESHOLD = 150_000       // Seuil versements AV pour basculer au taux plein

// ─── Helpers ─────────────────────────────────────────────────────────────────

function noGain(grossGain: number): TaxResult {
  return { grossGain, taxAmount: 0, netGain: grossGain, effectiveRate: 0, details: 'Aucun gain imposable' }
}

function result(grossGain: number, taxAmount: number, details: string): TaxResult {
  const clamped = Math.max(0, taxAmount)
  return {
    grossGain,
    taxAmount: clamped,
    netGain: grossGain - clamped,
    effectiveRate: grossGain > 0 ? clamped / grossGain : 0,
    details,
  }
}

// ─── Fonctions par enveloppe ─────────────────────────────────────────────────

export function taxPEA(gain: number, yearsHeld: number): TaxResult {
  if (gain <= 0) return noGain(gain)
  if (yearsHeld < 5) {
    return result(gain, gain * FLAT_TAX_RATE, 'Flat tax 30% — retrait avant 5 ans')
  }
  return result(gain, gain * PS_RATE, 'PS 17.2% uniquement — PEA ≥ 5 ans')
}

export function taxCTO(gain: number, taxProfile: TaxProfile): TaxResult {
  if (gain <= 0) return noGain(gain)
  // Option auto : barème si TMI ≤ 11%, sinon flat tax (PFU)
  if (taxProfile.tmi <= 11) {
    const rate = taxProfile.tmi / 100 + PS_RATE
    return result(gain, gain * rate, `Barème progressif : TMI ${taxProfile.tmi}% + PS 17.2%`)
  }
  return result(gain, gain * FLAT_TAX_RATE, 'Flat tax (PFU) 30%')
}

export function taxAV(
  gain: number,
  totalContributed: number,
  yearsHeld: number,
  taxProfile: TaxProfile
): TaxResult {
  if (gain <= 0) return noGain(gain)
  if (yearsHeld < 8) {
    return result(gain, gain * FLAT_TAX_RATE, 'Flat tax 30% — contrat < 8 ans')
  }

  const abattement = taxProfile.avAbattement

  if (totalContributed <= AV_THRESHOLD) {
    const taxable = Math.max(0, gain - abattement)
    return result(gain, taxable * AV_REDUCED_RATE, `AV ≥ 8 ans — abattement ${abattement}€, taux 24.7%`)
  }

  // Versements > 150k€ : répartition proportionnelle entre les deux tranches
  const ratioBelow = AV_THRESHOLD / totalContributed
  const gainsBelow = gain * ratioBelow
  const gainsAbove = gain * (1 - ratioBelow)
  const taxableBelow = Math.max(0, gainsBelow - abattement)
  const tax = taxableBelow * AV_REDUCED_RATE + gainsAbove * FLAT_TAX_RATE
  return result(gain, tax, `AV ≥ 8 ans — versements > 150k€ (mixte 24.7% / 30%)`)
}

export function taxPER(
  gain: number,
  totalContributed: number,
  taxProfile: TaxProfile
): TaxResult {
  // Sortie en capital : versements déduits taxés au TMI, plus-values en flat tax 30%
  const taxOnContributions = Math.max(0, totalContributed) * (taxProfile.tmi / 100)
  const taxOnGains = Math.max(0, gain) * FLAT_TAX_RATE
  const taxAmount = taxOnContributions + taxOnGains
  const totalBase = Math.max(0, totalContributed) + Math.max(0, gain)
  const effectiveRate = totalBase > 0 ? taxAmount / totalBase : 0
  return {
    grossGain: gain,
    taxAmount,
    netGain: gain - taxAmount,
    effectiveRate,
    details: `PER sortie capital — TMI ${taxProfile.tmi}% sur versements, flat tax 30% sur gains`,
  }
}

// ─── Dividendes CTO ───────────────────────────────────────────────────────────

/**
 * Fiscalité des dividendes CTO : abattement 40%, barème TMI + PS.
 * Taxés annuellement (pas à la sortie).
 */
export function taxCTODividend(dividends: number, tmi: number): number {
  if (dividends <= 0) return 0
  return dividends * 0.60 * (tmi / 100 + PS_RATE)
}

// ─── Point d'entrée principal ─────────────────────────────────────────────────

/**
 * Calcule la fiscalité à la sortie pour une enveloppe donnée.
 * Simulation de liquidation annuelle pour permettre la comparaison inter-enveloppes.
 */
export function computeTax(
  envelope: Envelope,
  totalGain: number,
  totalContributed: number,
  _capitalTotal: number,
  yearsHeld: number,
  taxProfile: TaxProfile
): TaxResult {
  const { type } = envelope

  if (type === 'livret_a' || type === 'ldds' || type === 'livret_jeune') {
    return {
      grossGain: totalGain,
      taxAmount: 0,
      netGain: totalGain,
      effectiveRate: 0,
      details: 'Exonéré — livret réglementé',
    }
  }

  if (type === 'pea') return taxPEA(totalGain, yearsHeld)
  if (type === 'cto') return taxCTO(totalGain, taxProfile)
  if (type === 'assurance_vie') return taxAV(totalGain, totalContributed, yearsHeld, taxProfile)
  if (type === 'per') return taxPER(totalGain, totalContributed, taxProfile)

  // Fallback : taux personnalisé de l'enveloppe
  const taxAmount = Math.max(0, totalGain) * (envelope.taxRate / 100)
  return result(totalGain, taxAmount, `Taux personnalisé ${envelope.taxRate}%`)
}
