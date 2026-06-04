/** Scénario de simulation (pessimiste / réaliste / optimiste) */
export type ScenarioType = 'pessimiste' | 'realiste' | 'optimiste'

/** Régime économique pour le moteur Markov */
export type EconomicRegime = 'expansion' | 'overheat' | 'recession' | 'crisis'

/** Classe d'actif financier */
export type AssetClass = 'equity' | 'bonds' | 'real_estate' | 'money_market' | 'crypto' | 'regulated'

/** Paramètres rendement/volatilité dans un régime donné */
export interface RegimeParams {
  meanReturn: number
  volatility: number
}

/** Paramètres historiques et par régime d'une classe d'actifs */
export interface AssetClassParams {
  assetClass: AssetClass
  historicalMeanReturn: number
  regimeParams: Record<EconomicRegime, RegimeParams>
}

/** Résultat d'une année de simulation Monte-Carlo */
export interface MonteCarloResult {
  year: number
  p10: number
  p50: number
  p90: number
  regimeDistribution: Record<EconomicRegime, number>
}

/** Suggestion de déplacement d'actif vers une enveloppe fiscalement plus avantageuse */
export interface LocationSuggestion {
  assetId: string
  assetName: string
  currentEnvelopeId: string
  suggestedEnvelopeId: string
  taxSavingEstimate: number
  reason: string
}

/** Allocation optimisée d'un actif dans une enveloppe */
export interface OptimizedAllocation {
  envelopeId: string
  assetId: string
  currentWeight: number
  optimizedWeight: number
  assetClass: AssetClass
  expectedNetReturn: number
  contributionToCVaR: number
}

/** Résultat complet de l'optimisation de portefeuille */
export interface OptimizationResult {
  allocations: OptimizedAllocation[]
  expectedReturn: number
  cvar95: number
  sharpeRatio: number
  monteCarloResults: MonteCarloResult[]
  blackLittermanReturns: Record<string, number>
  regimeWeights: Record<EconomicRegime, number>
  locationSuggestions: LocationSuggestion[]
  userViews?: BlackLittermanView[]
}

/** Vue de marché utilisateur pour Black-Litterman */
export interface BlackLittermanView {
  assetId: string
  relativeOutperformance: number
  confidence: number
}

/** Type d'enveloppe fiscale supportée */
export type EnvelopeType =
  | 'livret_a'
  | 'ldds'
  | 'pea'
  | 'cto'
  | 'assurance_vie'
  | 'per'
  | 'livret_jeune'

/** Profil fiscal de l'investisseur — transmis au moteur de calcul */
export interface TaxProfile {
  tmi: number          // Tranche marginale d'imposition 0–45%
  isCouple: boolean    // Déclaration commune (abattement AV 9 200€ si true)
  avAbattement: number // 4 600 ou 9 200 (dérivé de isCouple)
}

/** Résultat d'un calcul fiscal : gains bruts, impôts, nets et taux effectif */
export interface TaxResult {
  grossGain: number
  taxAmount: number
  netGain: number
  effectiveRate: number
  details: string // explication textuelle de la règle appliquée
}

/** Classe d'actif au sein d'une enveloppe */
export interface Asset {
  id: string
  name: string
  expectedReturn: number  // % annuel nominal
  allocation: number      // % de l'enveloppe, somme = 100
}

/** Structure des frais associés à une enveloppe */
export interface EnvelopeFees {
  orderFees: number       // % par ordre de bourse
  orderFeesMin: number    // minimum € par ordre
  custodyFees: number     // % annuel frais de tenue de compte
  entryFees: number       // % frais d'entrée sur versements
  managementFees: number  // % annuel frais de gestion (assurance-vie, PER)
  exitFees: number        // % frais de sortie
}

/** Objectif financier auquel une enveloppe peut être liée */
export type GoalType = 'retraite' | 'immobilier' | 'capital'

/** Type de passif financier */
export type LiabilityType = 'mortgage' | 'car_loan' | 'consumer_credit' | 'student_loan' | 'other'

/** Passif financier (dette, crédit) */
export interface Liability {
  id: string
  label: string
  type: LiabilityType
  totalAmount: number        // montant initial du crédit
  remainingAmount: number    // capital restant dû
  monthlyPayment: number     // mensualité totale (capital + intérêts)
  interestRate: number       // taux annuel en %
  remainingMonths: number    // durée restante en mois
  linkedGoal?: GoalType      // objectif lié (informatif)
  autoDeduct?: boolean       // déduire les mensualités de l'effort d'épargne
  active?: boolean           // inclus dans le bilan (défaut true)
}

/** Snapshot de patrimoine net (actifs - passifs) */
export interface NetWorthSnapshot {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  debtRatio: number         // totalLiabilities / totalAssets
  monthlyDebtBurden: number // somme des mensualités actives
}

/** Enveloppe d'investissement avec ses paramètres de versement et de fiscalité */
export interface Envelope {
  id: string
  type: EnvelopeType
  label: string
  initialCapital: number
  monthlyContribution: number
  yearlyContribution: number  // versement ponctuel (bonus, etc.)
  assets: Asset[]
  taxRate: number             // % appliqué sur les gains — legacy PER, fallback types inconnus
  fees?: EnvelopeFees
  active: boolean
  maxContribution?: number    // plafond légal des versements cumulés (ex : 22 950€ Livret A)
  dividendRate?: number       // % des rendements versés en dividendes — CTO uniquement, défaut 0
  /** Mode de saisie du versement mensuel : montant fixe ou part de l'effort total */
  contributionMode?: 'euros' | 'percent'
  /** Part de l'effort total alloué à cette enveloppe (toujours synchronisé avec monthlyContribution) */
  contributionPercent?: number
  /** Date d'ouverture ISO — null = nouvelle enveloppe (compte depuis aujourd'hui) */
  openedAt?: string | null
  /** Dans combien d'années l'utilisateur prévoit de sortir — null = fin de simulation */
  closureHorizon?: number | null
  /** Objectif auquel cette enveloppe contribue */
  linkedGoal?: GoalType | null
  /** Valeur actuelle réelle si l'enveloppe existe déjà — null = utiliser initialCapital */
  currentRealValue?: number | null
  /** Fréquence des versements — défaut 'monthly' */
  contributionFrequency?: 'monthly' | 'quarterly' | 'annual'
  /** Réinvestissement des dividendes — défaut true */
  reinvestDividends?: boolean
  /** Dividendes mensuels estimés (utilisé seulement si reinvestDividends = false) */
  estimatedMonthlyDividends?: number
}

/** Paramètres globaux de la simulation */
export interface GlobalParams {
  duration: number        // années de simulation
  inflationRate: number   // % annuel (valeur manuelle si inflationScenario = 'custom')
  monthlyIncome: number   // salaire net mensuel
  investmentRate: number  // % du revenu investi
  ageActuel: number       // âge actuel (pour jalons)
  tmi?: number            // Tranche marginale d'imposition en % (défaut 30)
  isCouple?: boolean      // Déclaration en couple — abattement AV 9 200€ (défaut false)
  inflationScenario?: 'custom' | 'low' | 'medium' | 'high'  // défaut 'custom'
  simulationMode?: 'standard' | 'advanced'
  initialRegime?: EconomicRegime | null
  riskTolerance?: 'prudent' | 'balanced' | 'dynamic'
}

/** Résultat annuel par enveloppe */
export interface EnvelopeResult {
  capital: number
  totalContributed: number
  grossGains: number    // gains avant fiscalité
  tax: number           // fiscalité estimée (sortie simulée)
  totalGains: number    // gains nets = grossGains - tax
  realValue: number     // valeur nette corrigée inflation
  totalFeesPaid: number // cumul frais payés sur la durée
  capped?: boolean              // plafond de versement atteint
  perTaxSavings?: number        // économie fiscale PER pour cette année (PER uniquement)
  contributionsRealValue?: number  // versements cumulés en euros constants (Fisher)
  taxDetails?: string           // explication textuelle du calcul fiscal (ex : "PEA ≥ 5 ans")
}

/** Impact inflation détaillé — annexé à chaque snapshot annuel */
export interface InflationImpact {
  totalNominal: number
  totalReal: number
  purchasingPowerLost: number          // totalNominal - totalReal
  contributionsRealValue: number       // versements cumulés en €courants
  realReturnByEnvelope: Record<string, number>  // rendement réel Fisher par enveloppe
}

/** Snapshot annuel de la simulation complète */
export interface SimulationResult {
  year: number
  byEnvelope: Record<string, EnvelopeResult>
  totalNominal: number
  totalReal: number
  totalContributed: number
  totalGains: number
  totalFeesPaid: number
  inflationImpact: InflationImpact
  perTaxSavings: number           // économie fiscale PER annuelle (toutes enveloppes PER)
  cappedEnvelopes: string[]       // IDs des enveloppes ayant atteint leur plafond
  taxByEnvelope: Record<string, number>  // fiscalité annuelle par enveloppe
  monteCarloResults?: MonteCarloResult[] // résultats Monte-Carlo (mode avancé uniquement)
}

/** Paramètres du module retraite */
export interface RetirementParams {
  ageRetirement: number
  monthlyExpenses: number
  pensionMonthly: number
  withdrawalRate: number
  lifeExpectancy: number
}

/** Entrée de suivi réel — valeur saisie par l'utilisateur à une date donnée */
export interface HistoryEntry {
  id: string
  date: string        // ISO date string (YYYY-MM-DD)
  envelopeId: string
  realValue: number
  note?: string
}

/** Type d'événement de vie */
export type LifeEventType =
  | 'pause'
  | 'windfall'
  | 'withdrawal'
  | 'expense_increase'
  | 'child'
  | 'custom'

/** Événement de vie impactant la simulation dans le temps */
export interface LifeEvent {
  id: string
  type: LifeEventType
  label: string
  yearOffset: number        // dans combien d'années depuis le départ de la simulation
  duration?: number         // durée en années (pour pause, expense_increase, child, custom)
  amount?: number           // montant € (windfall, withdrawal, salary_increase)
  envelopeId?: string       // enveloppe concernée — null = toutes
  monthlyImpact?: number    // impact mensuel sur les versements (expense_increase, child, custom)
}
