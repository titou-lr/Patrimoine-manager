export type AssetCategory =
  | 'ETF'
  | 'Livrets'
  | 'Fonds euros'
  | 'Obligations'
  | 'Immobilier'
  | 'Crypto'
  | 'Actions'
  | 'Or'
  | 'Monétaire'

export type Volatility =
  | 'Nulle'
  | 'Très faible'
  | 'Faible'
  | 'Moyenne'
  | 'Élevée'
  | 'Très élevée'

export type BankType = 'banque-en-ligne' | 'courtier' | 'banque-traditionnelle'

export interface MarketAsset {
  id: string
  name: string
  category: AssetCategory
  ticker: string | null
  currency: string
  returnAvg10y: number
  returnAvg5y: number | null
  returnYTD: number | null
  change24h?: number | null
  volatility: Volatility
  risk: number        // 1–7
  minInvestment: number
  description: string
  lastPrice: number | null
  lastUpdated: string | null
  source: 'static' | 'live'
}

export interface EnvelopeInfo {
  available: boolean
  notes: string
  fees?: number          // livrets
  orderFees?: number     // PEA, CTO
  custodyFees?: number   // PEA, CTO
  minOrder?: number      // PEA, CTO
  entryFees?: number     // AV, PER
  managementFees?: number
  arbitrageFees?: number // AV
}

export interface Bank {
  id: string
  name: string
  type: BankType
  logo: string | null
  envelopes: {
    livret_a: EnvelopeInfo
    ldds: EnvelopeInfo
    pea: EnvelopeInfo
    cto: EnvelopeInfo
    assurance_vie: EnvelopeInfo
    per: EnvelopeInfo
  }
  pros: string[]
  cons: string[]
  rating: number
}
