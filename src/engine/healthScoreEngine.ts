/**
 * Score de santé financière — fonctions pures, zéro import React.
 * Agrège 4 composantes (0–100) : taux d'épargne réel, dépassements
 * d'enveloppes budget, ratio dette/patrimoine, progression des objectifs.
 * Les composantes sans données sont exclues et leur poids redistribué.
 */

export interface HealthScoreInput {
  /** Taux d'épargne réel du mois (0–1) — null si pas de données budget */
  realSavingsRate: number | null
  /** Nombre d'enveloppes budget en dépassement ce mois — null si pas d'enveloppes */
  overrunCount: number | null
  envelopeCount: number | null
  /** Passifs / actifs (0–1+) — null si pas de simulation ou pas de dettes renseignées */
  debtRatio: number | null
  /** Progression moyenne des objectifs d'épargne (0–1) — null si aucun objectif */
  goalsAvgProgress: number | null
}

export interface HealthScoreComponent {
  id: 'savings' | 'overruns' | 'debt' | 'goals'
  label: string
  score: number      // 0–1 (0 si indisponible)
  weight: number     // poids nominal
  available: boolean
}

export type HealthGrade = 'excellent' | 'bon' | 'fragile' | 'critique'

export interface HealthScoreResult {
  score: number | null          // 0–100 — null si aucune composante disponible
  grade: HealthGrade | null
  components: HealthScoreComponent[]
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

export function computeHealthScore(input: HealthScoreInput): HealthScoreResult {
  const components: HealthScoreComponent[] = []

  // Taux d'épargne : 0% → 0, ≥20% → 1 (linéaire)
  components.push({
    id: 'savings',
    label: "Taux d'épargne réel",
    score: input.realSavingsRate !== null ? clamp01(input.realSavingsRate / 0.2) : 0,
    weight: 30,
    available: input.realSavingsRate !== null,
  })

  // Dépassements : 1 - part d'enveloppes en dépassement
  const hasEnvelopes = input.overrunCount !== null && input.envelopeCount !== null && input.envelopeCount > 0
  components.push({
    id: 'overruns',
    label: 'Maîtrise du budget',
    score: hasEnvelopes ? clamp01(1 - (input.overrunCount ?? 0) / (input.envelopeCount ?? 1)) : 0,
    weight: 20,
    available: hasEnvelopes,
  })

  // Endettement : ratio ≤10% → 1, ≥60% → 0 (linéaire)
  components.push({
    id: 'debt',
    label: 'Endettement',
    score: input.debtRatio !== null ? clamp01(1 - (input.debtRatio - 0.1) / 0.5) : 0,
    weight: 30,
    available: input.debtRatio !== null,
  })

  // Objectifs : progression moyenne
  components.push({
    id: 'goals',
    label: 'Objectifs d\'épargne',
    score: input.goalsAvgProgress !== null ? clamp01(input.goalsAvgProgress) : 0,
    weight: 20,
    available: input.goalsAvgProgress !== null,
  })

  const available = components.filter((c) => c.available)
  const totalWeight = available.reduce((s, c) => s + c.weight, 0)
  if (totalWeight === 0) return { score: null, grade: null, components }

  const score = Math.round(
    (available.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight) * 100
  )

  const grade: HealthGrade =
    score >= 80 ? 'excellent' : score >= 60 ? 'bon' : score >= 40 ? 'fragile' : 'critique'

  return { score, grade, components }
}
