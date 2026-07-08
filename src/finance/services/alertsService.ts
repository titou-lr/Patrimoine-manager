import type { PriceAlert, PriceQuote } from '../types/finance'

export function checkAlerts(
  alerts: PriceAlert[],
  quotes: Map<string, PriceQuote>,
  getAssetTicker: (assetId: string) => string | undefined
): string[] {
  const triggered: string[] = []
  for (const alert of alerts) {
    if (alert.triggered) continue
    const ticker = getAssetTicker(alert.assetId)
    if (!ticker) continue
    const quote = quotes.get(ticker)
    if (!quote) continue

    let fired = false
    switch (alert.condition) {
      case 'above': fired = quote.price >= alert.threshold; break
      case 'below': fired = quote.price <= alert.threshold; break
      case 'change_pct_up': fired = quote.changePct >= alert.threshold; break
      case 'change_pct_down': fired = quote.changePct <= -Math.abs(alert.threshold); break
    }
    if (fired) triggered.push(alert.id)
  }
  return triggered
}

export function conditionDisplay(condition: PriceAlert['condition'], threshold: number): string {
  switch (condition) {
    case 'above': return `Prix ≥ ${threshold}`
    case 'below': return `Prix ≤ ${threshold}`
    case 'change_pct_up': return `Variation ≥ +${threshold}%`
    case 'change_pct_down': return `Variation ≤ -${threshold}%`
  }
}
