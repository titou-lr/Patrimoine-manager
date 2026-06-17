import type { Candle, TradingStrategy } from '../../types/finance'

export const gridStrategy: TradingStrategy = {
  id: 'grid',
  label: 'Grid Trading',
  description: 'Achat/vente automatique sur des niveaux de grille fixes.',
  params: [
    { key: 'gridSpacingPct', label: 'Espacement grille (%)', type: 'number', defaultValue: 5, min: 0.5, max: 50, step: 0.5 },
    { key: 'gridLevels', label: 'Nombre de niveaux', type: 'number', defaultValue: 5, min: 2, max: 20, step: 1 },
  ],
  run: (candles: Candle[], params) => {
    const spacingPct = Number(params.gridSpacingPct) || 5
    const levels = Math.floor(Number(params.gridLevels) || 5)

    if (candles.length < 2) return { type: 'hold', strength: 0, reason: 'Données insuffisantes' }

    const refPrice = candles[0].close
    const price = candles[candles.length - 1].close
    const spacing = refPrice * (spacingPct / 100)

    // Trouver le niveau de grille actuel
    const gridIndex = Math.round((price - refPrice) / spacing)
    const prevPrice = candles[candles.length - 2].close
    const prevGridIndex = Math.round((prevPrice - refPrice) / spacing)

    if (gridIndex < prevGridIndex && gridIndex >= -levels) {
      const strength = Math.min(1, Math.abs(gridIndex) / levels)
      return { type: 'buy', strength, reason: `Grille niveau ${gridIndex} (ref: ${refPrice.toFixed(2)})` }
    }
    if (gridIndex > prevGridIndex && gridIndex <= levels) {
      const strength = Math.min(1, Math.abs(gridIndex) / levels)
      return { type: 'sell', strength, reason: `Grille niveau +${gridIndex} (ref: ${refPrice.toFixed(2)})` }
    }
    return { type: 'hold', strength: 0, reason: `Grille niveau ${gridIndex > 0 ? '+' : ''}${gridIndex}` }
  },
}
