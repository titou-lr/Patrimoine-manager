export function formatEur(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}

export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)} %`
}
