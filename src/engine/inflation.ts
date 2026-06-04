/**
 * Fonctions pures liées à l'inflation et au pouvoir d'achat — zéro import React.
 * Toujours la formule de Fisher exacte, jamais l'approximation r_réel ≈ r_nominal - i.
 */

// ─── Scénarios prédéfinis ─────────────────────────────────────────────────────

/** Taux annuels d'inflation (%) pour chaque scénario */
export const INFLATION_SCENARIOS = {
  low:    1.5,  // inflation faible
  medium: 2.5,  // inflation moyenne (référence BCE)
  high:   4.0,  // inflation forte
} as const

// ─── Formules ─────────────────────────────────────────────────────────────────

/**
 * Rendement réel via la formule de Fisher exacte.
 * @param nominalReturn - Rendement nominal en décimal (ex : 0.07 pour 7%)
 * @param inflation     - Inflation en décimal (ex : 0.025 pour 2.5%)
 * @returns Rendement réel en décimal
 */
export function realReturn(nominalReturn: number, inflation: number): number {
  return (1 + nominalReturn) / (1 + inflation) - 1
}

/**
 * Valeur actuelle d'un montant futur (actualisation par l'inflation).
 * Ramène des euros futurs vers des euros constants d'aujourd'hui.
 * @param futureAmount  - Montant en euros futurs
 * @param inflation     - Inflation annuelle en décimal
 * @param yearsFromNow  - Décalage temporel en années (peut être fractionnaire)
 * @returns Montant en euros constants
 */
export function presentValue(
  futureAmount: number,
  inflation: number,
  yearsFromNow: number
): number {
  if (yearsFromNow === 0 || inflation === 0) return futureAmount
  return futureAmount / Math.pow(1 + inflation, yearsFromNow)
}

/**
 * Résout le taux d'inflation à utiliser selon le scénario choisi.
 * 'custom' retourne la valeur manuelle saisie par l'utilisateur.
 * @param scenario   - Scénario sélectionné (ou undefined → 'custom')
 * @param customRate - Valeur manuelle en % (ex : 2)
 * @returns Taux d'inflation en %
 */
export function resolveInflationRate(
  scenario: 'custom' | 'low' | 'medium' | 'high' | undefined,
  customRate: number
): number {
  if (!scenario || scenario === 'custom') return customRate
  return INFLATION_SCENARIOS[scenario]
}
