import type { Candle, TradingStrategy } from '../../types/finance'
import { macd } from '../../services/indicatorsService'

export const macdStrategy: TradingStrategy = {
  id: 'macd',
  label: 'MACD',
  description: 'Croisement MACD / ligne de signal.',
  params: [
    { key: 'fast', label: 'EMA rapide', type: 'number', defaultValue: 12, min: 2, max: 100, step: 1 },
    { key: 'slow', label: 'EMA lente', type: 'number', defaultValue: 26, min: 2, max: 200, step: 1 },
    { key: 'signal', label: 'Signal', type: 'number', defaultValue: 9, min: 2, max: 50, step: 1 },
  ],
  run: (candles: Candle[], params) => {
    const fast = Number(params.fast) || 12
    const slow = Number(params.slow) || 26
    const sig = Number(params.signal) || 9

    const closes = candles.map(c => c.close)
    const result = macd(closes, fast, slow, sig)
    const n = closes.length

    const histNow = result.histogram[n - 1]
    const histPrev = result.histogram[n - 2]
    const macdNow = result.macd[n - 1]
    const sigNow = result.signal[n - 1]
    const macdPrev = result.macd[n - 2]
    const sigPrev = result.signal[n - 2]

    if (histNow == null || histPrev == null || macdNow == null || sigNow == null || macdPrev == null || sigPrev == null) {
      return { type: 'hold', strength: 0, reason: 'Données insuffisantes' }
    }

    const maxHist = Math.max(...result.histogram.filter((v): v is number => v != null).map(Math.abs), 0.0001)
    const strength = Math.min(1, Math.abs(histNow) / maxHist)

    if (macdPrev <= sigPrev && macdNow > sigNow) {
      return { type: 'buy', strength, reason: `MACD croisement haussier (hist: ${histNow.toFixed(4)})` }
    }
    if (macdPrev >= sigPrev && macdNow < sigNow) {
      return { type: 'sell', strength, reason: `MACD croisement baissier (hist: ${histNow.toFixed(4)})` }
    }
    return { type: 'hold', strength: 0, reason: `MACD ${macdNow > sigNow ? 'au-dessus' : 'en-dessous'} du signal` }
  },
}
