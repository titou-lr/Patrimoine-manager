/**
 * Indices de référence — données statiques annualisées historiques.
 * Rendements nominaux long terme, dividendes réinvestis. Aucune API externe.
 */

export interface BenchmarkIndex {
  id: string
  label: string
  annualReturn: number      // % annuel nominal moyen long terme
  annualVolatility: number  // % écart-type annuel indicatif
  description: string
}

export const BENCHMARKS: BenchmarkIndex[] = [
  {
    id: 'msci_world',
    label: 'MSCI World',
    annualReturn: 8.5,
    annualVolatility: 15,
    description: 'Actions monde développé, 1979–2024, dividendes réinvestis (USD)',
  },
  {
    id: 'sp500',
    label: 'S&P 500',
    annualReturn: 10.0,
    annualVolatility: 16,
    description: 'Actions US grandes capitalisations, 1957–2024, dividendes réinvestis (USD)',
  },
  {
    id: 'cac40',
    label: 'CAC 40 GR',
    annualReturn: 7.5,
    annualVolatility: 18,
    description: 'Actions françaises, indice gross return (dividendes réinvestis), 1988–2024',
  },
]
