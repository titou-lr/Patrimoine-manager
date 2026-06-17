import type { TradingStrategy } from '../../types/finance'

export const manualStrategy: TradingStrategy = {
  id: 'manual',
  label: 'Manuel',
  description: 'Passez vos ordres manuellement sans signal automatique.',
  params: [],
  run: () => ({ type: 'hold', strength: 0, reason: 'Mode manuel' }),
}
