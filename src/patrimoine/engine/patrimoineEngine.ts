/**
 * Moteur du module Patrimoine Réel — fonctions pures, ZÉRO import React.
 * Calculs d'agrégation du patrimoine actuel (actifs - passifs), ratios,
 * couverture d'urgence et timeline depuis les snapshots.
 */

import type {
  AssetMover,
  PatrimoineAsset,
  PatrimoineLiability,
  PatrimoineNetResult,
  PatrimoineSnapshot,
  PatrimoineTimelinePoint,
} from '../types/patrimoine'
import { ASSET_CATEGORY_META, REAL_ESTATE_CATEGORIES } from '../data/patrimoineCategories'

/**
 * Agrège le patrimoine net : totaux, répartition par catégorie et par
 * enveloppe fiscale, ratio de liquidités et taux d'endettement.
 */
export function computePatrimoineNet(
  assets: PatrimoineAsset[],
  liabilities: PatrimoineLiability[]
): PatrimoineNetResult {
  const byCategory: Record<string, number> = {}
  const byEnvelopeFiscale: Record<string, number> = {}
  let totalActifs = 0
  let liquid = 0

  for (const a of assets) {
    const v = a.currentValue || 0
    totalActifs += v
    byCategory[a.category] = (byCategory[a.category] ?? 0) + v
    const meta = ASSET_CATEGORY_META[a.category]
    if (meta?.liquid) liquid += v
    const env = meta?.envelopeFiscale ?? 'hors_enveloppe'
    byEnvelopeFiscale[env] = (byEnvelopeFiscale[env] ?? 0) + v
  }

  let totalPassifs = 0
  for (const l of liabilities) {
    const v = l.currentValue || 0
    totalPassifs += v
    byCategory[l.category] = (byCategory[l.category] ?? 0) + v
  }

  const patrimoineNet = totalActifs - totalPassifs

  return {
    totalActifs,
    totalPassifs,
    patrimoineNet,
    byCategory,
    byEnvelopeFiscale,
    liquiditeRatio: patrimoineNet > 0 ? liquid / patrimoineNet : null,
    tauxEndettement: totalActifs > 0 ? totalPassifs / totalActifs : null,
  }
}

/**
 * Loan-to-value d'un bien immobilier : encours de crédit / valeur du bien.
 * Retourne null si la catégorie n'est pas immobilière, si l'encours n'est
 * pas renseigné dans metadata.encoursCredit, ou si la valeur est nulle.
 */
export function computeLTV(asset: PatrimoineAsset): number | null {
  if (!REAL_ESTATE_CATEGORIES.includes(asset.category)) return null
  const encours = Number(asset.metadata?.encoursCredit)
  if (!Number.isFinite(encours) || encours <= 0) return null
  if (!asset.currentValue || asset.currentValue <= 0) return null
  return encours / asset.currentValue
}

/**
 * Couverture du fonds d'urgence : nombre de mois de dépenses couverts.
 * `monthlyExpenses` provient du snapshot budget (totalExpenses du mois) —
 * retourne null si les dépenses ne sont pas disponibles ou nulles.
 */
export function computeEmergencyCoverage(
  patrimoineNet: number,
  monthlyExpenses: number | null
): number | null {
  if (monthlyExpenses === null || monthlyExpenses <= 0) return null
  if (patrimoineNet <= 0) return 0
  return patrimoineNet / monthlyExpenses
}

/** Points de timeline pour Recharts, triés par date croissante. */
export function buildTimelineFromSnapshots(
  snapshots: PatrimoineSnapshot[]
): PatrimoineTimelinePoint[] {
  return [...snapshots]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({
      date: s.date.slice(0, 10),
      totalActifs: s.totalActifs,
      totalPassifs: s.totalPassifs,
      patrimoineNet: s.patrimoineNet,
    }))
}

/**
 * Top movers entre les deux derniers snapshots : actifs dont la valeur a le
 * plus varié en valeur absolue. Retourne [] si moins de 2 snapshots.
 */
export function computeTopMovers(
  snapshots: PatrimoineSnapshot[],
  assets: PatrimoineAsset[],
  count = 3
): AssetMover[] {
  if (snapshots.length < 2) return []
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date))
  const prev = sorted[sorted.length - 2]
  const curr = sorted[sorted.length - 1]
  const labelById = new Map(assets.map((a) => [a.id, a.label]))

  const ids = new Set([...Object.keys(prev.byAsset ?? {}), ...Object.keys(curr.byAsset ?? {})])
  const movers: AssetMover[] = []
  for (const id of ids) {
    const before = prev.byAsset?.[id] ?? 0
    const after = curr.byAsset?.[id] ?? 0
    const delta = after - before
    if (delta === 0) continue
    movers.push({
      assetId: id,
      label: labelById.get(id) ?? 'Actif supprimé',
      previousValue: before,
      currentValue: after,
      delta,
      deltaPct: before > 0 ? (delta / before) * 100 : null,
    })
  }
  return movers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, count)
}
