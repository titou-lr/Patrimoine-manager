import type { TradingStrategy } from '../../types/finance'
import { manualStrategy } from './manual'
import { dcaStrategy } from './dca'
import { smaCrossoverStrategy } from './smaCrossover'
import { rsiStrategy } from './rsiStrategy'
import { bollingerStrategy } from './bollingerStrategy'
import { macdStrategy } from './macdStrategy'
import { gridStrategy } from './gridStrategy'

export const STRATEGIES: TradingStrategy[] = [
  manualStrategy,
  dcaStrategy,
  smaCrossoverStrategy,
  rsiStrategy,
  bollingerStrategy,
  macdStrategy,
  gridStrategy,
]

export function getStrategy(id: string): TradingStrategy | undefined {
  return STRATEGIES.find(s => s.id === id)
}
