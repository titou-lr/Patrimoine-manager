import type { Candle, TradingStrategy } from '../../types/finance'
import { rsi } from '../../services/indicatorsService'

export const rsiStrategy: TradingStrategy = {
  id: 'rsi',
  label: 'RSI (Relative Strength Index)',
  description: 'Achat en zone de survente, vente en zone de surachat.',
  params: [
    { key: 'period', label: 'Période', type: 'number', defaultValue: 14, min: 2, max: 100, step: 1 },
    { key: 'oversold', label: 'Survente (<)', type: 'number', defaultValue: 30, min: 1, max: 49, step: 1 },
    { key: 'overbought', label: 'Surachat (>)', type: 'number', defaultValue: 70, min: 51, max: 99, step: 1 },
  ],
  run: (candles: Candle[], params) => {
    const period = Number(params.period) || 14
    const oversold = Number(params.oversold) || 30
    const overbought = Number(params.overbought) || 70

    const closes = candles.map(c => c.close)
    const rsiValues = rsi(closes, period)
    const current = rsiValues[rsiValues.length - 1]

    if (current == null) return { type: 'hold', strength: 0, reason: 'Données insuffisantes' }

    if (current < oversold) {
      const strength = Math.min(1, (oversold - current) / oversold)
      return { type: 'buy', strength, reason: `RSI survente (${current.toFixed(1)})` }
    }
    if (current > overbought) {
      const strength = Math.min(1, (current - overbought) / (100 - overbought))
      return { type: 'sell', strength, reason: `RSI surachat (${current.toFixed(1)})` }
    }
    return { type: 'hold', strength: 0, reason: `RSI neutre (${current.toFixed(1)})` }
  },
}
