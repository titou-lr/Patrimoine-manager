import type { Candle } from '../../finance/types/finance'
import type { MACDResult, BollingerResult } from '../../finance/services/indicatorsService'

// Petits utilitaires "détecteurs de motifs" — purement géométriques, zéro état,
// utilisés pour placer les annotations sur les graphiques pédagogiques sans
// dépendre d'indices codés en dur (robuste si les données sont régénérées).

export function findLevelTouches(
  candles: Candle[],
  level: number,
  tolerance: number,
  minGapBars = 4
): number[] {
  const touches: number[] = []
  let lastTouch = -minGapBars
  candles.forEach((c, i) => {
    const dist = Math.abs(c.low - level)
    if (dist <= tolerance && i - lastTouch >= minGapBars) {
      touches.push(i)
      lastTouch = i
    }
  })
  return touches
}

// Sommets locaux (fenêtre de comparaison de part et d'autre)
export function findLocalPeaks(closes: number[], window = 5): number[] {
  const peaks: number[] = []
  for (let i = window; i < closes.length - window; i++) {
    const slice = closes.slice(i - window, i + window + 1)
    if (closes[i] === Math.max(...slice)) peaks.push(i)
  }
  // Dédupliquer les pics trop proches en gardant le plus haut
  const dedup: number[] = []
  for (const p of peaks) {
    const prev = dedup[dedup.length - 1]
    if (prev !== undefined && p - prev < window) {
      if (closes[p] > closes[prev]) dedup[dedup.length - 1] = p
    } else dedup.push(p)
  }
  return dedup
}

export interface DivergenceResult {
  peak1: number
  peak2: number
}

// Cherche deux sommets consécutifs où le prix fait un plus haut mais le RSI
// fait un plus bas — divergence baissière classique.
export function findBearishDivergence(
  closes: number[],
  rsiVals: (number | null)[]
): DivergenceResult | null {
  const peaks = findLocalPeaks(closes, 4)
  for (let k = 0; k < peaks.length - 1; k++) {
    const p1 = peaks[k], p2 = peaks[k + 1]
    const r1 = rsiVals[p1], r2 = rsiVals[p2]
    if (r1 == null || r2 == null) continue
    if (closes[p2] > closes[p1] && r2 < r1 - 3) {
      return { peak1: p1, peak2: p2 }
    }
  }
  return null
}

export interface CrossoverEvent {
  index: number
  type: 'bullish' | 'bearish'
}

export function findMacdCrossovers(macd: MACDResult): CrossoverEvent[] {
  const events: CrossoverEvent[] = []
  for (let i = 1; i < macd.macd.length; i++) {
    const prevM = macd.macd[i - 1], prevS = macd.signal[i - 1]
    const m = macd.macd[i], s = macd.signal[i]
    if (prevM == null || prevS == null || m == null || s == null) continue
    if (prevM <= prevS && m > s) events.push({ index: i, type: 'bullish' })
    else if (prevM >= prevS && m < s) events.push({ index: i, type: 'bearish' })
  }
  return events
}

export interface SqueezeResult {
  start: number
  end: number
  expansionIndex: number
}

// Repère la zone où la largeur des bandes de Bollinger (relative au prix) est
// la plus faible sur une fenêtre glissante, puis le point où elle se remet à
// s'élargir nettement (l'expansion).
export function findBollingerSqueeze(boll: BollingerResult, closes: number[]): SqueezeResult | null {
  const widths = closes.map((c, i) => {
    const u = boll.upper[i], l = boll.lower[i]
    if (u == null || l == null || c === 0) return null
    return (u - l) / c
  })
  const valid = widths.filter((w): w is number => w != null)
  if (valid.length < 20) return null
  const sorted = [...valid].sort((a, b) => a - b)
  const threshold = sorted[Math.floor(sorted.length * 0.15)]

  let start = -1, end = -1
  for (let i = 0; i < widths.length; i++) {
    if (widths[i] != null && widths[i]! <= threshold) {
      if (start === -1) start = i
      end = i
    } else if (start !== -1 && i - end > 6) {
      break
    }
  }
  if (start === -1) return null

  let expansionIndex = end
  for (let i = end; i < widths.length; i++) {
    if (widths[i] != null && widths[i]! > threshold * 2.2) { expansionIndex = i; break }
  }
  return { start, end, expansionIndex }
}
