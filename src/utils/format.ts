export function formatEur(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}

// Prix d'un actif coté : précision adaptée à l'ordre de grandeur (crypto < 1 €, forex, actions…)
export function formatPrice(val: number, currency: string): string {
  if (!val) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: val < 1 ? 4 : val < 100 ? 2 : 0,
    maximumFractionDigits: val < 1 ? 4 : val < 100 ? 2 : 0,
  }).format(val)
}

export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)} %`
}
