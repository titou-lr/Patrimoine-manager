/**
 * Optimiseur de portefeuille — Black-Litterman + CVaR + location fiscale.
 * Fonctions pures, zéro import React.
 */

import type {
  Asset, AssetClass, EconomicRegime, Envelope,
  TaxProfile, OptimizedAllocation, LocationSuggestion, BlackLittermanView,
} from '../types'
import {
  ASSET_CLASS_PARAMS, ASSET_CLASS_CORRELATIONS, MARKET_CAP_WEIGHTS,
  BL_DELTA, BL_TAU, mapAssetClass,
} from '../data/regimeData'
import { PS_RATE } from './taxation'

// ─── Fonctions fiscales précises ──────────────────────────────────────────────

export function effectivePEARate(yearsHeld: number, closureHorizon: number): number {
  return (yearsHeld + closureHorizon) >= 5 ? PS_RATE : 0.30
}

export function effectivePERReturn(
  grossReturn: number,
  _monthlyContribution: number,
  tmi: number,
  exitTMI: number
): number {
  return grossReturn + (tmi / 100) - (exitTMI / 100)
}

export function effectiveAVRate(totalGain: number, yearsHeld: number, isCouple: boolean): number {
  if (yearsHeld < 8) return 0.30
  const abattement = isCouple ? 9200 : 4600
  const gainImposable = Math.max(0, totalGain - abattement)
  if (gainImposable === 0) return 0
  return (gainImposable * 0.247) / totalGain
}

export function getEffectiveTaxRate(
  envelope: Envelope,
  totalGain: number,
  taxProfile: TaxProfile,
  yearsHeld: number = 0,
  duration: number = 20
): number {
  if (totalGain <= 0) return 0
  const closureHorizon = envelope.closureHorizon ?? duration
  switch (envelope.type) {
    case 'pea':
      return effectivePEARate(yearsHeld, closureHorizon)
    case 'per':
      return taxProfile.tmi / 100
    case 'assurance_vie':
      return effectiveAVRate(totalGain, yearsHeld, taxProfile.isCouple)
    case 'livret_a':
    case 'ldds':
    case 'livret_jeune':
      return 0
    case 'cto':
      return taxProfile.tmi <= 11 ? taxProfile.tmi / 100 + PS_RATE : 0.30
    default:
      return 0.30
  }
}

// ─── Utilitaires matriciels ───────────────────────────────────────────────────

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B[0].length, k = B.length
  return Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      Array.from({ length: k }, (_, l) => A[i][l] * B[l][j]).reduce((a, b) => a + b, 0)
    )
  )
}

function transpose(A: number[][]): number[][] {
  return A[0].map((_, j) => A.map(row => row[j]))
}

export function matrixInverse(m: number[][]): number[][] {
  const n = m.length
  const aug = m.map((row, i) =>
    [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]
  )
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) pivot = row
    }
    ;[aug[col], aug[pivot]] = [aug[pivot], aug[col]]
    const pv = aug[col][col]
    if (Math.abs(pv) < 1e-12) {
      // Matrice quasi-singulière : retourner identité comme fallback
      return Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
      )
    }
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pv
    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const f = aug[row][col]
        for (let j = 0; j < 2 * n; j++) aug[row][j] -= f * aug[col][j]
      }
    }
  }
  return aug.map(row => row.slice(n))
}

function addMat(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((v, j) => v + B[i][j]))
}

function scaleMat(A: number[][], s: number): number[][] {
  return A.map(row => row.map(v => v * s))
}

// ─── Matrice de covariance ────────────────────────────────────────────────────

export function buildCovarianceMatrix(assets: Asset[], currentRegime: EconomicRegime): number[][] {
  const n = assets.length
  const cov: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const ac_i = mapAssetClass(assets[i].name)
      const ac_j = mapAssetClass(assets[j].name)
      const si = ASSET_CLASS_PARAMS[ac_i].regimeParams[currentRegime].volatility
      const sj = ASSET_CLASS_PARAMS[ac_j].regimeParams[currentRegime].volatility
      if (i === j) {
        cov[i][j] = si * si
      } else {
        const key = [ac_i, ac_j].sort().join('-')
        const corr = ASSET_CLASS_CORRELATIONS[key] ?? ASSET_CLASS_CORRELATIONS['default']
        cov[i][j] = si * sj * corr
      }
    }
  }
  return cov
}

// ─── Black-Litterman ──────────────────────────────────────────────────────────

export function computeImpliedReturns(covMatrix: number[][], marketWeights: number[]): number[] {
  return covMatrix.map(row =>
    BL_DELTA * row.reduce((sum, cij, j) => sum + cij * (marketWeights[j] ?? 0), 0)
  )
}

/**
 * Calcule les rendements ajustés par les vues utilisateur (Black-Litterman).
 * @param assetIds liste ordonnée d'IDs pour mapper view.assetId → indice
 */
export function applyBlackLitterman(
  impliedReturns: number[],
  covMatrix: number[][],
  views?: BlackLittermanView[],
  assetIds?: string[]
): number[] {
  if (!views || views.length === 0) return impliedReturns

  const n = impliedReturns.length
  const nV = views.length

  // Matrice P : n_views × n_assets
  const P: number[][] = views.map(view => {
    const row = new Array(n).fill(0)
    const idx = assetIds ? assetIds.indexOf(view.assetId) : parseInt(view.assetId)
    if (idx >= 0 && idx < n) row[idx] = 1
    return row
  })

  // Vecteur Q
  const Q = views.map(v => v.relativeOutperformance * v.confidence / 100)

  // Ω = diag(τΣ P' P)
  const tauCov = scaleMat(covMatrix, BL_TAU)
  const PtauPt = matMul(matMul(P, tauCov), transpose(P))
  const Omega: number[][] = Array.from({ length: nV }, (_, i) =>
    Array.from({ length: nV }, (_, j) => (i === j ? PtauPt[i][j] : 0))
  )

  const tauCovInv = matrixInverse(tauCov)
  const OmegaInv = matrixInverse(Omega)
  const Pt = transpose(P)

  // A = (τΣ)⁻¹ + P'Ω⁻¹P
  const A = addMat(tauCovInv, matMul(matMul(Pt, OmegaInv), P))
  const AInv = matrixInverse(A)

  // b = (τΣ)⁻¹π + P'Ω⁻¹Q
  const piVec = impliedReturns.map(r => [r])
  const QVec = Q.map(q => [q])
  const b = matMul(tauCovInv, piVec).map((row, i) => [row[0] + (matMul(matMul(Pt, OmegaInv), QVec)[i]?.[0] ?? 0)])

  return matMul(AInv, b).map(row => row[0])
}

// ─── CVaR (Conditional Value at Risk) ────────────────────────────────────────

export function computeCVaR(
  weights: number[],
  trajectories: number[][],
  alpha: number = 0.95
): number {
  if (trajectories.length === 0) return 0

  const portfolioReturns = trajectories.map(traj => {
    if (traj.length === 0) return 0
    const first = traj[0]
    const last = traj[traj.length - 1]
    if (first <= 0) return 0
    // CAGR annualisé — évite l'explosion avec des capitaux multi-années + contributions cumulées
    const n = Math.max(1, traj.length)
    if (weights.length <= 1) return Math.pow(last / first, 1 / n) - 1
    const weighted = weights.reduce((sum, w, j) => sum + w * (traj[j] ?? last), 0)
    const total = weights.reduce((s, w) => s + w, 0)
    return total > 0 ? Math.pow(weighted / total / first, 1 / n) - 1 : Math.pow(last / first, 1 / n) - 1
  })

  const sorted = [...portfolioReturns].sort((a, b) => a - b)
  const varIdx = Math.floor(sorted.length * (1 - alpha))
  const varThreshold = sorted[Math.max(0, varIdx)] ?? 0

  const tail = sorted.filter(r => r <= varThreshold)
  if (tail.length === 0) return varThreshold
  return tail.reduce((s, r) => s + r, 0) / tail.length
}

// ─── Optimiseur de portefeuille ───────────────────────────────────────────────

const LEGAL_MAX: Partial<Record<string, number>> = {
  livret_a: 22950,
  ldds: 12000,
  livret_jeune: 1600,
  pea: 150000,
}

interface AssetEntry {
  asset: Asset
  envelope: Envelope
}

export function optimizePortfolio(
  assets: Asset[],
  envelopes: Envelope[],
  blReturns: number[],
  trajectories: number[][],
  targetReturn: number,
  taxProfile: TaxProfile,
  riskTolerance: 'prudent' | 'balanced' | 'dynamic'
): OptimizedAllocation[] {
  void assets

  const cvarTarget = { prudent: -0.10, balanced: -0.20, dynamic: -Infinity }[riskTolerance]

  const activeEnvelopes = envelopes.filter(e => e.active)
  const totalCapital = activeEnvelopes.reduce(
    (sum, e) => sum + (e.currentRealValue ?? e.initialCapital), 0
  )
  if (totalCapital <= 0) return []

  // Construction de la liste aplatie actifs × enveloppes
  const entries: AssetEntry[] = []
  for (const envelope of activeEnvelopes) {
    for (const asset of envelope.assets) {
      entries.push({ asset, envelope })
    }
  }
  if (entries.length === 0) return []

  // Poids initiaux depuis allocations courantes
  let weights = entries.map(({ asset, envelope }) => {
    const cap = envelope.currentRealValue ?? envelope.initialCapital
    return (cap / totalCapital) * (asset.allocation / 100)
  })
  const sum0 = weights.reduce((s, w) => s + w, 0)
  if (sum0 > 0) weights = weights.map(w => w / sum0)

  // Rendements nets par actif (après fiscalité)
  const netReturns = entries.map(({ asset, envelope }, idx) => {
    const gross = blReturns[idx] ?? (asset.expectedReturn / 100)
    const gain = Math.max(0, gross * totalCapital * (weights[idx] ?? 0))
    return gross * (1 - getEffectiveTaxRate(envelope, gain, taxProfile, 10, 20))
  })

  const baseCVaR = computeCVaR([1], trajectories, 0.95)

  // Poids maximum par entrée — contrainte capital absolu sur plafonds légaux.
  // Si l'enveloppe est déjà au plafond, aucun versement supplémentaire (weight = 0).
  const maxWeights = entries.map(({ envelope }) => {
    const legalCap = LEGAL_MAX[envelope.type]
    if (!legalCap) return 1
    const currentEnvCap = envelope.currentRealValue ?? envelope.initialCapital
    if (currentEnvCap >= legalCap) return 0
    return legalCap / totalCapital
  })
  // Appliquer les caps sur les poids initiaux
  weights = weights.map((w, i) => Math.min(w, maxWeights[i]))
  const sumInit = weights.reduce((s, w) => s + w, 0)
  if (sumInit > 0) weights = weights.map(w => w / sumInit)

  // Gradient descent projeté, 500 itérations
  const lr = 0.01
  for (let iter = 0; iter < 500; iter++) {
    const prev = [...weights]

    // Direction : maximiser rendement net (proxy CVaR)
    const gradients = netReturns.map(r =>
      -r * (baseCVaR < (cvarTarget ?? -Infinity) ? 0.5 : 1)
    )
    weights = weights.map((w, i) => w - lr * gradients[i])

    // Projection sur le simplexe contraint — plafonds légaux en capital absolu.
    // La normalisation peut repousser un poids au-dessus du cap : itération clip → normalise.
    weights = weights.map((w, i) => Math.min(Math.max(0, w), maxWeights[i]))
    for (let ci = 0; ci < 20; ci++) {
      const sumW = weights.reduce((s, w) => s + w, 0)
      if (sumW <= 0) break
      weights = weights.map(w => w / sumW)
      let stable = true
      weights = weights.map((w, i) => {
        if (w > maxWeights[i] + 1e-9) { stable = false; return maxWeights[i] }
        return w
      })
      if (stable) break
    }
    const sumW = weights.reduce((s, w) => s + w, 0)
    if (sumW > 0) weights = weights.map(w => w / sumW)

    // Forcer le rendement cible (contrainte minimum, pas objectif)
    const expRet = weights.reduce((s, w, i) => s + w * netReturns[i], 0)
    if (expRet < targetReturn / 100) {
      const best = netReturns.reduce((mi, r, i) => r > netReturns[mi] ? i : mi, 0)
      weights[best] = Math.min(maxWeights[best], (weights[best] ?? 0) + 0.01)
      const s = weights.reduce((a, w) => a + w, 0)
      if (s > 0) weights = weights.map(w => w / s)
    }

    // Contrainte CVaR prudent/balanced : réduire les positions risquées
    if (cvarTarget !== -Infinity && baseCVaR < cvarTarget) {
      const safest = netReturns.reduce((mi, r, i) => r < netReturns[mi] ? i : mi, 0)
      weights[safest] = Math.min(maxWeights[safest], (weights[safest] ?? 0) + 0.01)
      const s = weights.reduce((a, w) => a + w, 0)
      if (s > 0) weights = weights.map(w => w / s)
    }

    // Convergence
    const maxDelta = weights.reduce((mx, w, i) => Math.max(mx, Math.abs(w - (prev[i] ?? 0))), 0)
    if (maxDelta < 1e-6) break
  }

  return entries.map(({ asset, envelope }, idx) => {
    const ac: AssetClass = mapAssetClass(asset.name)
    const gross = blReturns[idx] ?? (asset.expectedReturn / 100)
    const cap = envelope.currentRealValue ?? envelope.initialCapital
    const currentWeight = (cap / totalCapital) * (asset.allocation / 100)
    const gain = Math.max(0, gross * totalCapital * (weights[idx] ?? 0))
    const taxRate = getEffectiveTaxRate(envelope, gain, taxProfile, 10, 20)
    const sigma = ASSET_CLASS_PARAMS[ac].regimeParams['expansion'].volatility

    return {
      envelopeId: envelope.id,
      assetId: asset.id,
      currentWeight: sum0 > 0 ? currentWeight / sum0 : currentWeight,
      optimizedWeight: weights[idx] ?? 0,
      assetClass: ac,
      expectedNetReturn: gross * (1 - taxRate),
      contributionToCVaR: -(weights[idx] ?? 0) * sigma,
    }
  })
}

// ─── Optimiseur de localisation fiscale ──────────────────────────────────────

export function assetLocationOptimizer(
  _assets: Asset[],
  envelopes: Envelope[],
  _optimizedWeights: number[],
  taxProfile: TaxProfile,
  duration: number = 20
): LocationSuggestion[] {
  const activeEnvelopes = envelopes.filter(e => e.active)
  const suggestions: LocationSuggestion[] = []

  const peaEnv = activeEnvelopes.find(e => e.type === 'pea')
  const avEnv = activeEnvelopes.find(e => e.type === 'assurance_vie')
  const perEnv = activeEnvelopes.find(e => e.type === 'per')

  for (const envelope of activeEnvelopes) {
    for (const asset of envelope.assets) {
      const ac = mapAssetClass(asset.name)
      const dividendRate = envelope.dividendRate ?? 0

      if (ac === 'regulated') continue

      let suggestedEnvelopeId: string | null = null
      let reason = ''

      if (ac === 'equity' && dividendRate > 3 && envelope.type !== 'pea') {
        if (peaEnv) {
          suggestedEnvelopeId = peaEnv.id
          reason = "Dividendes exonérés d'IR dans le PEA"
        }
      } else if (ac === 'crypto' && envelope.type !== 'pea' && envelope.type !== 'assurance_vie') {
        if (peaEnv) {
          suggestedEnvelopeId = peaEnv.id
          reason = "Dividendes exonérés d'IR dans le PEA"
        } else if (avEnv) {
          suggestedEnvelopeId = avEnv.id
          reason = 'Fiscalité réduite en assurance-vie après 8 ans'
        }
      } else if (ac === 'bonds' && envelope.type === 'cto') {
        if (avEnv) {
          suggestedEnvelopeId = avEnv.id
          reason = "Revenus obligataires mieux traités en AV/PER qu'en CTO (flat tax évitée)"
        } else if (perEnv) {
          suggestedEnvelopeId = perEnv.id
          reason = "Revenus obligataires mieux traités en AV/PER qu'en CTO (flat tax évitée)"
        }
      }

      if (!suggestedEnvelopeId) continue

      const envCap = envelope.currentRealValue ?? envelope.initialCapital
      const estimatedGain = (asset.expectedReturn / 100) * envCap * duration * (asset.allocation / 100)
      if (estimatedGain <= 0) continue

      const suggestedEnv = activeEnvelopes.find(e => e.id === suggestedEnvelopeId)
      if (!suggestedEnv) continue

      const currentRate = getEffectiveTaxRate(envelope, estimatedGain, taxProfile, 0, duration)
      const suggestedRate = getEffectiveTaxRate(suggestedEnv, estimatedGain, taxProfile, 0, duration)
      const saving = (currentRate - suggestedRate) * estimatedGain

      if (saving < 100) continue

      suggestions.push({
        assetId: asset.id,
        assetName: asset.name,
        currentEnvelopeId: envelope.id,
        suggestedEnvelopeId,
        taxSavingEstimate: saving,
        reason,
      })
    }
  }

  return suggestions.sort((a, b) => b.taxSavingEstimate - a.taxSavingEstimate)
}

// ─── Helper : poids marché pour un portefeuille ───────────────────────────────

export function buildMarketWeightsForAssets(assets: Asset[]): number[] {
  return assets.map(a => {
    const ac = mapAssetClass(a.name)
    return MARKET_CAP_WEIGHTS[ac]
  })
}
