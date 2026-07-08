/**
 * Position sizing — règle de base du money management professionnel.
 * Fonction pure, zéro import React.
 */

export interface PositionSizingInput {
  /** Capital du compte (valeur totale ou cash selon la convention de l'utilisateur). */
  capital: number
  /** Mode de risque : pourcentage du capital ou montant absolu. */
  riskMode: 'percent' | 'absolute'
  /** Valeur du risque : % (ex. 1 = 1%) ou € selon le mode. */
  riskValue: number
  /** Prix d'entrée prévu. */
  entryPrice: number
  /** Niveau de stop-loss prévu (doit être < entryPrice pour un long). */
  stopPrice: number
}

export interface PositionSizingResult {
  /** Montant risqué si le stop est touché (€). */
  riskAmount: number
  /** Risque par unité = |entrée − stop|. */
  riskPerShare: number
  /** Taille de position (quantité entière). */
  quantity: number
  /** Valeur notionnelle de la position à l'entrée. */
  positionValue: number
  /** Risque effectif avec la quantité arrondie (€). */
  actualRisk: number
  /** Risque effectif en % du capital. */
  actualRiskPct: number
  error?: string
}

export function computePositionSize(input: PositionSizingInput): PositionSizingResult {
  const empty: PositionSizingResult = {
    riskAmount: 0, riskPerShare: 0, quantity: 0, positionValue: 0, actualRisk: 0, actualRiskPct: 0,
  }
  if (input.capital <= 0) return { ...empty, error: 'Capital invalide' }
  if (input.entryPrice <= 0) return { ...empty, error: "Prix d'entrée invalide" }
  if (input.stopPrice <= 0) return { ...empty, error: 'Stop invalide' }
  if (input.stopPrice >= input.entryPrice) {
    return { ...empty, error: "Le stop doit être sous le prix d'entrée (position longue)" }
  }

  const riskAmount = input.riskMode === 'percent'
    ? input.capital * (input.riskValue / 100)
    : input.riskValue
  if (riskAmount <= 0) return { ...empty, error: 'Risque invalide' }

  const riskPerShare = input.entryPrice - input.stopPrice
  const quantity = Math.floor(riskAmount / riskPerShare)
  const positionValue = quantity * input.entryPrice
  const actualRisk = quantity * riskPerShare
  const actualRiskPct = input.capital > 0 ? (actualRisk / input.capital) * 100 : 0

  if (quantity <= 0) {
    return { riskAmount, riskPerShare, quantity: 0, positionValue: 0, actualRisk: 0, actualRiskPct: 0, error: 'Risque trop faible pour une unité — élargissez le risque ou resserrez le stop' }
  }
  if (positionValue > input.capital) {
    // Taille plafonnée par le capital disponible (pas de levier en paper trading)
    const cappedQty = Math.floor(input.capital / input.entryPrice)
    return {
      riskAmount,
      riskPerShare,
      quantity: cappedQty,
      positionValue: cappedQty * input.entryPrice,
      actualRisk: cappedQty * riskPerShare,
      actualRiskPct: input.capital > 0 ? (cappedQty * riskPerShare / input.capital) * 100 : 0,
      error: cappedQty > 0 ? 'Taille plafonnée par le capital disponible' : 'Capital insuffisant',
    }
  }

  return { riskAmount, riskPerShare, quantity, positionValue, actualRisk, actualRiskPct }
}
