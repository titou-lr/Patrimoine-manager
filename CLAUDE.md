# CLAUDE.md — Simulateur de Patrimoine

## Projet
App web locale (pas de backend) pour simuler l'évolution d'un patrimoine financier multi-enveloppes sur le long terme. Développement en VS Code.
Repo Git : `git@github.com:titou-lr/Patrimoine-manager.git`

## Stack
- **React 19** + **Vite 8** (bundler rapide, HMR)
- **TypeScript ~6.0** (typage strict)
- **Tailwind CSS v4** (styling utility-first, design tokens custom)
- **Recharts 3** (graphiques)
- **KaTeX 0.17** (rendu de formules mathématiques LaTeX — page Modèles & Formules)
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
    ├── App.tsx                  # Racine — sidebar fixe, navigation 8 pages, RunState, modales, TourController
    ├── profiles/
    │   └── profileService.ts    # CRUD profils localStorage — getProfiles(), getStoreKey()
    ├── store/
    │   ├── useStore.ts          # Zustand persist — clé dynamique par profil, simulations[], undo/redo
    │   └── useCustomBanks.ts    # Courtiers personnalisés — CRUD + persist par profil (patrimoine-custom-banks-[profileId])
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
    │   │   ├── DashboardPage.tsx    # Page résultats — KPIs, 8 onglets graphiques, SmartAlerts, HistoryPanel
    │   │   ├── EnvelopesPage.tsx    # Page config enveloppes — grille + chips params + bouton Run
    │   │   ├── BrokersPage.tsx      # Page Courtiers — comparateur enrichi, wrapper autour de BanksTab
    │   │   └── ModelsReferencePage.tsx # Page Modèles — 8 sections mathématiques avec rendu KaTeX
    │   ├── profiles/
    │   │   ├── ProfileScreen.tsx     # Écran sélection profil (Netflix-style)
    │   │   └── CreateProfileModal.tsx # Modal création profil 2 étapes
    │   ├── inputs/
    │   │   ├── EnvelopeCard.tsx      # Carte enveloppe pliable — orchestre les sections ci-dessous
    │   │   ├── EnvelopeMetaSection.tsx     # Métadonnées — label, date ouverture, horizon, objectif
    │   │   ├── EnvelopeProjectionSection.tsx # Versements — montant, fréquence, mode euros/%, dividendes
    │   │   ├── EnvelopeAssetsFees.tsx      # Actifs + frais — tableau actifs, import frais banque
    │   │   ├── EnvelopeTaxInfo.tsx         # Infobande fiscale résumée par enveloppe
    │   │   ├── EnvelopeTypeSelector.tsx    # Modal choix type enveloppe (grilles par groupe)
    │   │   ├── AllocationRow.tsx      # Ligne actif (nom, rendement, allocation %)
    │   │   └── CapOverflowModal.tsx   # Modal plafond légal atteint — choix arrêt ou redirection surplus vers autre enveloppe
    │   ├── results/
    │   │   ├── PatrimoineChart.tsx   # AreaChart empilé par enveloppe + ligne réelle
    │   │   ├── InflationChart.tsx    # AreaChart valeur réelle + érosion inflation
    │   │   ├── AllocationPieChart.tsx # Donut répartition par enveloppe (sélecteur année) + légende liste — sans texte Recharts interne, sans panel classe d'actifs
    │   │   ├── FeesImpactChart.tsx   # AreaChart avec/sans frais — impact cumulé (onglet fees)
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
    │   │   └── TaxOptimizer.tsx      # Interface optimiseur fiscal — suggestions classées par économie
    │   ├── alerts/
    │   │   └── SmartAlerts.tsx       # Panel alertes — liste prioritisée (P1 warnings, P2 tips, P3 infos)
    │   ├── data/
    │   │   ├── DataModal.tsx         # Modal banque de données (onglet actifs uniquement)
    │   │   ├── AssetsTab.tsx         # Tableau actifs avec filtres, tri, import
    │   │   ├── BanksTab.tsx          # Liste courtiers/banques — filtres, comparaison, courtiers perso
    │   │   ├── BankCard.tsx          # Carte courtier — frais par enveloppe, badge perso, édition inline
    │   │   ├── BankCompareOverlay.tsx # Modal comparatif frais multi-courtiers
    │   │   └── AddBankModal.tsx      # Formulaire création/édition d'un courtier personnalisé
    │   ├── optimizer/
    │   │   └── PortfolioOptimizer.tsx # Page Optimiseur — Black-Litterman, Monte-Carlo, suggestions
    │   ├── onboarding/
    │   │   └── OnboardingModal.tsx   # Wizard 6 étapes (profil, objectif, épargne…)
    │   └── ui/
    │       ├── NumberInput.tsx       # Input numérique avec min/max, suffix, font-mono
    │       ├── FormulaBlock.tsx      # Affichage formule monospace + légende variables
    │       ├── InteractiveExample.tsx # Calculateur interactif (inputs → outputs calculés)
    │       ├── KatexFormula.tsx      # Rendu LaTeX via KaTeX — props: children (LaTeX string), block, className
    │       ├── GlossaryTooltip.tsx   # Tooltip inline — terme clé → shortDef au survol
    │       └── GlossaryModal.tsx     # Modal glossaire complet — recherche + catégories
    ├── finance/                     # Module Finance autonome — voir section ## Finance
    │   ├── types/finance.ts
    │   ├── store/useFinanceStore.ts
    │   ├── data/financeAssets.ts
    │   ├── services/               # priceService, indicatorsService, alertsService
    │   ├── engine/                 # tradingEngine, backtestEngine, predictionEngine, strategies/
    │   └── components/             # FinancePage + 6 sous-onglets
    ├── education/                   # Module Éducation autonome — voir section ## Éducation
    │   ├── store/useEducationStore.ts # Progression par profil — clé patrimoine-education-[profileId]
    │   ├── data/
    │   │   ├── modules.ts           # EDUCATION_MODULES[] — 7 modules (EducationModule, Lesson, Exercise)
    │   │   ├── marketAnnotations.ts # Annotations graphiques pour les leçons marchés
    │   │   └── patrimcorpData.ts    # Données fictives PatrimCorp pour l'exercice M-E1
    │   └── components/
    │       ├── EducationPage.tsx    # Racine — catalogue → module → leçon → exercice
    │       └── lessons/             # 29 composants de leçons (Lesson1Inflation, LessonA1AssetClasses…)
    │           ├── LessonShell.tsx  # Shell partagé (header, barre progression, nav)
    │           ├── QuizScreen.tsx   # Composant QCM réutilisable
    │           ├── markets/         # Composants graphiques éducatifs (EduCandleChart, EduIndicatorPanel)
    │           └── Lesson*.tsx      # Contenu leçon (F/A/E/S/M/P/T series)
    ├── tour/                        # Système de visite guidée Spotlight
    │   ├── store/useTourStore.ts    # État tour par profil — clé patrimoine-tour-[profileId]
    │   ├── steps/                   # Étapes par page : simulationSteps, financeSteps, educationSteps, brokersSteps, modelsSteps
    │   └── components/
    │       ├── TourController.tsx   # Orchestrateur — navigation automatique + détection d'actions utilisateur
    │       ├── SpotlightOverlay.tsx # Overlay visuel — scrim rgba(1,1,2,0.82) + bulle positionnée sur [data-tour-id]
    │       └── WelcomeForm.tsx      # Formulaire de bienvenue (prénom, âge) déclenché avant le tour
    └── utils/
        ├── format.ts                # formatEur(), formatPct()
        └── exportCSV.ts             # Export résultats en CSV
```

## État actuel — Fonctionnalités implémentées

### Simulation
- Multi-simulations indépendantes avec undo/redo (30 niveaux) et persistance localStorage
- Moteur mensuel avec intérêts composés, frais complets (courtage, gestion, garde, entrée)
- 3 scénarios de marché (pessimiste / réaliste / optimiste)
- `isDirty` flag + bouton Refresh manuel — les résultats sont un snapshot figé (`RunState`)
- Plafonds légaux de versements respectés via `ENVELOPE_CAPS` (défini dans `engine/simulation.ts`) : Livret A 22 950 €, LDDS 12 000 €, Livret Jeune 1 600 €, PEA 150 000 €
- Redirection des surplus de versements au-delà du plafond : `Envelope.capRedirectTo` (ID d'une autre enveloppe cible) — géré en 2 passes dans `runSimulation()`. `CapOverflowModal` permet à l'utilisateur de configurer ces redirections après simulation.
- `EnvelopeResult.capReachedYear` (0-based) : année où le plafond a été atteint pour la première fois
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
- Vue globale : AreaChart empilé par enveloppe + ligne valeur réelle
- Impact frais : graphique avec/sans frais, économie potentielle — onglet `'fees'`
- Inflation : valeur réelle vs nominale (Fisher exact)
- Répartition : donut par enveloppe avec légende liste (pas de donut par classe d'actifs)
- Retraite : capital nécessaire, runway, graphique accumulation/retrait
- Immobilier : simulateur prêt intégré
- Capital : objectif avec horizon et versement supplémentaire nécessaire
- Sécurité : fonds urgence, couverture passive, score 10 points
- **Bilan net** : actifs vs passifs (dettes) sur la durée — onglet `'bilan_net'`
- **SmartAlerts** : alertes contextuelles intégrées au dashboard
- **HistoryPanel** : suivi réel vs simulation (drawer)

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
- Base de frais par courtier/banque (PEA, CTO, AV, PER) — import direct dans enveloppe
- Cache 1h avec fallback silencieux sur données statiques
- **Glossaire financier** (`data/glossary.ts`) — `GLOSSARY_TERMS[]`, 5 catégories, `shortDef` pour tooltip + `fullDef` pour modal
- `GlossaryTooltip` — wrapper inline pour les termes clés (survol = shortDef)
- `GlossaryModal` — modal recherchable, navigation par catégorie

### Page Courtiers (src/components/pages/BrokersPage.tsx)
- Page dédiée au comparateur de courtiers/banques — remplace l'ancien onglet "Banques" du DataModal
- Wrapper autour de `BanksTab` avec un header descriptif et attribut `data-tour-id` pour le tour
- `BanksTab` supporte désormais : filtrage par type, mode sélection (max 3 pour comparaison), import de frais dans une enveloppe active, ajout/édition/suppression de courtiers personnalisés
- `AddBankModal` : formulaire complet — nom, type (courtier/banque-en-ligne/banque-traditionnelle), note /5, pros/cons, frais par enveloppe (PEA, CTO, AV, PER, Livret A/LDDS)
- **Store** : `useCustomBanks` — courtiers perso stockés sous `patrimoine-custom-banks-[profileId]`, fusionnés avec `banks.json` statique à l'affichage

### Page Modèles & Formules (src/components/pages/ModelsReferencePage.tsx)
- Page dédiée à la référence mathématique exhaustive de tous les calculs de l'app
- Navigation latérale fixe (192px) avec 8 sections numérotées :
  1. Simulation & Épargne (intérêts composés, rendements pondérés, inflation Fisher)
  2. Fiscalité française (PEA, CTO, Assurance-Vie, PER)
  3. Retraite & Revenus passifs (règle des 4%, simulation retrait)
  4. Crédit & Bilan net (formule PMT, amortissement)
  5. Indicateurs techniques (SMA, EMA, RSI, MACD, Bollinger, ATR, OBV)
  6. Monte-Carlo & Markov (GBM, Box-Muller, matrice de transition)
  7. Black-Litterman & CVaR (optimisation portefeuille)
  8. Métriques de backtest (drawdown, Sharpe, win rate, profit factor)
- Formules rendues avec `KatexFormula` (LaTeX) et calculateurs interactifs via `InteractiveExample`

### Module Éducation (src/education/)

- **7 modules séquentiels** déverrouillés progressivement (compléter un module débloque le suivant) :
  1. **Fondamentaux** — Inflation, intérêts composés, risque/rendement, profil investisseur (4 leçons)
  2. **Allocation d'actifs** — Classes d'actifs, diversification, allocation selon l'âge, rééquilibrage (4 leçons)
  3. **Enveloppes fiscales** — PEA, Assurance-vie, PER, CTO (4 leçons)
  4. **Sélectionner ses investissements** — ETF, Obligations, SCPI, Crypto (4 leçons)
  5. **Lire et analyser un marché** — Chandeliers, tendances/S/R, RSI, MACD, Bollinger/ATR, stratégie live (6 leçons)
  6. **Gérer son portefeuille dans le temps** — DCA, drawdown, TWR/MWR, biais cognitifs, discipline (5 leçons)
  7. **Optimiser sa fiscalité** — PFU, tax-loss harvesting, succession, transmission (4 leçons)
- Total : 29 leçons + 10 exercices (QCM, simulateurs interactifs, exercice pratique sur PatrimCorp)
- **EducationPage** : catalogue → vue module → vue leçon → exercice ; écran de complétion global après les 7 modules
- **LessonShell** : shell partagé (header, barre de progression, boutons Précédent/Suivant)
- **QuizScreen** : composant QCM réutilisable avec correction immédiate
- **Leçons marchés** : `EduCandleChart` + `EduIndicatorPanel` — graphiques interactifs spécialement adaptés à l'éducation
- **useEducationStore** : Zustand persist — `moduleProgress: Record<moduleId, ModuleProgress>`, clé `patrimoine-education-[profileId]`
  - `completeLesson(moduleId, lessonId)` et `completeExercise(moduleId, exerciseId)` déclenchent le déverrouillage automatique
  - `resetProgress()` — réinitialisation irréversible

### Visite guidée Spotlight (src/tour/)

- **WelcomeForm** : formulaire de bienvenue (prénom, âge) — affiché une seule fois, déclenche le tour de simulation
- **TourController** : orchestrateur monté dans `App.tsx` — gère la navigation automatique vers la page cible et la détection d'actions utilisateur (ex. clic "Lancer la simulation")
- **SpotlightOverlay** : overlay visuel — scrim `rgba(1,1,2,0.82)` + bulle de 340px positionnée sur l'élément `[data-tour-id]`
  - Retry jusqu'à 25× (120ms) si l'élément n'est pas encore monté
  - Scroll smooth si la cible est hors écran
  - Positionnement intelligent : en-dessous (préféré), au-dessus (fallback), flottant si aucun espace
- **Deux phases** de tour :
  1. **Tour simulation** (`simulationSteps`) — couvre : sidebar, enveloppes, bouton Run, dashboard, optimiseur
  2. **Tours pages transverses** — Finance, Éducation, Courtiers, Modèles (déclenchés à la première visite de chaque page)
- **useTourStore** : Zustand persist par profil — clé `patrimoine-tour-[profileId]`
  - `formCompleted`, `simTourActive/Step/Done`, `pageToursStep/Done`
  - Actions : `completeForm`, `setSimStep`, `finishSimTour`, `dismissSimTour`, `restartSimTour`, `setPageStep`
- Intégration via `data-tour-id` attributs sur les éléments cibles (présents dans les composants concernés)

### UX / Navigation
- **8 pages** gérées par `currentPage: AppPage` dans `App.tsx`, avec deux niveaux visuels dans la sidebar :
  - **Pages transverses** (haut de sidebar, toujours accessibles) : `'finance'`, `'education'`, `'brokers'`, `'models'`
  - **Pages simulation** (bloc sous la simulation active) : `'dashboard'`, `'envelopes'`, `'optimizer'`
  - `'data'` — DataModal réduit à l'onglet actifs (conservé pour compatibilité)
- **Sidebar fixe** `position: fixed; width: 224px` — toujours visible, deux sections distinctes (transverse / simulation)
- **CommandPalette** (Cmd+K) — recherche d'actions, navigation clavier
- **ProfileDropdown** intégré dans App.tsx (WorkspaceSwitch dans la sidebar)
- **TourController** monté au niveau App — orchestrateur du tour guidé Spotlight
- Point bleu/orange dans l'onglet Enveloppes quand `isDirty`
- Onboarding wizard → création enveloppes adaptées au profil (prudent/équilibré/dynamique)
- **Onboarding Spotlight** → visite guidée interactive pour les nouveaux utilisateurs (WelcomeForm → TourController)
- Thème sombre, design tokens CSS Linear-inspired, responsive
- Export CSV + impression (PDF navigateur)
- Raccourcis : `Ctrl+Z` / `Ctrl+Y` (undo/redo), `Cmd+1/2/3` (Dashboard/Enveloppes/Optimiseur), `Cmd+4/5/6/7` (Finance/Éducation/Courtiers/Modèles), `Cmd+K` (palette)
- Raccourcis palette : `G D/E/O/F/U/B/M` — navigation vers chaque page
- Toast notifications (3 s) pour les actions utilisateur

### Profils
- Profils stockés dans `patrimoine-profiles` (localStorage)
- Profil actif en sessionStorage — effacé à la fermeture du navigateur
- Données par profil : `patrimoine-data-[profileId]`

**Clés localStorage supplémentaires par profil** :
- `patrimoine-finance` — store Finance (non profileé, commun)
- `patrimoine-education-[profileId]` — progression éducation (useEducationStore)
- `patrimoine-tour-[profileId]` — état visite guidée (useTourStore)
- `patrimoine-custom-banks-[profileId]` — courtiers personnalisés (useCustomBanks)

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
  capRedirectTo?: string    // ID de l'enveloppe cible pour les versements excédentaires quand le plafond est atteint
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

interface EnvelopeResult {
  capital: number; totalContributed: number
  grossGains: number; tax: number; totalGains: number
  realValue: number; totalFeesPaid: number
  capped?: boolean              // plafond de versement atteint
  capReachedYear?: number       // année 0-based où le plafond a été atteint pour la 1ère fois
  perTaxSavings?: number; contributionsRealValue?: number
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
- Plafonds légaux : `ENVELOPE_CAPS` (source unique, exporté depuis ce fichier) ou `envelope.maxContribution`
- **Logique 2-passes pour la redirection de surplus** :
  1. Passe 1 : simuler toutes les enveloppes, collecter le `surplusPerMonth` des enveloppes plafonnées qui ont un `capRedirectTo`
  2. Passe 2 : ré-simuler les enveloppes cibles avec les contributions extra (`extraContribsByTarget`) injectées mois par mois
- `capReachedYear` (0-based) stocké dans `EnvelopeResult` — lu par `App.tsx` pour déclencher `CapOverflowModal`
- Frais mensuels (courtage, entrée) et annuels (gestion, garde) en décembre
- Dividendes CTO taxés en décembre via `taxCTODividend()`
- Fiscalité à la sortie via `computeTax()` (module `taxation.ts`)
- Valeur réelle via `presentValue()` (module `inflation.ts`)
- **`ZERO_FEES` et `ENVELOPE_CAPS` sont exportés depuis ce fichier** — ne pas les redéfinir ailleurs

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
1. Toggle [Standard] | [Monte-Carlo] dans le chip de mode d'`EnvelopesPage`
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
2. L'utilisateur clique "Lancer la simulation" → `handleRunSimulation(capDismissed?)` dans `App.tsx`
3. `runSimulation(envelopes, globalParams, events)` est appelé → `runState` mis à jour
4. Si des enveloppes ont atteint leur plafond et que `capDismissed = false` → `CapOverflowModal` s'ouvre
5. L'utilisateur configure les redirections → `handleCapModalApply(choices)` met à jour `capRedirectTo` dans le store et rappelle `handleRunSimulation(true)`
6. `isDirty` repasse à `false`
7. Le bouton n'est actif que si `isContributionCoherent()` retourne `true`
8. Auto-run une fois par changement de `activeSim.id` (switch de simulation)

**States App.tsx liés aux plafonds** :
- `capModalOpen: boolean` — contrôle l'affichage de `CapOverflowModal`
- `capModalDismissed: boolean` — `true` après fermeture sans appliquer (évite de rouvrir la modal à chaque re-run)
- `capReachedByEnvelope: Record<string, number>` — map `envelopeId → capReachedYear` issue de la dernière simulation

## Navigation (AppPage)

```ts
type AppPage = 'dashboard' | 'envelopes' | 'optimizer' | 'data' | 'finance' | 'education' | 'brokers' | 'models'
```

**Pages transverses** (sidebar haut, toujours accessibles) :
- **`'finance'`** → `FinancePage` — marchés temps réel, trading paper, backtest, IA (Cmd+4 / G F)
- **`'education'`** → `EducationPage` — 7 modules de cours interactifs (Cmd+5 / G U)
- **`'brokers'`** → `BrokersPage` — comparateur de courtiers, import de frais (Cmd+6 / G B)
- **`'models'`** → `ModelsReferencePage` — référence mathématique complète avec KaTeX (Cmd+7 / G M)

**Pages simulation** (sidebar bas, sous la simulation active) :
- **`'dashboard'`** → `DashboardPage` — résultats, 8 onglets, alertes, bilan
- **`'envelopes'`** → `EnvelopesPage` — config enveloppes + paramètres globaux
- **`'optimizer'`** → `PortfolioOptimizer` — optimisation Black-Litterman/CVaR

**CommandPalette (Cmd+K)** : navigation clavier, lancer simulation, onboarding.

**Raccourcis clavier** :
- `Cmd+K` — ouvrir la palette de commandes
- `Cmd+Z` / `Cmd+Y` — undo/redo
- `Cmd+1` / `Cmd+2` / `Cmd+3` — Dashboard / Enveloppes / Optimiseur
- `Cmd+4` / `Cmd+5` / `Cmd+6` / `Cmd+7` — Finance / Éducation / Courtiers / Modèles
- `G D` / `G E` / `G O` / `G F` / `G U` / `G B` / `G M` — navigation via palette

## Dashboard — Onglets (`ChartTab`)

```ts
type ChartTab = 'projection' | 'inflation' | 'retraite' | 'immobilier' | 'capital' | 'securite' | 'bilan_net' | 'fees'
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
| Impact frais | FeesImpactChart | Avec/sans frais, économie cumulée |

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
| `ENVELOPE_CAPS` | `engine/simulation.ts` | Plafonds légaux : livret_a 22 950 €, ldds 12 000 €, livret_jeune 1 600 €, pea 150 000 € (source unique) |
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

## Éducation (src/education/)

Page dédiée à la formation financière progressive — 6ème page de l'app (`'education'`), accessible via Cmd+5 ou `G U` dans la palette.

### Modules et leçons

| # | Module | Leçons | Exercices | Format | Durée |
|---|--------|--------|-----------|--------|-------|
| 1 | Les Fondamentaux | 4 (f-l1 à f-l4) | 1 QCM | qcm | 25 min |
| 2 | Allocation d'actifs | 4 (a-l1 à a-l4) | 2 (construire + QCM) | mix | 35 min |
| 3 | Enveloppes fiscales françaises | 4 (e-l1 à e-l4) | 1 QCM situationnel | qcm | 35 min |
| 4 | Sélectionner ses investissements | 4 (s-l1 à s-l4) | 2 (ETF + QCM) | mix | 40 min |
| 5 | Lire et analyser un marché | 6 (m-l1 à m-l6) | 1 exercice PatrimCorp | interactive | 60 min |
| 6 | Gérer son portefeuille dans le temps | 5 (p-l1 à p-l5) | 1 scénario de crise | interactive | 45 min |
| 7 | Optimiser sa fiscalité | 4 (t-l1 à t-l4) | 1 stratégie transmission | mix | 45 min |

**Total** : 29 leçons + 10 exercices

### Store (useEducationStore)

Clé persist : **`patrimoine-education-[profileId]`** (par profil).

```ts
interface ModuleProgress {
  status: 'locked' | 'in_progress' | 'completed'
  completedLessons: string[]      // IDs ex. 'f-l1', 'a-l2'
  completedExercises: string[]    // IDs ex. 'f-e1'
}
```

- `moduleProgress: Record<moduleId, ModuleProgress>`
- Module 1 (`fundamentals`) démarré par défaut — les autres `locked`
- Déverrouillage automatique : compléter un module passe le suivant à `in_progress`
- `completeLesson(moduleId, lessonId)` / `completeExercise(moduleId, exerciseId)` / `resetProgress()`

### Données

- **`modules.ts`** — `EDUCATION_MODULES[]` : 7 objets `EducationModule` (id, order, title, topics, format, estimatedMinutes, color, lessons[], exercises[])
- **`marketAnnotations.ts`** — annotations visuelles (flèches, labels) sur les graphiques des leçons marchés
- **`patrimcorpData.ts`** — série OHLCV fictive "PatrimCorp" pour l'exercice pratique `m-e1`

### Règles Éducation

- **Ne pas mélanger** `useEducationStore` avec `useStore` ni `useFinanceStore`
- **Ne pas renommer** la clé `patrimoine-education-[profileId]` (rupture de persistance)
- Les IDs de leçons et exercices (`f-l1`, `a-e2`…) sont la référence de progression — ne pas les modifier sans migration
- L'exercice `m-e1` est auto-complété quand la leçon `m-l6` est terminée (logique dans `EducationPage`)

## Finance (src/finance/)

Page dédiée aux marchés financiers en temps réel — 5ème page de l'app (`'finance'`), accessible via Cmd+4 ou `G F` dans la palette.

### Structure des dossiers

```
src/finance/
├── types/finance.ts              # Tous les types TS Finance (FinanceAsset, PriceQuote, Candle, Order, Position, Trade, TradingAccount, TradingStrategy, BacktestConfig, BacktestResult, ScreenerFilter…)
├── store/useFinanceStore.ts      # Store Zustand dédié — clé persist 'patrimoine-finance'
├── data/financeAssets.ts         # FINANCE_ASSETS[] — liste statique ~100 actifs (CAC40, S&P500, ETF, crypto, forex, matières premières, obligations)
├── services/
│   ├── priceService.ts           # fetchQuotes(), fetchHistorical(), clearPriceCache() — Yahoo Finance API
│   ├── indicatorsService.ts      # Fonctions pures : sma, ema, rsi, macd, bollinger, atr, obv, annualizedVolatility
│   └── alertsService.ts          # checkAlerts(), conditionLabel(), conditionDisplay()
├── engine/
│   ├── tradingEngine.ts          # executeMarketOrder(), checkPendingOrders(), computeAccountStats(), updatePositionPrices()
│   ├── backtestEngine.ts         # runBacktest(config, candles) → BacktestResult
│   ├── predictionEngine.ts       # linearPrediction(), emaPrediction(), monteCarloPrediction() — horizon 30 jours
│   └── strategies/
│       ├── index.ts              # STRATEGIES[] + getStrategy(id)
│       ├── manual.ts             # Ordres manuels (signal hold permanent)
│       ├── dca.ts                # Dollar-Cost Averaging périodique
│       ├── smaCrossover.ts       # Croisement SMA court/long
│       ├── rsiStrategy.ts        # Survente/surachat RSI
│       ├── bollingerStrategy.ts  # Rebond sur bandes de Bollinger
│       ├── macdStrategy.ts       # Croisement MACD/signal
│       └── gridStrategy.ts       # Grid trading par paliers de prix
└── components/
    ├── FinancePage.tsx            # Racine — 6 sous-onglets, toast local
    ├── market/
    │   ├── MarketTab.tsx          # Watchlist + cotations temps réel + sélection actif
    │   └── AssetTable.tsx         # Tableau actifs avec quote + variation
    ├── analysis/
    │   ├── AnalysisTab.tsx        # Conteneur graphique + indicateurs + prédiction
    │   ├── CandleChart.tsx        # Graphique OHLCV (Recharts)
    │   ├── IndicatorPanel.tsx     # Sélecteur + affichage indicateurs techniques
    │   └── PredictionOverlay.tsx  # Superposition courbe de prédiction
    ├── trading/
    │   ├── TradingTab.tsx         # Multi-comptes : sélecteur + portfolio + ordres + backtest
    │   ├── PortfolioPanel.tsx     # Positions ouvertes + stats compte (P&L, valeur)
    │   ├── OrderPanel.tsx         # Formulaire ordre (market/limit/stop_loss/take_profit)
    │   ├── BacktestPanel.tsx      # Config backtest (stratégie, dates, capital) + résultats
    │   ├── TradeHistory.tsx       # Historique trades fermés
    │   └── NewAccountModal.tsx    # Création compte de trading (capital, devise, frais)
    ├── screener/
    │   └── ScreenerTab.tsx        # Filtre par classe d'actif, variation%, RSI, ATR — tri par signal
    ├── ai/
    │   ├── AIChatTab.tsx          # Chat IA financier — appel Anthropic API directement depuis le navigateur
    │   └── ApiKeyModal.tsx        # Saisie clé API Anthropic (stockée dans store)
    ├── alerts/
    │   └── PriceAlertsTab.tsx     # CRUD alertes prix — badge sur l'onglet si alertes déclenchées
    └── ui/
        └── FinanceSelect.tsx      # Select stylé pour les filtres Finance
```

### Sources de données

**Yahoo Finance API** (`/v8/finance/chart/<ticker>`) — seule source de données Finance.
- Dev (`localhost`) : proxié via Vite `/yahoo-finance` → `https://query1.finance.yahoo.com` pour éviter le CORS
- Prod/Electron (`file://`) : appel direct (pas de restriction CORS)
- La logique de sélection est dans `yahooUrl()` dans `priceService.ts`
- Timeout : 8 000ms (`FETCH_TIMEOUT`)
- Les erreurs de fetch sont avalées silencieusement — fallback sur cache ou tableau vide

### Cache localStorage

| Clé | Contenu | TTL |
|-----|---------|-----|
| `finance-quote-cache` | `PriceCache` — map ticker → `{ quote, fetchedAt }` | 5 min |
| `finance-hist-cache` | `HistoricalCache` — map `${ticker}-${period}` → `HistoricalData` | 24h |

`clearPriceCache()` supprime les deux clés.
Quotes fetchées en batches de 10 avec `Promise.allSettled`.

### Store Zustand Finance

Clé persist : **`patrimoine-finance`** (séparé du store principal `patrimoine-data-[profileId]`).

**Champs persistés** : `watchlist`, `priceAlerts`, `aiApiKey`, `autoRefreshInterval`, `tradingAccounts`, `activeTradingAccountId`, `orders`, `positions`, `trades`, `activeStrategyId`, `strategyParams`

**Champs NON persistés** (session only) : `activeTab`, `selectedAssetId`, `autoRefreshEnabled`

`orders`, `positions`, `trades`, `activeStrategyId`, `strategyParams` sont tous des `Record<accountId, T>` — keyed par compte de trading.

`getAssetById(id)` est exportée depuis le store (accès aux assets statiques sans prop drilling).

### Moteurs

**tradingEngine.ts** — fonctions pures, zéro état React :
- `executeMarketOrder(order, price, account, positions, trades)` → `ExecuteResult` — fill immédiat au prix courant, gère la moyenne d'entrée (buy) et la réalisation du P&L (sell)
- `checkPendingOrders(pendingOrders, currentPrices, ...)` → déclenche limit/stop_loss/take_profit si condition remplie
- `computeAccountStats(account, positions, trades, currentPrices)` → `AccountStats` (totalValue, P&L total/non-réalisé/réalisé/jour)
- `updatePositionPrices(positions, currentPrices)` → recalcule `unrealizedPnL` sur chaque position

**backtestEngine.ts** — `runBacktest(config, candles)` → `BacktestResult` :
- Pas de look-ahead bias : signal calculé sur `candles[0..i]`, exécution sur `candles[i+1].open`
- Position unique (flat/long only, pas de short)
- Métriques : `totalReturn`, `maxDrawdown`, `winRate`, `profitFactor`, `sharpeRatio` (annualisé, risk-free = 0), `buyAndHoldReturn`

**predictionEngine.ts** — 3 modèles, horizon 30 jours, aucune lib externe :
- `linearPrediction` — régression linéaire sur 90 dernières bougies, IC 95% (confidence 0.55)
- `emaPrediction` — projection EMA20 avec momentum EMA50 + volatilité (confidence 0.50)
- `monteCarloPrediction` — GBM 200 trajectoires, Box-Muller, sorties P10/P50/P90 (confidence 0.45)

**strategies/** — chaque stratégie implémente `TradingStrategy.run(candles, params) → Signal` :
- `manual` : hold permanent (signal toujours `hold`)
- `dca` : buy périodique selon paramètre fréquence
- `smaCrossover` : croisement SMA court vs long
- `rsiStrategy` : achat si RSI < seuil bas, vente si RSI > seuil haut
- `bollingerStrategy` : achat sous bande inférieure, vente au-dessus bande supérieure
- `macdStrategy` : croisement MACD line / signal line
- `gridStrategy` : niveaux de prix fixes, buy si descend d'un palier, sell si monte d'un palier

**indicatorsService.ts** — fonctions pures (zéro effet de bord), retournent `(number | null)[]` aligné sur l'input :
- `sma(closes, period)`, `ema(closes, period)` (k = 2/(period+1))
- `rsi(closes, period=14)` (Wilder smoothing)
- `macd(closes, fast=12, slow=26, signal=9)` → `{ macd, signal, histogram }`
- `bollinger(closes, period=20, multiplier=2)` → `{ upper, middle, lower }`
- `atr(candles, period=14)`, `obv(candles)`
- `annualizedVolatility(closes)` (log returns × √252)
- `lastValue(arr)` — dernière valeur non-null

### IA (AIChatTab)

- Modèle : **`claude-haiku-3-5`** (hardcodé — ne pas changer, raison : coût)
- Appel direct navigateur → `https://api.anthropic.com/v1/messages` avec header `anthropic-dangerous-direct-browser-access: true`
- Clé API saisie par l'utilisateur via `ApiKeyModal`, stockée dans le store (persistée)
- Contexte injecté dans le system prompt : actif sélectionné, position ouverte (P&L), valeur compte
- Historique limité à 10 messages (`MAX_HISTORY`)
- max_tokens : 1024

### Règles Finance

- **Ne pas changer le modèle IA** — `claude-haiku-3-5` est intentionnel (coût faible)
- **Ne pas ajouter de lib externe** pour les indicateurs ou le backtest — tout est en fonctions pures
- **Ne pas renommer les clés cache** `finance-quote-cache` / `finance-hist-cache` (rupture de persistance)
- **Ne pas renommer la clé store** `patrimoine-finance` (rupture de persistance)
- **Ne pas mélanger** le store Finance (`useFinanceStore`) avec le store principal (`useStore`)
- **Ne pas casser la logique proxy** dans `yahooUrl()` — le switch dev/prod est nécessaire pour le CORS et pour Electron
- Les positions/ordres/trades sont indexés par `accountId` — toujours utiliser `store.positions[accountId] ?? []`
- Le screener, la prédiction et les alertes prix sont **sans état serveur** — tout se calcule côté client à la demande

## Ce que Claude Code NE doit PAS faire
- Pas de fetch/API externe (sauf `marketDataService` existant et `priceService` Finance)
- Pas de router (single page, 8 pages gérées par `currentPage` state dans `App.tsx`)
- Pas d'authentification
- Pas de tests (hors scope)
- Ne pas recréer les fichiers de config existants
- Ne pas redéfinir `ZERO_FEES` (source : `engine/simulation.ts`) ni `DEFAULT_RETIREMENT_PARAMS` (source : `store/useStore.ts`) localement
- Ne pas redéfinir `PS_RATE` ailleurs que dans `engine/taxation.ts`
- Ne pas recalculer les résultats dans un `useEffect` — utiliser le pattern `RunState` / bouton Refresh
- Ne pas oublier le 3ème argument `events` dans les appels à `runSimulation()`
- Ne pas modifier `monthlyContribution` dans le store pour gérer les plafonds — utiliser uniquement `capRedirectTo` sur l'enveloppe source et la logique 2-passes dans `simulation.ts`
- Ne pas remettre `capModalDismissed` à `false` dans `handleRunSimulation` directement — utiliser le paramètre `capDismissed` passé en argument (bug corrigé : le state `capModalDismissed` est mis à `true` uniquement via `onClose` du modal)
- **Éducation** : ne pas mélanger `useEducationStore` avec `useStore` ni `useFinanceStore` — stores séparés et indépendants
- **Éducation** : ne pas modifier les IDs de leçons/exercices (`f-l1`, `a-e2`…) sans prévoir une migration de progression
- **Tour** : ne pas supprimer les attributs `data-tour-id` des éléments cibles — ils sont requis par `SpotlightOverlay`
- **Tour** : ne pas renommer la clé store `patrimoine-tour-[profileId]` (rupture de persistance)
- **Courtiers perso** : ne pas renommer la clé `patrimoine-custom-banks-[profileId]` (rupture de persistance)

## Knowledge Graph (Graphify)

Le projet dispose d'un knowledge graph généré par [graphify](https://github.com/safishamsi/graphify).

Fichiers générés dans `graphify-out/` (ne pas versionner les résultats, régénérer après features) :
- `graph.json` — graph complet (736 nœuds, 1291 edges, 80 communautés)
- `GRAPH_REPORT.md` — résumé architecture et communautés
- `graph.html` — visualisation interactive

Pour interroger le graph dans une session Claude Code :
```
graphify query "<question>"
```

Pour régénérer après ajout de features :
```
python -m graphify . --backend claude
python -m graphify cluster-only <chemin-repo>
```

Le graph est construit depuis le commit HEAD au moment de la génération — vérifier la fraîcheur dans `GRAPH_REPORT.md` (champ "Built from commit").
