import type { Candle, TradingStrategy } from '../../types/finance'

export const dcaStrategy: TradingStrategy = {
  id: 'dca',
  label: 'DCA (Dollar Cost Averaging)',
  description: "Achat périodique à intervalle fixe, indépendamment du prix.",
  params: [
    { key: 'intervalDays', label: 'Intervalle (jours)', type: 'number', defaultValue: 30, min: 1, max: 365, step: 1 },
    { key: 'amountPerBuy', label: 'Montant par achat (€)', type: 'number', defaultValue: 100, min: 1, step: 10 },
  ],
  run: (candles: Candle[], params) => {
    const interval = Number(params.intervalDays) || 30
    const i = candles.length - 1
    if (i >= 0 && i % interval === 0) {
      return { type: 'buy', strength: 1, reason: 'DCA — achat périodique' }
    }
    return { type: 'hold', strength: 0, reason: 'DCA — hors intervalle' }
  },
}
