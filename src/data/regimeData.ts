import type { EconomicRegime, AssetClass, AssetClassParams } from '../types'

// ─── Matrice de transition de Markov (calibrée US/EU 1970-2024) ───────────────

export const TRANSITION_MATRIX: Record<EconomicRegime, Record<EconomicRegime, number>> = {
  expansion: {
    expansion: 0.65,
    overheat:  0.20,
    recession: 0.10,
    crisis:    0.05,
  },
  overheat: {
    expansion: 0.30,
    overheat:  0.40,
    recession: 0.20,
    crisis:    0.10,
  },
  recession: {
    expansion: 0.40,
    overheat:  0.10,
    recession: 0.40,
    crisis:    0.10,
  },
  crisis: {
    expansion: 0.50,
    overheat:  0.05,
    recession: 0.30,
    crisis:    0.15,
  },
}

// Assertion : chaque ligne doit sommer à 1.0
const REGIMES: EconomicRegime[] = ['expansion', 'overheat', 'recession', 'crisis']
for (const regime of REGIMES) {
  const row = TRANSITION_MATRIX[regime]
  const sum = Object.values(row).reduce((a, b) => a + b, 0)
  console.log(`TRANSITION_MATRIX[${regime}] sum = ${sum.toFixed(4)}`)
  if (Math.abs(sum - 1.0) > 1e-9) {
    throw new Error(`TRANSITION_MATRIX[${regime}] rows must sum to 1.0, got ${sum}`)
  }
}

// ─── Paramètres par classe d'actif ───────────────────────────────────────────

export const ASSET_CLASS_PARAMS: Record<AssetClass, AssetClassParams> = {
  equity: {
    assetClass: 'equity',
    historicalMeanReturn: 0.085,
    regimeParams: {
      expansion:  { meanReturn:  0.10, volatility: 0.12 },
      overheat:   { meanReturn:  0.14, volatility: 0.16 },
      recession:  { meanReturn: -0.08, volatility: 0.20 },
      crisis:     { meanReturn: -0.25, volatility: 0.35 },
    },
  },
  bonds: {
    assetClass: 'bonds',
    historicalMeanReturn: 0.04,
    regimeParams: {
      expansion:  { meanReturn: 0.04, volatility: 0.05 },
      overheat:   { meanReturn: 0.01, volatility: 0.07 },
      recession:  { meanReturn: 0.08, volatility: 0.06 },
      crisis:     { meanReturn: 0.05, volatility: 0.10 },
    },
  },
  real_estate: {
    assetClass: 'real_estate',
    historicalMeanReturn: 0.06,
    regimeParams: {
      expansion:  { meanReturn:  0.07, volatility: 0.08 },
      overheat:   { meanReturn:  0.09, volatility: 0.10 },
      recession:  { meanReturn: -0.03, volatility: 0.12 },
      crisis:     { meanReturn: -0.15, volatility: 0.20 },
    },
  },
  money_market: {
    assetClass: 'money_market',
    historicalMeanReturn: 0.025,
    regimeParams: {
      expansion:  { meanReturn: 0.03, volatility: 0.01 },
      overheat:   { meanReturn: 0.05, volatility: 0.01 },
      recession:  { meanReturn: 0.02, volatility: 0.01 },
      crisis:     { meanReturn: 0.02, volatility: 0.02 },
    },
  },
  crypto: {
    assetClass: 'crypto',
    historicalMeanReturn: 0.30,
    regimeParams: {
      expansion:  { meanReturn:  0.40, volatility: 0.60 },
      overheat:   { meanReturn:  0.50, volatility: 0.70 },
      recession:  { meanReturn: -0.40, volatility: 0.80 },
      crisis:     { meanReturn: -0.70, volatility: 0.90 },
    },
  },
  regulated: {
    assetClass: 'regulated',
    historicalMeanReturn: 0.03,
    regimeParams: {
      expansion:  { meanReturn: 0.03, volatility: 0 },
      overheat:   { meanReturn: 0.03, volatility: 0 },
      recession:  { meanReturn: 0.03, volatility: 0 },
      crisis:     { meanReturn: 0.03, volatility: 0 },
    },
  },
}

// ─── Corrélations entre classes d'actifs ─────────────────────────────────────

export const ASSET_CLASS_CORRELATIONS: Record<string, number> = {
  'equity-bonds':              -0.20,
  'equity-real_estate':         0.40,
  'equity-crypto':              0.15,
  'equity-money_market':        0.05,
  'bonds-real_estate':          0.10,
  'bonds-crypto':               0.05,
  'bonds-money_market':         0.10,
  'real_estate-crypto':         0.05,
  'default':                    0.05,
}

// ─── Poids de capitalisation du marché mondial ───────────────────────────────
// Référence documentaire : cités par la page Modèles & Formules (section Black-Litterman).
// Plus consommés par le code depuis que l'optimiseur utilise expectedReturn comme prior.

export const MARKET_CAP_WEIGHTS: Record<AssetClass, number> = {
  equity:       0.45,
  bonds:        0.25,
  real_estate:  0.15,
  money_market: 0.10,
  crypto:       0.05,
  regulated:    0.00,
}

// ─── Constantes Black-Litterman et Monte-Carlo ───────────────────────────────

// BL_DELTA : référence documentaire (page Modèles) — voir note MARKET_CAP_WEIGHTS ci-dessus
export const BL_DELTA = 2.5
export const BL_TAU = 0.05
export const MONTE_CARLO_N = 1000
export const LAMBDA_DECAY = 0.15

// ─── Mapping nom d'actif → classe d'actif ────────────────────────────────────

export function mapAssetClass(assetName: string): AssetClass {
  const n = assetName.toLowerCase()
  if (n.includes('bitcoin') || n.includes('ethereum') || n.includes('crypto')) return 'crypto'
  if (n.includes('livret') || n.includes('ldds') || n.includes('lep')) return 'regulated'
  if (n.includes('obligation') || n.includes('bond') || n.includes('oblig')) return 'bonds'
  if (n.includes('scpi') || n.includes('immobilier') || n.includes('pierre')) return 'real_estate'
  if (n.includes('monetaire') || n.includes('fonds euros') || n.includes('euro')) return 'money_market'
  return 'equity'
}
