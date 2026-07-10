import type { Candle } from '../types/finance'
import { ema } from '../services/indicatorsService'

export interface PredictionPoint {
  time: number      // ms epoch
  value: number
  lower?: number    // intervalle de confiance bas
  upper?: number    // intervalle de confiance haut
}

export interface FibLevel {
  label: string                       // ex. "61.8 %"
  ratio: number                       // 0.618
  price: number
  kind: 'retracement' | 'extension'
}

export interface PredictionResult {
  model: 'linear' | 'ema' | 'montecarlo' | 'fibonacci'
  label: string
  points: PredictionPoint[]
  confidence: number  // 0-1, fiabilité estimée du modèle
  levels?: FibLevel[] // Fibonacci : niveaux support/résistance projetés
  swing?: { high: number; low: number; direction: 'up' | 'down'; lookback: number }
}

const HORIZON_DAYS = 30

// ---- Modèle 1 : Régression linéaire ----

export function linearPrediction(candles: Candle[], horizonDays = HORIZON_DAYS): PredictionResult {
  const n = Math.min(candles.length, 90)
  const recent = candles.slice(-n)
  const closes = recent.map(c => c.close)
  const xs = closes.map((_, i) => i)
  const meanX = (n - 1) / 2
  const meanY = closes.reduce((a, b) => a + b, 0) / n
  const ssxx = xs.reduce((a, x) => a + (x - meanX) ** 2, 0)
  const ssxy = xs.reduce((a, x, i) => a + (x - meanX) * (closes[i] - meanY), 0)
  const slope = ssxx === 0 ? 0 : ssxy / ssxx
  const intercept = meanY - slope * meanX

  const residuals = closes.map((y, i) => y - (intercept + slope * i))
  const stdResid = Math.sqrt(residuals.reduce((a, r) => a + r ** 2, 0) / n)

  const lastTime = recent[recent.length - 1].time
  const dayMs = 24 * 3600 * 1000
  const points: PredictionPoint[] = []

  for (let d = 1; d <= horizonDays; d++) {
    const x = n - 1 + d
    const value = intercept + slope * x
    const uncertainty = stdResid * Math.sqrt(1 + d / n)
    points.push({
      time: lastTime + d * dayMs,
      value: Math.max(0, value),
      lower: Math.max(0, value - 1.96 * uncertainty),
      upper: value + 1.96 * uncertainty,
    })
  }

  return { model: 'linear', label: 'Régression linéaire', points, confidence: 0.55 }
}

// ---- Modèle 2 : Projection EMA ----

export function emaPrediction(candles: Candle[], horizonDays = HORIZON_DAYS): PredictionResult {
  const closes = candles.map(c => c.close)
  const ema20 = ema(closes, 20)
  const ema50 = ema(closes, 50)

  const validEma20 = ema20.filter((v): v is number => v != null)
  const lastEma20 = validEma20[validEma20.length - 1] ?? closes[closes.length - 1]
  const prevEma20 = validEma20.length >= 6 ? validEma20[validEma20.length - 6] : lastEma20
  const slope = (lastEma20 - prevEma20) / 5

  const validEma50 = ema50.filter((v): v is number => v != null)
  const lastEma50 = validEma50[validEma50.length - 1] ?? lastEma20
  const momentumFactor = lastEma50 > 0 ? (lastEma20 - lastEma50) / lastEma50 : 0

  const lastTime = candles[candles.length - 1].time
  const dayMs = 24 * 3600 * 1000
  const volatility = computeVolatility(closes.slice(-30))

  const points: PredictionPoint[] = []
  let current = lastEma20
  for (let d = 1; d <= horizonDays; d++) {
    current += slope * (1 + momentumFactor * 0.1)
    const uncertainty = volatility * current * Math.sqrt(d / 252)
    points.push({
      time: lastTime + d * dayMs,
      value: Math.max(0, current),
      lower: Math.max(0, current - uncertainty),
      upper: current + uncertainty,
    })
  }

  return { model: 'ema', label: 'Projection EMA', points, confidence: 0.5 }
}

// ---- Modèle 3 : Monte-Carlo (GBM) ----

export function monteCarloPrediction(candles: Candle[], horizonDays = HORIZON_DAYS, n = 200): PredictionResult {
  const closes = candles.map(c => c.close)
  const lastClose = closes[closes.length - 1]
  const lastTime = candles[candles.length - 1].time
  const dayMs = 24 * 3600 * 1000

  const logReturns: number[] = []
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > 0 && closes[i - 1] > 0) {
      logReturns.push(Math.log(closes[i] / closes[i - 1]))
    }
  }

  const mu = logReturns.length > 0 ? logReturns.reduce((a, b) => a + b, 0) / logReturns.length : 0
  const sigma = logReturns.length > 1
    ? Math.sqrt(logReturns.reduce((a, r) => a + (r - mu) ** 2, 0) / logReturns.length)
    : 0.01

  const trajectories: number[][] = []
  for (let t = 0; t < n; t++) {
    const path = [lastClose]
    for (let d = 1; d <= horizonDays; d++) {
      const z = boxMuller()
      const next = path[d - 1] * Math.exp((mu - 0.5 * sigma ** 2) + sigma * z)
      path.push(Math.max(0, next))
    }
    trajectories.push(path.slice(1))
  }

  const points: PredictionPoint[] = []
  for (let d = 0; d < horizonDays; d++) {
    const dayValues = trajectories.map(t => t[d]).sort((a, b) => a - b)
    const p10 = dayValues[Math.floor(n * 0.1)]
    const p50 = dayValues[Math.floor(n * 0.5)]
    const p90 = dayValues[Math.floor(n * 0.9)]
    points.push({
      time: lastTime + (d + 1) * dayMs,
      value: p50,
      lower: p10,
      upper: p90,
    })
  }

  return { model: 'montecarlo', label: 'Monte-Carlo (P10/P50/P90)', points, confidence: 0.45 }
}

// ---- Modèle 4 : Niveaux de Fibonacci ----

const FIB_RETRACEMENTS = [0.236, 0.382, 0.5, 0.618, 0.786]
const FIB_EXTENSIONS = [1, 1.272, 1.618, 2.618]

/**
 * Identifie le dernier swing haut/bas (plus haut high / plus bas low sur les
 * `lookback` dernières bougies) puis projette retracements et extensions
 * comme niveaux de support/résistance sur l'horizon J+30.
 *
 * Convention (swing haussier, low avant high) :
 *   retracement r → high − (high − low) × r
 *   extension   r → low + (high − low) × r   (100 % = high)
 * Swing baissier : symétrique.
 */
export function fibonacciPrediction(
  candles: Candle[],
  horizonDays = HORIZON_DAYS,
  lookback = 90
): PredictionResult {
  const recent = candles.slice(-Math.min(lookback, candles.length))
  let hiIdx = 0, loIdx = 0
  recent.forEach((c, i) => {
    if (c.high > recent[hiIdx].high) hiIdx = i
    if (c.low < recent[loIdx].low) loIdx = i
  })
  const high = recent[hiIdx].high
  const low = recent[loIdx].low
  const range = Math.max(high - low, 1e-9)
  const direction: 'up' | 'down' = loIdx <= hiIdx ? 'up' : 'down'

  const levels: FibLevel[] = [
    ...FIB_RETRACEMENTS.map(r => ({
      label: `${(r * 100).toFixed(1)} %`,
      ratio: r,
      price: direction === 'up' ? high - range * r : low + range * r,
      kind: 'retracement' as const,
    })),
    ...FIB_EXTENSIONS.map(r => ({
      label: `${(r * 100).toFixed(1)} %`,
      ratio: r,
      price: direction === 'up' ? low + range * r : high - range * r,
      kind: 'extension' as const,
    })),
  ]

  // Points plats au dernier cours : étendent l'axe temporel à J+30 pour que
  // les niveaux horizontaux se lisent comme une projection.
  const lastClose = candles[candles.length - 1].close
  const lastTime = candles[candles.length - 1].time
  const dayMs = 24 * 3600 * 1000
  const points: PredictionPoint[] = []
  for (let d = 1; d <= horizonDays; d++) {
    points.push({ time: lastTime + d * dayMs, value: lastClose })
  }

  return {
    model: 'fibonacci',
    label: `Fibonacci (swing ${lookback} bougies)`,
    points,
    confidence: 0.4,
    levels,
    swing: { high, low, direction, lookback },
  }
}

// ---- Helpers ----

function boxMuller(): number {
  const u1 = Math.random(), u2 = Math.random()
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2)
}

function computeVolatility(closes: number[]): number {
  if (closes.length < 2) return 0.2
  const returns = closes.slice(1).map((c, i) => {
    if (closes[i] <= 0) return 0
    return Math.log(c / closes[i])
  })
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  return Math.sqrt(returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length) * Math.sqrt(252)
}
