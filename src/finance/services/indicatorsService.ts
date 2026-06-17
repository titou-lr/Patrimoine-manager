import type { Candle } from '../types/finance'

// ---- Moyennes mobiles ----

export function sma(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null
    const slice = closes.slice(i - period + 1, i + 1)
    return slice.reduce((a, b) => a + b, 0) / period
  })
}

export function ema(closes: number[], period: number): (number | null)[] {
  if (closes.length < period) return new Array(closes.length).fill(null)
  const k = 2 / (period + 1)
  const result: (number | null)[] = new Array(period - 1).fill(null)
  const initial = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
  result.push(initial)
  for (let i = period; i < closes.length; i++) {
    result.push(closes[i] * k + result[result.length - 1]! * (1 - k))
  }
  return result
}

// ---- RSI ----

export function rsi(closes: number[], period = 14): (number | null)[] {
  if (closes.length <= period) return new Array(closes.length).fill(null)
  const result: (number | null)[] = new Array(period).fill(null)
  let avgGain = 0, avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) avgGain += diff; else avgLoss += Math.abs(diff)
  }
  avgGain /= period; avgLoss /= period
  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss))
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss))
  }
  return result
}

// ---- MACD ----

export interface MACDResult {
  macd: (number | null)[]
  signal: (number | null)[]
  histogram: (number | null)[]
}

export function macd(
  closes: number[],
  fast = 12, slow = 26, signal = 9
): MACDResult {
  const emaFast = ema(closes, fast)
  const emaSlow = ema(closes, slow)
  const macdLine = closes.map((_, i) => {
    const f = emaFast[i], s = emaSlow[i]
    return f != null && s != null ? f - s : null
  })
  const validMacd = macdLine.filter((v): v is number => v != null)
  const rawSignal = ema(validMacd, signal)
  // Réaligner signal sur la longueur de closes
  const signalAligned: (number | null)[] = new Array(closes.length).fill(null)
  let si = 0
  for (let i = 0; i < closes.length; i++) {
    if (macdLine[i] != null) {
      signalAligned[i] = rawSignal[si++] ?? null
    }
  }
  const histogram = closes.map((_, i) => {
    const m = macdLine[i], s2 = signalAligned[i]
    return m != null && s2 != null ? m - s2 : null
  })
  return { macd: macdLine, signal: signalAligned, histogram }
}

// ---- Bandes de Bollinger ----

export interface BollingerResult {
  upper: (number | null)[]
  middle: (number | null)[]
  lower: (number | null)[]
}

export function bollinger(closes: number[], period = 20, multiplier = 2): BollingerResult {
  const middle = sma(closes, period)
  const upper: (number | null)[] = []
  const lower: (number | null)[] = []
  closes.forEach((_, i) => {
    if (i < period - 1) { upper.push(null); lower.push(null); return }
    const slice = closes.slice(i - period + 1, i + 1)
    const mean = middle[i]!
    const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period)
    upper.push(mean + multiplier * std)
    lower.push(mean - multiplier * std)
  })
  return { upper, middle, lower }
}

// ---- ATR (Average True Range) ----

export function atr(candles: Candle[], period = 14): (number | null)[] {
  if (candles.length === 0) return []
  const trs = candles.map((c, i) => {
    if (i === 0) return c.high - c.low
    const prevClose = candles[i - 1].close
    return Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose))
  })
  const result: (number | null)[] = new Array(period).fill(null)
  if (trs.length <= period) return result
  let avg = trs.slice(1, period + 1).reduce((a, b) => a + b, 0) / period
  result.push(avg)
  for (let i = period + 1; i < candles.length; i++) {
    avg = (avg * (period - 1) + trs[i]) / period
    result.push(avg)
  }
  return result
}

// ---- OBV (On-Balance Volume) ----

export function obv(candles: Candle[]): number[] {
  let cumulative = 0
  return candles.map((c, i) => {
    if (i === 0) return 0
    const prev = candles[i - 1].close
    if (c.close > prev) cumulative += (c.volume ?? 0)
    else if (c.close < prev) cumulative -= (c.volume ?? 0)
    return cumulative
  })
}

// ---- Valeur courante (dernière valeur non-null) ----

export function lastValue(arr: (number | null)[]): number | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] != null) return arr[i]
  }
  return null
}

// ---- Volatilité annualisée ----

export function annualizedVolatility(closes: number[]): number {
  if (closes.length < 2) return 0
  const returns = closes.slice(1).map((c, i) => Math.log(c / closes[i]))
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length
  return Math.sqrt(variance) * Math.sqrt(252)
}
