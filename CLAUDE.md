# CLAUDE.md — Simulateur de Patrimoine

## Projet
App web locale (pas de backend, pas de GitHub) pour simuler l'évolution d'un patrimoine financier multi-enveloppes sur le long terme. Développement en VS Code.

## Stack
- **React 19** + **Vite 8** (bundler rapide, HMR)
- **TypeScript ~6.0** (typage strict)
- **Tailwind CSS v4** (styling utility-first, design tokens custom)
- **Recharts 3** (graphiques)
- **Zustand 5** + persist (state global + localStorage)
- **Electron 42** (packaging desktop optionnel)
- Pas de backend, pas de DB — tout en mémoire/localStorage

## Structure du projet (état actuel — juin 2026)
```
patrimoine-sim/
├── CLAUDE.md
├── src/README_DEV.md            # Architecture technique détaillée
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── electron/main.js             # Process principal Electron (CommonJS)
├── assets/icon.svg              # Icône app
└── src/
    ├── main.tsx
    ├── App.tsx                  # Racine — sidebar fixe, navigation 4 pages, RunState, modales
    ├── profiles/
    │   └── profileService.ts    # CRUD profils localStorage — getProfiles(), getStoreKey()
    ├── store/
    │   └── useStore.ts          # Zustand persist — clé dynamique par profil, simulations[], undo/redo
    ├── types/
    │   ├── index.ts             # Types TS principaux (Envelope, SimulationResult, LifeEvent, Liability…)
    │   └── data.ts              # Types données marché (MarketAsset, Bank…)
    ├── engine/
    │   ├── simulation.ts        # Moteur calcul pur — runSimulation(envelopes, params, events), ZERO_FEES
    │   ├── taxation.ts          # Calculs fiscaux purs — computeTax(), taxPEA(), taxCTO(), taxAV(), taxPER()
    │   ├── inflation.ts         # Calculs inflation — realReturn() Fisher, presentValue(), resolveInflationRate()
    │   ├── retirement.ts        # Calculs retraite — computeRetirementAnalysis()
    │   ├── lifeEventsEngine.ts  # Événements de vie — buildEnvelopeEffects(), EnvelopeEffect
    │   ├── netWorthEngine.ts    # Bilan net — liabilityRemainingAt(), computeNetWorth(), computeNetWorthSeries()
    │   ├── alertsEngine.ts      # Alertes contextuelles — generateAlerts(), Alert interface
    │   ├── taxOptimizer.ts      # Optimiseur fiscal — analyzeTaxOptimization(), OptimizationSuggestion
    │   ├── markovEngine.ts      # Moteur Markov + Monte-Carlo — sampleNextRegime(), runMonteCarlo()
    │   └── portfolioOptimizer.ts # Black-Litterman, CVaR, optimizePortfolio(), assetLocationOptimizer()
    ├── services/
    │   └── marketDataService.ts # Fetch Yahoo/CoinGecko avec cache localStorage 1h
    ├── data/
    │   ├── envelopePresets.ts   # Presets enveloppes — ENVELOPE_PRESETS, createEnvelopeFromPreset()
    │   ├── glossary.ts          # GLOSSARY_TERMS — 5 catégories (fiscal/investissement/enveloppe/calcul/risque)
    │   ├── regimeData.ts        # Données régimes économiques (rendements/volatilités par régime)
    │   ├── assets.json          # Base d'actifs statique (ETF, crypto, livrets…)
    │   ├── banks.json           # Base de données frais par banque
    │   └── metadata.json        # Métadonnées app (version, date)
    ├── components/
    │   ├── layout/
    │   │   ├── SimulationTabs.tsx    # Onglets simulations (desktop)
    │   │   └── SimulationDropdown.tsx # Sélecteur simulation (mobile/header)
    │   ├── pages/
    │   │   ├── DashboardPage.tsx    # Page résultats — KPIs, 7 onglets graphiques, SmartAlerts, HistoryPanel
    │   │   └── EnvelopesPage.tsx    # Page config enveloppes — grille + bande params + bouton Run
    │   ├── profiles/
    │   │   ├── ProfileScreen.tsx     # Écran sélection profil (Netflix-style)
    │   │   ├── CreateProfileModal.tsx # Modal création profil 2 étapes
    │   │   └── ProfileMenu.tsx       # Dropdown header (legacy, remplacé par ProfileDropdown inline dans App.tsx)
    │   ├── inputs/
    │   │   ├── GlobalParams.tsx      # (legacy) — remplacé par GlobalParamsBand
    │   │   ├── GlobalParamsBand.tsx  # Bande paramètres globaux + bouton Lancer (EnvelopesPage)
    │   │   ├── EnvelopeCard.tsx      # Carte enveloppe pliable — orchestre les sections ci-dessous
    │   │   ├── EnvelopeMetaSection.tsx     # Métadonnées — label, date ouverture, horizon, objectif
    │   │   ├── EnvelopeProjectionSection.tsx # Versements — montant, fréquence, mode euros/%, dividendes
    │   │   ├── EnvelopeAssetsFees.tsx      # Actifs + frais — tableau actifs, import frais banque
    │   │   ├── EnvelopeTaxInfo.tsx         # Infobande fiscale résumée par enveloppe
    │   │   ├── EnvelopeTypeSelector.tsx    # Modal choix type enveloppe (grilles par groupe)
    │   │   ├── AllocationRow.tsx      # Ligne actif (nom, rendement, allocation %)
    │   │   └── NumberInput.tsx        # (dans ui/) Input numérique avec min/max, suffix, font-mono
    │   ├── results/
    │   │   ├── SummaryCards.tsx      # KPIs héros (capital, valeur réelle, gains)
    │   │   ├── PatrimoineChart.tsx   # AreaChart empilé par enveloppe + ligne réelle
    │   │   ├── BreakdownTable.tsx    # Tableau détail par enveloppe (sélecteur année)
    │   │   ├── InflationChart.tsx    # AreaChart valeur réelle + érosion inflation
    │   │   ├── AllocationPieChart.tsx # Donut répartition patrimoine (sélecteur année)
    │   │   ├── MilestonePanel.tsx    # Jalons 100k/500k/1M avec progression
    │   │   ├── FeesImpactChart.tsx   # AreaChart avec/sans frais — impact cumulé
    │   │   ├── RetirementPanel.tsx   # Paramètres + KPIs retraite
    │   │   ├── RetirementDualChart.tsx # Graphique accumulation + retrait
    │   │   ├── RealEstatePanel.tsx   # Simulateur immobilier (prêt, apport, mensualité)
    │   │   ├── CapitalPanel.tsx      # Objectif capital avec horizon cible
    │   │   ├── SecurityPanel.tsx     # Fonds urgence, revenus passifs, score sécurité
    │   │   └── SimulationComparePanel.tsx # Drawer comparaison multi-simulations
    │   ├── networth/
    │   │   ├── NetWorthPanel.tsx     # Bilan net — AreaChart actifs/passifs, KPIs endettement
    │   │   └── LiabilityCard.tsx     # Carte passif individuel (CRUD inline)
    │   ├── tracking/
    │   │   └── HistoryPanel.tsx      # Suivi réel — saisie valeurs historiques + LineChart vs simulation
    │   ├── tools/
    │   │   ├── LifeEvents.tsx        # Gestion événements de vie (CRUD, formulaire type/date/durée)
    │   │   ├── BackwardCalculator.tsx # Calculateur inverse : cible → versement mensuel nécessaire
    │   │   └── TaxOptimizer.tsx      # Interface optimiseur fiscal — suggestions classées par économie
    │   ├── compare/
    │   │   └── StrategyComparator.tsx # Comparateur stratégies — LineChart multi-simulations recharts
    │   ├── alerts/
    │   │   └── SmartAlerts.tsx       # Panel alertes — liste prioritisée (P1 warnings, P2 tips, P3 infos)
    │   ├── scenarios/
    │   │   ├── ScenarioSelector.tsx  # Boutons pessimiste/réaliste/optimiste
    │   │   └── ScenarioCompareChart.tsx # LineChart 3 scénarios superposés
    │   ├── data/
    │   │   ├── DataModal.tsx         # Modal OU page banque de données (3 onglets)
    │   │   ├── AssetsTab.tsx         # Tableau actifs avec filtres, tri, import
    │   │   ├── BanksTab.tsx          # Liste banques avec filtres et comparaison
    │   │   ├── BankCard.tsx          # Carte banque avec frais par enveloppe
    │   │   ├── BankCompareOverlay.tsx # Modal comparatif frais banques
    │   │   └── ModelsPage.tsx        # Page formules mathématiques — FormulaBlock + InteractiveExample
    │   ├── optimizer/
    │   │   └── PortfolioOptimizer.tsx # Page Optimiseur — Black-Litterman, Monte-Carlo, suggestions
    │   ├── onboarding/
    │   │   └── OnboardingModal.tsx   # Wizard 6 étapes (profil, objectif, épargne…)
    │   └── ui/
    │       ├── NumberInput.tsx       # Input numérique avec min/max, suffix, font-mono
    │       ├── FormulaBlock.tsx      # Affichage formule monospace + légende variables
    │       ├── InteractiveExample.tsx # Calculateur interactif (inputs → outputs calculés)
    │       ├── GlossaryTooltip.tsx   # Tooltip inline — terme clé → shortDef au survol
    │       └── GlossaryModal.tsx     # Modal glossaire complet — recherche + catégories
    └── utils/
        ├── format.ts                # formatEur(), formatPct()
        ├── exportCSV.ts             # Export résultats en CSV
        └── exportPDF.ts             # Impression navigateur (window.print)
```

## État actuel — Fonctionnalités implémentées

### Simulation
- Multi-simulations indépendantes avec undo/redo (30 niveaux) et persistance localStorage
- Moteur mensuel avec intérêts composés, frais complets (courtage, gestion, garde, entrée)
- 3 scénarios de marché (pessimiste / réaliste / optimiste)
- `isDirty` flag + bouton Refresh manuel — les résultats sont un snapshot figé (`RunState`)
- Plafonds légaux de versements respectés (Livret A 22 950 €, PEA 150 000 €, etc.)
- Versements cumulés en euros constants (Fisher) — `contributionsRealValue`
- Économie fiscale PER calculée annuellement (`perTaxSavings`)
- Dividendes CTO non réinvestis : sortie mensuelle + fiscalité abattement 40%
- **Événements de vie** intégrés dans `runSimulation()` — `buildEnvelopeEffects()` injecte les effets mois par mois

### Événements de vie (engine/lifeEventsEngine.ts)
- 7 types : `pause`, `windfall`, `withdrawal`, `expense_increase`, `child`, `custom`, `salary_increase`
- Chaque événement a : `yearOffset`, `duration?`, `amount?`, `envelopeId?`, `monthlyImpact?`
- `buildEnvelopeEffects()` produit une `Map<globalMonth, EnvelopeEffect>` par enveloppe
- `EnvelopeEffect` = { `contributionMultiplier`, `contributionDelta`, `balanceDelta` }
- Événements globaux (sans `envelopeId`) répartis équitablement entre toutes les enveloppes actives
- Stockés dans `Simulation.events: LifeEvent[]` — persistés dans Zustand

### Bilan net (engine/netWorthEngine.ts)
- `Liability` = dette/crédit avec `remainingAmount`, `monthlyPayment`, `interestRate`, `remainingMonths`
- `liabilityRemainingAt(liability, yearIndex)` — formule PMT exacte, fallback linéaire si taux = 0
- `computeNetWorth(results, liabilities, yearIndex)` → `NetWorthSnapshot`
- `computeNetWorthSeries(results, liabilities)` → tableau annuel pour graphiques
- `NetWorthSnapshot` = { `totalAssets`, `totalLiabilities`, `netWorth`, `debtRatio`, `monthlyDebtBurden` }
- Stockés dans `Simulation.liabilities: Liability[]`
- Onglet **Bilan net** dans le Dashboard → `NetWorthPanel`

### Alertes intelligentes (engine/alertsEngine.ts)
- `generateAlerts(envelopes, results, globalParams, liabilities?)` → `Alert[]` triées par priorité
- 3 niveaux : P1 (warning critique), P2 (opportunité fiscale), P3 (conseil optimisation)
- Règles : Livret A plein, PEA proche plafond, fonds urgence insuffisant, versements incohérents
- Règles fiscales : PEA seuil 5 ans, AV seuil 8 ans, PER sous-utilisé, barème CTO si TMI faible
- Règles dettes : ratio endettement > 50%, mensualités > 35% revenus
- Affiché dans le Dashboard via `SmartAlerts`

### Optimiseur fiscal (engine/taxOptimizer.ts)
- `analyzeTaxOptimization(envelopes, results, globalParams, taxProfile)` → `OptimizationSuggestion[]`
- 4 règles : arbitrage CTO→PEA, maximiser PER si TMI ≥ 30%, timing retraits AV, barème CTO
- `OptimizationSuggestion` = { `taxSaving`, `effort`, `patch?` } — patch applicable directement
- Interface dans `TaxOptimizer.tsx`

### Suivi réel (HistoryPanel)
- `HistoryEntry` = { `id`, `date` (ISO), `envelopeId`, `realValue`, `note?` }
- Saisie manuelle des valeurs réelles des enveloppes à des dates données
- `HistoryPanel` superpose les points réels sur la courbe simulée (LineChart Recharts)
- Stockés dans `Simulation.history: HistoryEntry[]`

### Calculateur inverse (BackwardCalculator)
- Formule PMT inverse : versement mensuel = f(capital cible, capital initial, rendement, durée)
- Formule capital initial = f(cible, rendement, durée)
- Bouton "Appliquer" → `onApply(monthlyAmount)` pour injecter dans les paramètres

### Enveloppes
- 10 types de presets disponibles (via `envelopePresets.ts`)
- Mode versement : montant fixe (€) ou part de l'effort total (%)
- Synchronisation automatique contributions ↔ effort lors du changement de salaire/taux
- Détection incohérence effort ≠ somme versements + bannière d'avertissement
- Rééquilibrage automatique : ajuster la dernière modifiée ou redistribuer proportionnellement
- Fréquence de versement : mensuel / trimestriel / annuel
- Date d'ouverture réelle : durée de détention déjà écoulée prise en compte dans la fiscalité
- Horizon de clôture : arrêt des versements à une année donnée
- Objectif lié : retraite / immobilier / capital
- Valeur actuelle réelle (pour enveloppes existantes déjà valorisées)
- Réinvestissement ou non des dividendes (CTO)
- Modal de sélection du type d'enveloppe avec groupes (livrets / marché)

### Résultats — Dashboard
- Vue globale : AreaChart empilé + impact frais + jalons + tableau détail
- Inflation : valeur réelle vs nominale (Fisher exact)
- Répartition : donut par enveloppe (sélecteur année)
- Retraite : capital nécessaire, runway, graphique accumulation/retrait
- Immobilier : simulateur prêt intégré
- Capital : objectif avec horizon et versement supplémentaire nécessaire
- Sécurité : fonds urgence, couverture passive, score 10 points
- **Bilan net** : actifs vs passifs (dettes) sur la durée — onglet `'bilan_net'`
- Comparaison 3 scénarios superposés (mode compareMode)
- **SmartAlerts** : alertes contextuelles intégrées au dashboard
- **HistoryPanel** : suivi réel vs simulation

### Fiscal
- Module `taxation.ts` séparé — fonctions pures `computeTax()`, `taxPEA()`, `taxCTO()`, `taxAV()`, `taxPER()`
- TMI et déclaration couple configurables dans les paramètres globaux
- PEA : flat tax 30% avant 5 ans, PS 17.2% après
- CTO : barème si TMI ≤ 11%, sinon flat tax 30% — option automatique
- AV : flat tax < 8 ans, taux réduit 24.7% après + abattement 4 600/9 200 €, répartition si versements > 150k€
- PER : TMI sur versements + flat tax 30% sur gains à la sortie en capital
- Livrets réglementés : exonérés
- Dividendes CTO : abattement 40%, taxés annuellement au TMI + PS 17.2%

### Données & glossaire
- Base d'actifs financiers (ETF, crypto, obligations…) avec cotations live Yahoo/CoinGecko
- Base de frais par banque (PEA, CTO, AV, PER) — import direct dans enveloppe
- Cache 1h avec fallback silencieux sur données statiques
- **Onglet "Modèles & Formules"** : 7 sections mathématiques avec formules + calculateurs interactifs
- **Glossaire financier** (`data/glossary.ts`) — `GLOSSARY_TERMS[]`, 5 catégories, `shortDef` pour tooltip + `fullDef` pour modal
- `GlossaryTooltip` — wrapper inline pour les termes clés (survol = shortDef)
- `GlossaryModal` — modal recherchable, navigation par catégorie

### UX / Navigation
- **4 pages** gérées par `currentPage: AppPage` dans `App.tsx` :
  - `'dashboard'` — résultats + alertes + bilan
  - `'envelopes'` — configuration
  - `'optimizer'` — optimiseur Black-Litterman
  - `'data'` — DataModal naviguée comme page pleine (plus de modal flottante pour l'accès principal)
- **Sidebar fixe** `position: fixed; width: 224px` — toujours visible
- **CommandPalette** (Cmd+K) — recherche d'actions, navigation clavier
- **ProfileDropdown** intégré dans App.tsx (WorkspaceSwitch dans la sidebar)
- Point bleu/orange dans l'onglet Enveloppes quand `isDirty`
- Point vert « live » sur l'onglet Banque de données
- Onboarding wizard → création enveloppes adaptées au profil (prudent/équilibré/dynamique)
- Thème sombre, design tokens CSS Linear-inspired, responsive
- Export CSV + impression (PDF navigateur)
- Raccourcis : Ctrl+Z / Ctrl+Y (undo/redo), Cmd+1/2/3 (navigation pages), Cmd+K (palette)
- Toast notifications (3 s) pour les actions utilisateur

### Profils
- Profils stockés dans `patrimoine-profiles` (localStorage)
- Profil actif en sessionStorage — effacé à la fermeture du navigateur
- Données par profil : `patrimoine-data-[profileId]`

## Types centraux (src/types/index.ts)

```ts
type ScenarioType = 'pessimiste' | 'realiste' | 'optimiste'

type EconomicRegime = 'expansion' | 'overheat' | 'recession' | 'crisis'

type AssetClass = 'equity' | 'bonds' | 'real_estate' | 'money_market' | 'crypto' | 'regulated'

type EnvelopeType = 'livret_a' | 'ldds' | 'pea' | 'cto' | 'assurance_vie' | 'per' | 'livret_jeune'

type GoalType = 'retraite' | 'immobilier' | 'capital'

type LiabilityType = 'mortgage' | 'car_loan' | 'consumer_credit' | 'student_loan' | 'other'

type LifeEventType = 'pause' | 'windfall' | 'withdrawal' | 'expense_increase' | 'child' | 'custom'
// Note : 'salary_increase' existe dans lifeEventsEngine.ts mais n'est pas dans LifeEventType (cast local)

interface TaxProfile {
  tmi: number          // Tranche marginale 0–45%
  isCouple: boolean
  avAbattement: number // 4 600 ou 9 200
}

interface Asset {
  id: string; name: string
  expectedReturn: number  // % annuel nominal
  allocation: number      // % de l'enveloppe, somme = 100
}

interface EnvelopeFees {
  orderFees: number; orderFeesMin: number; custodyFees: number
  entryFees: number; managementFees: number; exitFees: number
}

interface Liability {
  id: string; label: string; type: LiabilityType
  totalAmount: number; remainingAmount: number
  monthlyPayment: number; interestRate: number; remainingMonths: number
  linkedGoal?: GoalType; autoDeduct?: boolean; active?: boolean
}

interface NetWorthSnapshot {
  totalAssets: number; totalLiabilities: number; netWorth: number
  debtRatio: number; monthlyDebtBurden: number
}

interface HistoryEntry {
  id: string; date: string  // ISO YYYY-MM-DD
  envelopeId: string; realValue: number; note?: string
}

interface LifeEvent {
  id: string; type: LifeEventType; label: string
  yearOffset: number        // dans combien d'années depuis le départ
  duration?: number         // années (pause, expense_increase, child, custom)
  amount?: number           // € (windfall, withdrawal, salary_increase)
  envelopeId?: string       // null = toutes les enveloppes
  monthlyImpact?: number    // €/mois (expense_increase, child, custom)
}

interface Envelope {
  id: string; type: EnvelopeType; label: string
  initialCapital: number; monthlyContribution: number; yearlyContribution: number
  assets: Asset[]; taxRate: number; fees?: EnvelopeFees; active: boolean
  maxContribution?: number; dividendRate?: number
  contributionMode?: 'euros' | 'percent'; contributionPercent?: number
  openedAt?: string | null; closureHorizon?: number | null
  linkedGoal?: GoalType | null; currentRealValue?: number | null
  contributionFrequency?: 'monthly' | 'quarterly' | 'annual'
  reinvestDividends?: boolean; estimatedMonthlyDividends?: number
}

interface GlobalParams {
  duration: number; inflationRate: number
  monthlyIncome: number; investmentRate: number; ageActuel: number
  tmi?: number; isCouple?: boolean
  inflationScenario?: 'custom' | 'low' | 'medium' | 'high'
  simulationMode?: 'standard' | 'advanced'
  initialRegime?: EconomicRegime | null
  riskTolerance?: 'prudent' | 'balanced' | 'dynamic'
}

interface SimulationResult {
  year: number
  byEnvelope: Record<string, EnvelopeResult>
  totalNominal: number; totalReal: number
  totalContributed: number; totalGains: number; totalFeesPaid: number
  inflationImpact: InflationImpact
  perTaxSavings: number; cappedEnvelopes: string[]
  taxByEnvelope: Record<string, number>
  monteCarloResults?: MonteCarloResult[]
}

interface RetirementParams {
  ageRetirement: number; monthlyExpenses: number; pensionMonthly: number
  withdrawalRate: number; lifeExpectancy: number
}
```

## Store Zustand (src/store/useStore.ts)

`Simulation` contient maintenant :
```ts
interface Simulation {
  id: string; name: string
  envelopes: Envelope[]; globalParams: GlobalParams; retirementParams: RetirementParams
  past: UndoEntry[]; future: UndoEntry[]
  isDirty: boolean; lastModifiedEnvelopeId: string | null
  history: HistoryEntry[]    // suivi valeurs réelles
  events: LifeEvent[]        // événements de vie
  liabilities: Liability[]   // passifs financiers
}
```

Actions supplémentaires dans le store :
- `addHistoryEntry(entry)` / `removeHistoryEntry(id)` — suivi réel
- `addLifeEvent(event)` / `removeLifeEvent(id)` / `updateLifeEvent(id, patch)` — événements de vie
- `addLiability(liability)` / `updateLiability(id, patch)` / `removeLiability(id)` — passifs

## Moteur de calcul

Sept fichiers purs dans `src/engine/` (zéro import React) :

### simulation.ts
- Point d'entrée : `runSimulation(envelopes, params, events)` — **3 arguments** (events est nouveau)
- Itération **mensuelle** pour précision des intérêts composés
- `solde = (solde + versement_net) * (1 + r/12)`
- Résout l'inflation via `resolveInflationRate()` (scénarios prédéfinis ou valeur custom)
- Construit le `TaxProfile` depuis `params.tmi` et `params.isCouple`
- Appelle `buildEnvelopeEffects()` pour injecter les effets des événements de vie mois par mois
- Plafonds légaux : `DEFAULT_MAX_CONTRIBUTIONS` ou `envelope.maxContribution`
- Frais mensuels (courtage, entrée) et annuels (gestion, garde) en décembre
- Dividendes CTO taxés en décembre via `taxCTODividend()`
- Fiscalité à la sortie via `computeTax()` (module `taxation.ts`)
- Valeur réelle via `presentValue()` (module `inflation.ts`)
- **`ZERO_FEES` est exporté depuis ce fichier** — ne pas le redéfinir ailleurs

### lifeEventsEngine.ts
- `buildEnvelopeEffects(events, envelopeId, durationYears, numActiveEnvs, income, rate)` → `Map<number, EnvelopeEffect>`
- `EnvelopeEffect` = { `contributionMultiplier: 0|1`, `contributionDelta: number`, `balanceDelta: number` }
- `globalMonth = (year-1)*12 + month` (1-indexed depuis le départ de la simulation)
- Événements sans `envelopeId` → répartis équitablement entre `numActiveEnvs` enveloppes

### netWorthEngine.ts
- `liabilityRemainingAt(liability, yearIndex)` — capital restant (formule PMT ou linéaire si taux = 0)
- `liabilityInterestCost(liability, yearIndex)` — intérêts restants à payer
- `computeNetWorth(simulationResults, liabilities, yearIndex)` → `NetWorthSnapshot`
- `computeNetWorthSeries(simulationResults, liabilities)` → `NetWorthSnapshot[]`

### alertsEngine.ts
- `generateAlerts(envelopes, results, globalParams, liabilities?)` → `Alert[]`
- `Alert` = { `id`, `type: 'warning'|'tip'|'success'|'info'`, `priority: 1|2|3`, `title`, `message`, `actionLabel?`, `actionTarget?` }
- Résultats triés par priorité croissante (P1 en premier)

### taxOptimizer.ts
- `analyzeTaxOptimization(envelopes, results, globalParams, taxProfile)` → `OptimizationSuggestion[]`
- `OptimizationSuggestion` = { `type: 'reallocation'|'new_envelope'|'timing'`, `taxSaving`, `effort: 'low'|'medium'|'high'`, `patch?: { envelopeId, monthlyContribution }` }
- Triées par `taxSaving` décroissant

### taxation.ts
- `computeTax(envelope, gain, contributed, capital, yearsHeld, taxProfile)` — point d'entrée
- `taxPEA(gain, yearsHeld)`, `taxCTO(gain, taxProfile)`, `taxAV(...)`, `taxPER(...)`
- `taxCTODividend(dividends, tmi)` — abattement 40%
- `PS_RATE = 0.172` exporté — **source unique, importer depuis ici**

### inflation.ts
- `realReturn(nominal, inflation)` — formule de Fisher exacte
- `presentValue(futureAmount, inflation, years)`
- `resolveInflationRate(scenario, customRate)`
- `INFLATION_SCENARIOS = { low: 1.5, medium: 2.5, high: 4.0 }`

### markovEngine.ts
- `sampleNextRegime(regime, rng)` — tirage selon `TRANSITION_MATRIX`
- `sampleNormal(mean, std, rng)` — Box-Muller (RNG déterministe mulberry32)
- `runSingleTrajectory(envelopes, params, duration, transitionYear, seed)` — trajectoire unique
- `runMonteCarlo(envelopes, params, duration, n?, onProgress?)` → `Promise<MonteCarloOutput>`
  - Chunks de 50 trajectoires + `setTimeout(0)` pour ne pas bloquer le thread UI
  - Activé si `globalParams.simulationMode === 'advanced'`

### portfolioOptimizer.ts
- `buildCovarianceMatrix(assets, regime)`, `computeImpliedReturns()`, `applyBlackLitterman()`
- `computeCVaR(weights, trajectories, alpha?)` — CVaR 95%
- `optimizePortfolio(...)` — gradient descent projeté 500 iter
- `assetLocationOptimizer(...)` → `LocationSuggestion[]`
- **Importer `PS_RATE` depuis `taxation.ts`**, ne pas redéfinir

### Mode avancé (Monte-Carlo) — flux
1. Toggle [Standard] | [Monte-Carlo] dans `GlobalParamsBand`
2. `handleRunSimulation()` dans `App.tsx` : si `simulationMode === 'advanced'`, appelle `runMonteCarlo()` async
3. `RunState.monteCarloResults?` stocke le `MonteCarloResult[]`
4. `PatrimoineChart` passe en mode bandes P10/P50/P90 si `monteCarloResults` non vide

## Architecture RunState (résultats)

```ts
interface RunState {
  envelopes: Envelope[]
  globalParams: GlobalParams
  events: LifeEvent[]        // transmis à runSimulation()
  results: SimulationResult[]
  monteCarloResults?: MonteCarloResult[]
}
```

Les résultats de simulation ne sont **pas** recalculés en continu. Le flux est :
1. L'utilisateur modifie une enveloppe → `isDirty` passe à `true` (point dans la nav)
2. L'utilisateur clique "Lancer la simulation" → `handleRunSimulation()` dans `App.tsx`
3. `runSimulation(envelopes, globalParams, events)` est appelé → `runState` mis à jour
4. `isDirty` repasse à `false`
5. Le bouton n'est actif que si `isContributionCoherent()` retourne `true`
6. Auto-run une fois par changement de `activeSim.id` (switch de simulation)

## Navigation (AppPage)

```ts
type AppPage = 'dashboard' | 'envelopes' | 'optimizer' | 'data'
```

- **`'dashboard'`** → `DashboardPage` — résultats, 7 onglets, alertes, bilan
- **`'envelopes'`** → `EnvelopesPage` — config enveloppes + paramètres globaux
- **`'optimizer'`** → `PortfolioOptimizer` — optimisation Black-Litterman/CVaR
- **`'data'`** → `DataModal` rendu comme page (sans overlay) — actifs, banques, modèles

**CommandPalette (Cmd+K)** : navigation clavier, lancer simulation, ouvrir banque de données, onboarding.

**Raccourcis clavier** :
- `Cmd+K` — ouvrir la palette de commandes
- `Cmd+Z` / `Cmd+Y` — undo/redo
- `Cmd+1/2/3` — navigation Dashboard/Enveloppes/Optimiseur
- `G D` / `G E` / `G O` — navigation via CommandPalette

## Dashboard — Onglets (`ChartTab`)

```ts
type ChartTab = 'projection' | 'inflation' | 'retraite' | 'immobilier' | 'capital' | 'securite' | 'bilan_net'
```

| Onglet | Composant | Contenu |
|--------|-----------|---------|
| Projection | PatrimoineChart | AreaChart empilé enveloppes |
| Inflation | InflationChart | Nominal vs réel |
| Retraite | RetirementPanel + RetirementDualChart | Capital nécessaire, runway |
| Immobilier | RealEstatePanel | Simulateur prêt |
| Capital | CapitalPanel | Objectif + horizon |
| Sécurité | SecurityPanel | Fonds urgence, score |
| Bilan net | NetWorthPanel | Actifs vs dettes |

## Presets enveloppes (src/data/envelopePresets.ts)

| Preset | Type TS mappé | Plafond | Fiscalité |
|--------|--------------|---------|-----------|
| livret_a | livret_a | 22 950 € | Exonéré |
| ldds | ldds | 12 000 € | Exonéré |
| lep | livret_a | 10 000 € | Exonéré |
| livret_jeune | livret_jeune | 1 600 € | Exonéré |
| pel | cto | 61 200 € | Flat 30% |
| pea | pea | 150 000 € | PS 17.2% (>5 ans) |
| pea_pme | pea | 225 000 € | PS 17.2% (>5 ans) |
| cto | cto | Illimité | Flat 30% ou barème |
| assurance_vie | assurance_vie | Illimité | Réduit après 8 ans |
| per | per | Illimité | TMI sortie |

`EnvelopeType` TS = 7 valeurs — `lep`, `pel`, `pea_pme` mappés vers le type le plus proche.

## Constantes importantes

| Constante | Fichier | Valeur |
|-----------|---------|--------|
| `ZERO_FEES` | `engine/simulation.ts` | Frais nuls (source unique) |
| `DEFAULT_RETIREMENT_PARAMS` | `store/useStore.ts` | Params retraite par défaut |
| `MAX_HISTORY_SIZE` | `store/useStore.ts` | 30 niveaux undo/redo |
| `MAX_RUNWAY_MONTHS` | `engine/retirement.ts` | 200 ans (garde-fou boucle) |
| `ALLOCATION_EPSILON` | `inputs/EnvelopeCard` + `AllocationRow` | 0.01 (tolérance 100%) |
| `FETCH_TIMEOUT_MS` | `services/marketDataService.ts` | 8 000ms |
| `CACHE_TTL_MS` | `services/marketDataService.ts` | 3 600 000ms (1h) |
| `INFLATION_SCENARIOS` | `engine/inflation.ts` | low:1.5 / medium:2.5 / high:4.0 |
| `PS_RATE` | `engine/taxation.ts` | 0.172 (source unique) |
| `SIMULATION_AFFECTING_KEYS` | `store/useStore.ts` | Champs déclenchant `isDirty` |
| `GLOSSARY_TERMS` | `data/glossary.ts` | Termes financiers (5 catégories) |

## Design system (Linear-inspired — juin 2026)

Tokens CSS dans `src/index.css` :
- `--canvas: #010102` (noir quasi-absolu)
- `--primary: #5e6ad2` (lavender-blue)
- `--primary-hover: #828fff`
- `--success: #4cb782`, `--danger: #eb5757`
- `--panel-w: 384px`, `--sidebar-w: 224px`
- Fonts : Geist + Geist Mono (Google Fonts)
- Régimes : `--c-expansion`, `--c-overheat`, `--c-recession`, `--c-crisis`

Bridge Tailwind (`@theme` block) : mappe les anciens tokens (bg-elevated, text-foreground, etc.) pour ne pas casser les composants legacy.

**Règle** : toujours utiliser les classes CSS (`.btn`, `.panel`, `.kpi`, `.nav-item`, `.cmd-row`…) plutôt que les utilitaires Tailwind couleur. Les couleurs viennent des vars CSS.

## Système de profils
- Profils : `patrimoine-profiles` (localStorage)
- Profil actif : `patrimoine-active-profile` (sessionStorage) — effacé à la fermeture
- Données par profil : `patrimoine-data-[profileId]` (localStorage)
- Changement de profil = `setActiveProfile(id)` + `window.location.reload()`
- Onboarding marqué via `profile.onboarded`

## Commandes utiles
```bash
npm run dev              # dev server localhost:5173
npm run build            # build prod dans dist/
npm run preview          # aperçu du build prod
npm run electron:dev     # Vite + Electron en parallèle (HMR actif)
npm run electron:build   # build prod → installeur NSIS dans dist-electron/
```

## Packaging Electron
- **Point d'entrée** : `electron/main.js` (CommonJS, pas de bundling)
- **Mode dev** : `NODE_ENV=development` → `win.loadURL('http://localhost:5173')` + DevTools
- **Mode prod** : `win.loadFile('dist/index.html')` — nécessite `base: './'` dans vite.config.ts
- **Output** : `dist-electron/` (NSIS Windows, DMG Mac, AppImage Linux)
- **`"type": "module"`** dans package.json — `electron/main.js` reste en CommonJS (`require()`)

## Ce que Claude Code NE doit PAS faire
- Pas de fetch/API externe (sauf `marketDataService` existant)
- Pas de router (single page, 4 pages gérées par `currentPage` state dans `App.tsx`)
- Pas d'authentification
- Pas de tests (hors scope)
- Ne pas recréer les fichiers de config existants
- Ne pas redéfinir `ZERO_FEES` (source : `engine/simulation.ts`) ni `DEFAULT_RETIREMENT_PARAMS` (source : `store/useStore.ts`) localement
- Ne pas redéfinir `PS_RATE` ailleurs que dans `engine/taxation.ts`
- Ne pas recalculer les résultats dans un `useEffect` — utiliser le pattern `RunState` / bouton Refresh
- Ne pas oublier le 3ème argument `events` dans les appels à `runSimulation()`
