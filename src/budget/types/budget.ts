export type BudgetCategoryGroup = 'fixed' | 'variable' | 'savings' | 'income'
export type TransactionType = 'expense' | 'income' | 'transfer'
export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'annual'

export interface BudgetCategory {
  id: string
  label: string
  group: BudgetCategoryGroup
  color?: string
  isSystem: boolean
  keywords?: string[]   // normalized lowercase, no accents — managed by addKeywordToCategory
}

export interface BudgetEnvelope {
  id: string
  categoryId: string
  label: string
  monthlyAllocation: number
  rollover: boolean
  linkedSimEnvelopeId?: string
  active: boolean
}

export interface BudgetTransaction {
  id: string
  date: string               // ISO YYYY-MM-DD
  amount: number             // toujours positif
  type: TransactionType
  categoryId: string
  envelopeId?: string
  label: string
  note?: string
  recurringRuleId?: string
  source: 'manual' | 'csv_import' | 'recurring'
  importHash?: string        // hash(date+amount+label) — dédoublonnage import CSV
  categorySource?: 'manual' | 'keyword_match' | 'default'  // absent = treat as 'manual'
}

export interface CsvColumnMapping {
  dateColumnIndex: number
  amountColumnIndex: number
  labelColumnIndex: number
  typeColumnIndex?: number
  amountMode: 'signed' | 'absolute' | 'debit_credit_columns'
  debitColumnIndex?: number   // used when amountMode === 'debit_credit_columns'
  creditColumnIndex?: number  // used when amountMode === 'debit_credit_columns'
  dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD'
  headerRowIndex: number      // index of the row containing column headers (0 = no preamble)
}

export interface RecurringRule {
  id: string
  label: string
  amount: number
  type: TransactionType
  categoryId: string
  frequency: RecurringFrequency
  dayOfMonth?: number
  active: boolean
  detectedAutomatically: boolean
  lastGeneratedMonth?: string | null  // YYYY-MM
}

export interface EnvelopeMonthlyStat {
  envelopeId: string
  allocated: number
  spent: number
  remaining: number          // peut être négatif (dépassement)
  carryOverFromPrevious: number
}

export interface MonthlyBudgetSnapshot {
  month: string              // YYYY-MM
  totalIncome: number
  totalExpenses: number
  totalSaved: number
  realSavingsRate: number    // totalSaved / totalIncome
  byEnvelope: Record<string, EnvelopeMonthlyStat>
}

/** Objectif d'épargne nommé — progression suivie depuis les données budget réelles */
export interface SavingsGoal {
  id: string
  label: string
  targetAmount: number
  targetDate?: string | null        // YYYY-MM — optionnel
  linkedEnvelopeId?: string | null  // enveloppe budgétaire liée — optionnel
  startingAmount: number            // montant déjà épargné à la création (défaut 0)
  createdAt: string                 // YYYY-MM-DD
}

/** Progression calculée d'un objectif d'épargne */
export interface SavingsGoalProgress {
  goalId: string
  current: number
  pct: number                       // 0–1, capé à 1
  monthlyPace: number               // rythme d'épargne réel €/mois (moyenne 3 derniers mois)
  projectedMonth: string | null     // YYYY-MM d'atteinte projetée — null si rythme nul
  monthsRemaining: number | null
  onTrack: boolean | null           // vs targetDate — null si pas de date cible
}

/** Abonnement détecté (règle récurrente confirmée ou candidat détecté) */
export interface SubscriptionInfo {
  id: string
  label: string
  amount: number
  frequency: RecurringFrequency
  monthlyCost: number               // coût normalisé €/mois
  annualCost: number
  nextRenewalDate: string | null    // ISO YYYY-MM-DD — null si indéterminable
  daysUntilRenewal: number | null
  source: 'rule' | 'detected'
  categoryId: string
}

/** Élément du calendrier de prélèvements */
export interface CalendarPaymentItem {
  label: string
  amount: number
  kind: 'actual' | 'upcoming'       // transaction réelle du mois vs règle à venir
  frequency?: RecurringFrequency
  categoryId: string
}

export interface CashflowForecastPoint {
  month: string
  projectedIncome: number
  projectedExpenses: number
  projectedBalance: number
  confidence: 'high' | 'medium' | 'low'
}

export interface SimulationGapResult {
  assumedSavingsRate: number // dérivé de globalParams.investmentRate
  realSavingsRate: number
  deltaPct: number
  severity: 'ok' | 'warning' | 'critical'
}
