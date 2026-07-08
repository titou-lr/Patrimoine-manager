# Spec — Module Budget (`src/budget/`)

Document de conception pour le nouveau module Budget, à intégrer au Simulateur de Patrimoine (v1.2.0). Rédigé dans le même esprit que `CLAUDE.md` — à utiliser comme contexte pour une session Claude Code.

## Objectif

Combler le seul vrai manque de l'app : le pilotage du **quotidien**. Le module Budget n'est pas un tracker de dépenses isolé — c'est la couche qui alimente en données réelles les hypothèses du moteur de simulation (`globalParams.investmentRate`, `monthlyIncome`) et qui nourrit `alertsEngine`.

Principe retenu : **budget par enveloppes** (zero-based budgeting) — cohérent avec le vocabulaire déjà utilisé dans l'app (`Envelope`, `capRedirectTo`), mais ce sont des enveloppes *budgétaires* distinctes des enveloppes *fiscales* existantes (ne pas les confondre dans le code).

---

## Arborescence

```
src/budget/
├── types/
│   └── budget.ts
├── store/
│   └── useBudgetStore.ts        # Zustand persist — clé patrimoine-budget-[profileId]
├── engine/
│   ├── budgetEngine.ts          # snapshot mensuel, stats enveloppe, taux d'épargne réel
│   ├── recurringDetector.ts     # détection d'abonnements/récurrences
│   ├── forecastEngine.ts        # prévision de trésorerie glissante
│   └── csvImport.ts             # parsing CSV relevé bancaire + dédoublonnage
├── data/
│   └── defaultCategories.ts     # DEFAULT_CATEGORIES (catégories système par groupe)
└── components/
    ├── BudgetPage.tsx           # racine — sélecteur mois, vue d'ensemble, grille enveloppes
    ├── BudgetOverviewPanel.tsx  # donut dépenses/catégorie + barre revenus vs dépenses
    ├── BudgetVsSimulationBanner.tsx # bandeau écart taux d'épargne réel vs hypothèse simulation
    ├── envelopes/
    │   ├── EnvelopeGrid.tsx
    │   └── BudgetEnvelopeCard.tsx   # barre alloué/dépensé/restant, édition inline
    ├── transactions/
    │   ├── TransactionList.tsx
    │   ├── TransactionRow.tsx
    │   └── AddTransactionModal.tsx
    ├── recurring/
    │   └── RecurringRulesPanel.tsx  # règles actives + suggestions détectées
    ├── forecast/
    │   └── CashflowForecastChart.tsx # Recharts, projection 3-6 mois
    ├── import/
    │   └── CsvImportModal.tsx       # wizard mapping colonnes + aperçu + dédoublonnage
    └── categories/
        └── CategoryManagerModal.tsx
```

---

## Types (`src/budget/types/budget.ts`)

```ts
export type BudgetCategoryGroup = 'fixed' | 'variable' | 'savings' | 'income'
export type TransactionType = 'expense' | 'income' | 'transfer'
export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'annual'

export interface BudgetCategory {
  id: string
  label: string
  group: BudgetCategoryGroup
  color?: string
  isSystem: boolean          // catégories par défaut, non supprimables
}

export interface BudgetEnvelope {
  id: string
  categoryId: string
  label: string
  monthlyAllocation: number
  rollover: boolean          // solde non dépensé reporté au mois suivant
  linkedSimEnvelopeId?: string // optionnel : pointe vers Envelope.id (PEA, AV...) — purement informatif, AUCUNE écriture croisée automatique
  active: boolean
}

export interface BudgetTransaction {
  id: string
  date: string                // ISO YYYY-MM-DD
  amount: number               // toujours positif
  type: TransactionType
  categoryId: string
  envelopeId?: string
  label: string
  note?: string
  recurringRuleId?: string
  source: 'manual' | 'csv_import'
  importHash?: string          // hash(date+amount+label) — dédoublonnage import CSV
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
  remaining: number            // peut être négatif (dépassement)
  carryOverFromPrevious: number
}

export interface MonthlyBudgetSnapshot {
  month: string                 // YYYY-MM
  totalIncome: number
  totalExpenses: number
  totalSaved: number
  realSavingsRate: number       // totalSaved / totalIncome
  byEnvelope: Record<string, EnvelopeMonthlyStat>
}

export interface CashflowForecastPoint {
  month: string
  projectedIncome: number
  projectedExpenses: number
  projectedBalance: number
  confidence: 'high' | 'medium' | 'low'  // basé sur l'historique disponible (≥3 mois = high)
}

export interface SimulationGapResult {
  assumedSavingsRate: number    // dérivé de globalParams.investmentRate
  realSavingsRate: number
  deltaPct: number
  severity: 'ok' | 'warning' | 'critical'  // seuils à définir (ex : |delta| < 5pt = ok, < 15pt = warning, sinon critical)
}
```

---

## Store (`src/budget/store/useBudgetStore.ts`)

Suit exactement le pattern de `useEducationStore` / `useCustomBanks` : Zustand persist, **clé dynamique par profil** `patrimoine-budget-[profileId]`, store **indépendant** de `useStore` et `useFinanceStore`.

```ts
interface BudgetState {
  categories: BudgetCategory[]      // DEFAULT_CATEGORIES + perso
  envelopes: BudgetEnvelope[]
  transactions: BudgetTransaction[]
  recurringRules: RecurringRule[]

  // session only (non persisté)
  selectedMonth: string              // YYYY-MM, défaut = mois courant

  // actions
  addTransaction(tx: Omit<BudgetTransaction, 'id'>): void
  updateTransaction(id: string, patch: Partial<BudgetTransaction>): void
  removeTransaction(id: string): void
  importTransactions(txs: Omit<BudgetTransaction, 'id'>[]): { imported: number; duplicatesSkipped: number }

  addEnvelope(envelope: Omit<BudgetEnvelope, 'id'>): void
  updateEnvelope(id: string, patch: Partial<BudgetEnvelope>): void
  removeEnvelope(id: string): void

  addCategory(category: Omit<BudgetCategory, 'id' | 'isSystem'>): void
  removeCategory(id: string): void   // refuse si isSystem === true

  upsertRecurringRule(rule: Omit<RecurringRule, 'id'> & { id?: string }): void
  removeRecurringRule(id: string): void
  generateRecurringTransactions(month: string): number  // crée les tx du mois pour les règles actives, retourne le nb créé

  setSelectedMonth(month: string): void
}
```

**Règles** (à inscrire dans `CLAUDE.md` une fois implémenté, section "Ce que Claude Code NE doit PAS faire") :
- Ne pas renommer la clé `patrimoine-budget-[profileId]`
- Ne pas mélanger `useBudgetStore` avec `useStore` ni `useFinanceStore`
- `linkedSimEnvelopeId` est **purement informatif** — ne jamais écrire automatiquement dans `Envelope` ou `GlobalParams` depuis le module Budget. Toute proposition de correction (ex. ajuster `investmentRate`) doit suivre le pattern `OptimizationSuggestion.patch?` existant dans `taxOptimizer.ts` : un patch *proposé*, jamais appliqué sans clic explicite de l'utilisateur
- `removeCategory` doit no-op (ou throw en dev) sur une catégorie système — ne pas permettre la suppression silencieuse des catégories par défaut référencées par des transactions existantes

---

## Moteur (`src/budget/engine/`) — fonctions pures, zéro import React

### `budgetEngine.ts`
- `computeMonthlySnapshot(transactions, envelopes, month, previousSnapshot?)` → `MonthlyBudgetSnapshot`
  - Gère le `carryOverFromPrevious` si `envelope.rollover === true`
- `computeEnvelopeStat(envelope, transactions, month, carryOver)` → `EnvelopeMonthlyStat`
- `compareToSimulationAssumption(snapshot, globalParams)` → `SimulationGapResult`
  - C'est **le pont principal** avec le moteur existant. Lit `globalParams.investmentRate` (déjà dans `GlobalParams`), ne l'écrit jamais.

### `recurringDetector.ts`
- `detectRecurringCandidates(transactions, minOccurrences = 3)` → `RecurringRule[]` (suggestions, `active: false`, `detectedAutomatically: true`)
  - Heuristique : regrouper par libellé normalisé (lowercase, sans chiffres) + montant à ±5% près, vérifier un intervalle régulier (±3 jours) entre occurrences
  - L'utilisateur confirme/rejette chaque suggestion dans `RecurringRulesPanel` — jamais d'activation automatique

### `forecastEngine.ts`
- `forecastCashflow(transactions, recurringRules, monthsAhead = 6)` → `CashflowForecastPoint[]`
  - V1 simple : moyenne glissante des 3 derniers mois + projection des règles récurrentes actives connues
  - `confidence` dépend du nombre de mois d'historique disponibles

### `csvImport.ts`
- `parseCsvTransactions(csvText, columnMapping)` → `BudgetTransaction[]`
  - Pas de lib externe ajoutée au bundle principal — parseur CSV minimal suffisant (gestion guillemets/virgules basique)
  - `computeImportHash(date, amount, label)` → string, utilisé pour le dédoublonnage dans `importTransactions()`

---

## Composants — comportement clé

| Composant | Rôle |
|---|---|
| `BudgetPage` | Racine : sélecteur de mois (`selectedMonth`), `BudgetOverviewPanel`, `BudgetVsSimulationBanner`, `EnvelopeGrid` |
| `BudgetEnvelopeCard` | Barre de progression 3 segments (dépensé / restant / report), édition inline de `monthlyAllocation`, badge dépassement si `remaining < 0` |
| `BudgetVsSimulationBanner` | Affiché uniquement si `severity !== 'ok'` — "Votre taux d'épargne réel (X%) diffère de l'hypothèse de simulation (Y%)" avec lien vers `EnvelopesPage` |
| `CsvImportModal` | Étapes : upload → mapping colonnes (date/montant/libellé/type) → aperçu avec doublons grisés → confirmation |
| `RecurringRulesPanel` | Deux sections : règles actives (CRUD) / suggestions détectées en attente de confirmation |
| `CashflowForecastChart` | Recharts AreaChart, ligne projetée en pointillés au-delà du mois courant |

---

## Intégration App / navigation

- `AppPage` étendu : `'dashboard' | 'envelopes' | 'optimizer' | 'data' | 'finance' | 'education' | 'brokers' | 'models' | 'budget'`
- Classement sidebar : **page transverse** (comme Finance/Éducation/Courtiers/Modèles) — le budget suit le profil entier, pas une simulation précise
- Raccourci : `Cmd+8` / palette `G G` (libre actuellement)
- `data-tour-id` sur les éléments clés + nouveau `src/tour/steps/budgetSteps.ts`, déclenché à la première visite (pattern identique aux autres pages transverses)

## Intégration avec les moteurs existants

- **`alertsEngine.ts`** : soit une nouvelle règle directement dedans (si on accepte une dépendance légère au budget), soit un fichier séparé `budgetAlertsEngine.ts` agrégé dans `SmartAlerts` — préférable pour ne pas alourdir `alertsEngine.ts` d'une dépendance à un store qu'il ne connaît pas aujourd'hui. **Recommandation : fichier séparé.**
- **`lifeEventsEngine.ts`** : aucune écriture automatique. Si on veut un jour suggérer un `LifeEvent` depuis un dépassement budgétaire récurrent, ce sera une action utilisateur explicite ("Convertir en événement de vie"), pas une génération auto.
- **`netWorthEngine.ts`** : pas de couplage direct en V1. Le total mensuel épargné (`MonthlyBudgetSnapshot.totalSaved`) pourrait alimenter `HistoryEntry` à terme (V2), mais ce n'est pas nécessaire pour le MVP.

---

## Roadmap

**V1 (MVP)**
- Catégories système + perso, enveloppes, transactions manuelles (CRUD)
- `computeMonthlySnapshot` + `BudgetEnvelopeCard` avec barre de progression
- `BudgetVsSimulationBanner` (le seul pont avec le moteur principal, mais le plus important)
- Navigation + tour

**V2**
- Import CSV (`csvImport.ts`, `CsvImportModal`)
- Détection de récurrences (`recurringDetector.ts`, `RecurringRulesPanel`)
- Prévision de trésorerie (`forecastEngine.ts`, `CashflowForecastChart`)
- `budgetAlertsEngine.ts` intégré à `SmartAlerts`

**V3 (hors scope immédiat)**
- Mode couple (enveloppes partagées entre deux profils)
- Lien `HistoryEntry` ↔ épargne réelle mensuelle

---

## Points de vigilance pour l'implémentation

- Ne pas réutiliser le type `Envelope` (fiscal) pour les enveloppes budgétaires — types et noms de fichiers bien séparés (`BudgetEnvelope` ≠ `Envelope`)
- Respecter le pattern store-séparé-par-profil déjà en place (`useEducationStore`, `useCustomBanks`, `useTourStore`) plutôt que d'étendre `useStore`
- Aucune dépendance externe nécessaire pour le parsing CSV ou la détection de récurrence — tout en fonctions pures, cohérent avec la règle "pas de lib externe" déjà appliquée au module Finance pour les indicateurs/backtest
- `compareToSimulationAssumption` doit rester un simple lecteur de `GlobalParams` — jamais un écrivain
