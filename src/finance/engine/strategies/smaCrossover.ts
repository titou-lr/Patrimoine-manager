import type { Candle, TradingStrategy } from '../../types/finance'
import { sma, lastValue } from '../../services/indicatorsService'

export const smaCrossoverStrategy: TradingStrategy = {
  id: 'sma_crossover',
  label: 'Croisement SMA',
  description: 'Golden cross / Death cross entre deux moyennes mobiles simples.',
  params: [
    { key: 'fastPeriod', label: 'Période rapide', type: 'number', defaultValue: 20, min: 2, max: 200, step: 1 },
    { key: 'slowPeriod', label: 'Période lente', type: 'number', defaultValue: 50, min: 2, max: 500, step: 1 },
  ],
  run: (candles: Candle[], params) => {
    const fast = Number(params.fastPeriod) || 20
    const slow = Number(params.slowPeriod) || 50
    if (candles.length < slow + 1) return { type: 'hold', strength: 0, reason: 'Données insuffisantes' }

    const closes = candles.map(c => c.close)
    const fastSma = sma(closes, fast)
    const slowSma = sma(closes, slow)

    const n = closes.length
    const fastNow = fastSma[n - 1]
    const slowNow = slowSma[n - 1]
    const fastPrev = fastSma[n - 2]
    const slowPrev = slowSma[n - 2]

    if (fastNow == null || slowNow == null || fastPrev == null || slowPrev == null) {
      return { type: 'hold', strength: 0, reason: 'Données insuffisantes' }
    }

    const spread = Math.abs(fastNow - slowNow) / slowNow
    const strength = Math.min(1, spread * 20)

    if (fastPrev <= slowPrev && fastNow > slowNow) {
      return { type: 'buy', strength, reason: `Golden cross SMA${fast}/${slow}` }
    }
    if (fastPrev >= slowPrev && fastNow < slowNow) {
      return { type: 'sell', strength, reason: `Death cross SMA${fast}/${slow}` }
    }
    return { type: 'hold', strength: 0, reason: `SMA${fast} ${fastNow > slowNow ? '>' : '<'} SMA${slow}` }
  },
}

// Re-export lastValue to silence unused-import lint if tree-shaking removes it
void lastValue
