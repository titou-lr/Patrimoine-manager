/**
 * Moteur Markov + Monte-Carlo — fonctions pures, zéro import React.
 */

import type { EconomicRegime, Envelope, GlobalParams, MonteCarloResult } from '../types'
import {
  TRANSITION_MATRIX,
  ASSET_CLASS_PARAMS,
  MONTE_CARLO_N,
  LAMBDA_DECAY,
  mapAssetClass,
} from '../data/regimeData'
import { getEffectiveTaxRate } from './portfolioOptimizer'

// ─── Déterministic RNG (mulberry32) ─────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Ordre canonique des régimes ─────────────────────────────────────────────

const REGIME_ORDER: EconomicRegime[] = ['expansion', 'overheat', 'recession', 'crisis']

// ─── Fonctions Markov exportées ──────────────────────────────────────────────

export function sampleNextRegime(
  currentRegime: EconomicRegime,
  rng: () => number
): EconomicRegime {
  const row = TRANSITION_MATRIX[currentRegime]
  const u = rng()
  let cumulative = 0
  for (const regime of REGIME_ORDER) {
    cumulative += row[regime]
    if (u < cumulative) return regime
  }
  return REGIME_ORDER[REGIME_ORDER.length - 1]
}

export function sampleNormal(mean: number, std: number, rng: () => number): number {
  if (std === 0) return mean
  // Box-Muller transform
  const u1 = Math.max(rng(), 1e-10)
  const u2 = rng()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + std * z
}

// ─── Distribution stationnaire (power iteration) ────────────────────────────

function computeStationaryDistribution(): Record<EconomicRegime, number> {
  let pi: Record<EconomicRegime, number> = {
    expansion: 0.25, overheat: 0.25, recession: 0.25, crisis: 0.25,
  }
  for (let iter = 0; iter < 2000; iter++) {
    const next: Record<EconomicRegime, number> = {
      expansion: 0, overheat: 0, recession: 0, crisis: 0,
    }
    for (const j of REGIME_ORDER) {
      for (const i of REGIME_ORDER) {
        next[j] += pi[i] * TRANSITION_MATRIX[i][j]
      }
    }
    pi = next
  }
  return pi
}

const STATIONARY = computeStationaryDistribution()

export function computeTransitionYear(duration: number): number {
  const pi = STATIONARY

  // Moyenne globale (equity comme référence)
  const muGlobal = REGIME_ORDER.reduce(
    (sum, r) => sum + pi[r] * ASSET_CLASS_PARAMS.equity.regimeParams[r].meanReturn,
    0
  )

  // Variance totale (inter + intra)
  const varianceInter = REGIME_ORDER.reduce((sum, r) => {
    const mu_r = ASSET_CLASS_PARAMS.equity.regimeParams[r].meanReturn
    return sum + pi[r] * Math.pow(mu_r - muGlobal, 2)
  }, 0)
  const varianceIntra = REGIME_ORDER.reduce((sum, r) => {
    const s = ASSET_CLASS_PARAMS.equity.regimeParams[r].volatility
    return sum + pi[r] * s * s
  }, 0)
  const varianceTotale = varianceInter + varianceIntra
  const threshold = 0.20 * varianceTotale

  // Distribut à t=0 : worst-case depuis expansion
  let dist: Record<EconomicRegime, number> = {
    expansion: 1, overheat: 0, recession: 0, crisis: 0,
  }

  for (let t = 1; t <= Math.min(duration, 20); t++) {
    const next: Record<EconomicRegime, number> = {
      expansion: 0, overheat: 0, recession: 0, crisis: 0,
    }
    for (const j of REGIME_ORDER) {
      for (const i of REGIME_ORDER) next[j] += dist[i] * TRANSITION_MATRIX[i][j]
    }
    dist = next

    const muT = REGIME_ORDER.reduce(
      (s, r) => s + dist[r] * ASSET_CLASS_PARAMS.equity.regimeParams[r].meanReturn,
      0
    )
    const varInterT = REGIME_ORDER.reduce((s, r) => {
      const mu_r = ASSET_CLASS_PARAMS.equity.regimeParams[r].meanReturn
      return s + dist[r] * Math.pow(mu_r - muT, 2)
    }, 0)

    if (varInterT < threshold) return Math.max(5, Math.min(t, 15))
  }
  return 10
}

export function computeMarkovWeight(year: number, transitionYear: number): number {
  return Math.exp(-LAMBDA_DECAY * Math.max(0, year - transitionYear))
}

// ─── Trajectoire unique (interne, avec régimes) ──────────────────────────────

interface TrajectoryFull {
  capitals: number[]
  regimes: EconomicRegime[]
}

function runTrajectoryFull(
  envelopes: Envelope[],
  globalParams: GlobalParams,
  duration: number,
  transitionYear: number,
  seed: number
): TrajectoryFull {
  const rng = mulberry32(seed)
  const activeEnvelopes = envelopes.filter(e => e.active)
  const tmi = globalParams.tmi ?? 30
  const isCouple = globalParams.isCouple ?? false
  const taxProfile = { tmi, isCouple, avAbattement: isCouple ? 9200 : 4600 }

  const capitals = activeEnvelopes.map(e =>
    (e.currentRealValue != null && e.currentRealValue > 0) ? e.currentRealValue : e.initialCapital
  )
  const initialCapitals = [...capitals]
  const cumulativeContrib = new Array(activeEnvelopes.length).fill(0)

  // Régime initial
  let currentRegime: EconomicRegime
  if (globalParams.initialRegime) {
    currentRegime = globalParams.initialRegime
  } else {
    const probs = [STATIONARY.expansion, STATIONARY.overheat, STATIONARY.recession, STATIONARY.crisis]
    const u = rng()
    let cum = 0
    currentRegime = 'expansion'
    for (let i = 0; i < REGIME_ORDER.length; i++) {
      cum += probs[i]
      if (u < cum) { currentRegime = REGIME_ORDER[i]; break }
    }
  }

  const capitalsByYear: number[] = []
  const regimesByYear: EconomicRegime[] = []

  for (let year = 1; year <= duration; year++) {
    currentRegime = sampleNextRegime(currentRegime, rng)
    regimesByYear.push(currentRegime)
    const w = computeMarkovWeight(year, transitionYear)
    let totalCapital = 0

    for (let ei = 0; ei < activeEnvelopes.length; ei++) {
      const envelope = activeEnvelopes[ei]
      const monthlyContrib = envelope.monthlyContribution
      const yearlyAdded = monthlyContrib * 12

      cumulativeContrib[ei] += yearlyAdded
      capitals[ei] += yearlyAdded

      // Rendement composite pondéré par allocation d'actifs
      let envelopeReturn = 0
      const assets = envelope.assets

      if (assets.length > 0) {
        for (const asset of assets) {
          const ac = mapAssetClass(asset.name)
          const rp = ASSET_CLASS_PARAMS[ac].regimeParams[currentRegime]
          const rMarkov = sampleNormal(rp.meanReturn, rp.volatility, rng)
          const rFinal = w * rMarkov + (1 - w) * ASSET_CLASS_PARAMS[ac].historicalMeanReturn
          envelopeReturn += rFinal * (asset.allocation / 100)
        }
      } else {
        const ac = mapAssetClass(envelope.label)
        const rp = ASSET_CLASS_PARAMS[ac].regimeParams[currentRegime]
        const rMarkov = sampleNormal(rp.meanReturn, rp.volatility, rng)
        envelopeReturn = w * rMarkov + (1 - w) * ASSET_CLASS_PARAMS[ac].historicalMeanReturn
      }

      capitals[ei] = Math.max(0, capitals[ei] * (1 + envelopeReturn))

      // Fiscalité si gains > 0
      const contributed = initialCapitals[ei] + cumulativeContrib[ei]
      const gain = capitals[ei] - contributed
      if (gain > 0 && envelopeReturn > 0) {
        const taxRate = getEffectiveTaxRate(envelope, gain, taxProfile, year, duration)
        // Approximation : impôt sur la fraction du gain de cette année
        const yearlyGain = capitals[ei] - capitals[ei] / (1 + envelopeReturn)
        capitals[ei] -= yearlyGain * taxRate
      }

      totalCapital += Math.max(0, capitals[ei])
    }

    capitalsByYear.push(totalCapital)
  }

  return { capitals: capitalsByYear, regimes: regimesByYear }
}

export function runSingleTrajectory(
  envelopes: Envelope[],
  globalParams: GlobalParams,
  duration: number,
  transitionYear: number,
  seed: number
): number[] {
  return runTrajectoryFull(envelopes, globalParams, duration, transitionYear, seed).capitals
}

// ─── Monte-Carlo ──────────────────────────────────────────────────────────────

export interface MonteCarloOutput {
  results: MonteCarloResult[]
  rawTrajectories: number[][] // N × duration — capitaux totaux
}

export function runMonteCarlo(
  envelopes: Envelope[],
  globalParams: GlobalParams,
  duration: number,
  n: number = MONTE_CARLO_N,
  onProgress?: (percent: number) => void
): Promise<MonteCarloOutput> {
  return new Promise((resolve) => {
    const transitionYear = computeTransitionYear(duration)
    const trajData: TrajectoryFull[] = new Array(n)
    const CHUNK_SIZE = 50
    let i = 0

    function processChunk() {
      const end = Math.min(i + CHUNK_SIZE, n)
      for (; i < end; i++) {
        trajData[i] = runTrajectoryFull(envelopes, globalParams, duration, transitionYear, i)
      }
      onProgress?.(Math.round((i / n) * 100))

      if (i < n) {
        setTimeout(processChunk, 0)
      } else {
        const results: MonteCarloResult[] = []

        for (let t = 0; t < duration; t++) {
          const caps = trajData.map(td => td.capitals[t] ?? 0).sort((a, b) => a - b)

          const p10 = caps[Math.floor(n * 0.10)] ?? 0
          const p50 = caps[Math.floor(n * 0.50)] ?? 0
          const p90 = caps[Math.floor(n * 0.90)] ?? 0

          // Distribution des régimes à l'année t
          const counts: Record<EconomicRegime, number> = {
            expansion: 0, overheat: 0, recession: 0, crisis: 0,
          }
          for (const td of trajData) {
            const r = td.regimes[t]
            if (r) counts[r]++
          }
          const regimeDistribution: Record<EconomicRegime, number> = {
            expansion: counts.expansion / n,
            overheat: counts.overheat / n,
            recession: counts.recession / n,
            crisis: counts.crisis / n,
          }

          results.push({ year: t + 1, p10, p50, p90, regimeDistribution })
        }

        resolve({ results, rawTrajectories: trajData.map(td => td.capitals) })
      }
    }

    processChunk()
  })
}
