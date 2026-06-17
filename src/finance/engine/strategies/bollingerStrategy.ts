import type { Candle, TradingStrategy } from '../../types/finance'
import { bollinger } from '../../services/indicatorsService'

export const bollingerStrategy: TradingStrategy = {
  id: 'bollinger',
  label: 'Bandes de Bollinger',
  description: 'Achat en bas de bande, vente en haut de bande.',
  params: [
    { key: 'period', label: 'Période', type: 'number', defaultValue: 20, min: 2, max: 200, step: 1 },
    { key: 'multiplier', label: 'Multiplicateur σ', type: 'number', defaultValue: 2, min: 0.5, max: 4, step: 0.1 },
  ],
  run: (candles: Candle[], params) => {
    const period = Number(params.period) || 20
    const multiplier = Number(params.multiplier) || 2

    const closes = candles.map(c => c.close)
    const { upper, lower, middle } = bollinger(closes, period, multiplier)

    const n = closes.length
    const price = closes[n - 1]
    const up = upper[n - 1]
    const lo = lower[n - 1]
    const mid = middle[n - 1]

    if (up == null || lo == null || mid == null) {
      return { type: 'hold', strength: 0, reason: 'Données insuffisantes' }
    }

    const bandwidth = up - lo
    if (bandwidth === 0) return { type: 'hold', strength: 0, reason: 'Bande nulle' }

    if (price <= lo) {
      const strength = Math.min(1, (lo - price) / (bandwidth * 0.25))
      return { type: 'buy', strength, reason: `Prix sous bande inf. (${price.toFixed(2)} ≤ ${lo.toFixed(2)})` }
    }
    if (price >= up) {
      const strength = Math.min(1, (price - up) / (bandwidth * 0.25))
      return { type: 'sell', strength, reason: `Prix sur bande sup. (${price.toFixed(2)} ≥ ${up.toFixed(2)})` }
    }
    return { type: 'hold', strength: 0, reason: `Prix dans les bandes (${lo.toFixed(2)}–${up.toFixed(2)})` }
  },
}
