# CLAUDE.md — Simulateur de Patrimoine

## Projet
App web locale (pas de backend) pour simuler l'évolution d'un patrimoine financier multi-enveloppes sur le long terme. Développement en VS Code.
Repo Git : `git@github.com:titou-lr/Patrimoine-manager.git`

## Stack
- **React 19** + **Vite 8** (bundler rapide, HMR)
- **TypeScript ~6.0** (typage strict)
- **Tailwind CSS v4** (styling utility-first, design tokens custom)
- **Recharts 3** (graphiques)
- **lightweight-charts 5** (graphiques chandeliers des leçons marchés — `EduCandleChart` uniquement)
- **KaTeX 0.17** (rendu de formules mathématiques LaTeX — page Modèles & Formules)
- **xlsx (SheetJS) 0.18** (import xlsx/xls — `budget/engine/xlsxImport.ts` ; export — `utils/exportNetWorthXlsx.ts` ; seuls usages autorisés, voir exception documentée section Budget)
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
    ├── App.tsx                  # Racine — sidebar fixe, navigation 10 pages, RunState, modales, TourController
                                 #   (AppPage = 10 valeurs — 'dashboard' renommé 'simulation_dashboard', 'patrimoine' est la page d'accueil)
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
    │   ├── portfolioOptimizer.ts # Black-Litterman, CVaR, optimizePortfolio(), assetLocationOptimizer()
    │   ├── debtPayoffEngine.ts  # Plan de dettes — computePayoffPlan(), comparePayoffStrategies() (avalanche/snowball)
    │   ├── healthScoreEngine.ts # Score santé financière 0-100 — computeHealthScore()
    │   ├── benchmarkEngine.ts   # Benchmark indices — computeBenchmarkSeries()
    │   ├── stressTestEngine.ts  # Stress test — computeStressTest(), STRESS_SCENARIOS
    │   └── dividendCalendarEngine.ts # Revenus passifs — computeDividendCalendar()
    ├── services/
    │   └── marketDataService.ts # Fetch Yahoo/CoinGecko avec cache localStorage 1h
    ├── data/
    │   ├── envelopePresets.ts   # Presets enveloppes — ENVELOPE_PRESETS, createEnvelopeFromPreset()
    │   ├── glossary.ts          # GLOSSARY_TERMS — 5 catégories (fiscal/investissement/enveloppe/calcul/risque)
    │   ├── regimeData.ts        # Données régimes économiques (rendements/volatilités par régime)
    │   ├── benchmarkData.ts     # BENCHMARKS[] — indices statiques (MSCI World, S&P 500, CAC 40 GR)
    │   ├── assets.json          # Base d'actifs statique (ETF, crypto, livrets…)
    │   ├── banks.json           # Base de données frais par banque
    │   └── metadata.json        # Métadonnées app (version, date)
    ├── components/
    │   ├── pages/
    │   │   ├── DashboardPatrimoinePage.tsx # Page Patrimoine (transverse, 1ère page au lancement) — 2 onglets : vue d'ensemble / saisie
    │   │   ├── DashboardPage.tsx    # Page résultats simulation — KPIs, HealthScoreCard, 9 onglets graphiques, SmartAlerts, HistoryPanel
    │   │   ├── EnvelopesPage.tsx    # Page config enveloppes — grille + chips params + bouton Run
    │   │   ├── BrokersPage.tsx      # Page Courtiers — comparateur enrichi, wrapper autour de BanksTab
    │   │   └── ModelsReferencePage.tsx # Page Modèles — 8 sections mathématiques avec rendu KaTeX
    │   ├── profiles/
    │   │   ├── ProfileScreen.tsx     # Écran sélection profil (Netflix-style)
    │   │   └── CreateProfileModal.tsx # Modal création profil 2 étapes
    │   ├── inputs/
    │   │   ├── EnvelopeTypeSelector.tsx    # Modal choix type enveloppe (grilles par groupe)
    │   │   └── CapOverflowModal.tsx   # Modal plafond légal atteint — choix arrêt ou redirection surplus vers autre enveloppe
    │   │   # (la config des enveloppes est implémentée inline dans pages/EnvelopesPage.tsx)
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
    │   │   ├── SimulationComparePanel.tsx # Drawer comparaison multi-simulations
    │   │   ├── HealthScoreCard.tsx   # Score santé financière 0-100 — jauge + composantes (sous les KPIs)
    │   │   ├── BenchmarkPanel.tsx    # Benchmark vs indice (onglet 'analyse')
    │   │   ├── StressTestPanel.tsx   # Stress test krach + récupération (onglet 'analyse')
    │   │   └── DividendCalendarPanel.tsx # Revenus passifs par trimestre (onglet 'analyse')
    │   ├── networth/
    │   │   ├── NetWorthPanel.tsx     # Bilan net — AreaChart actifs/passifs, KPIs endettement
    │   │   └── LiabilityCard.tsx     # Carte passif individuel (CRUD inline)
    │   ├── tracking/
    │   │   └── HistoryPanel.tsx      # Suivi réel — saisie valeurs historiques + LineChart vs simulation
    │   ├── tools/
    │   │   ├── LifeEvents.tsx        # Gestion événements de vie (CRUD) — section en bas d'EnvelopesPage
    │   │   └── TaxOptimizer.tsx      # Modal optimiseur fiscal — bouton "Optimiser fiscalité" dans le header du Dashboard
    │   ├── alerts/
    │   │   └── SmartAlerts.tsx       # Panel alertes — liste prioritisée (P1 warnings, P2 tips, P3 infos)
    │   ├── data/
    │   │   ├── DataModal.tsx         # Overlay banque de données — 3 onglets : actifs / frais bancaires (import de frais) / glossaire
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
    ├── budget/                      # Module Budget autonome — voir section ## Budget
    │   ├── types/budget.ts
    │   ├── data/defaultCategories.ts
    │   ├── store/useBudgetStore.ts
    │   ├── engine/                  # budgetEngine, subscriptionEngine, paymentCalendarEngine, savingsGoalsEngine…
    │   └── components/              # BudgetPage (8 onglets) + sous-composants
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
    ├── patrimoine/                  # Module Patrimoine Réel autonome — voir section ## Patrimoine Réel
    │   ├── types/patrimoine.ts      # PatrimoineAsset (14 catégories), PatrimoineLiability (5), PatrimoineSnapshot…
    │   ├── data/patrimoineCategories.ts # ASSET_CATEGORY_META, LIABILITY_CATEGORY_META — labels/groupes/couleurs (source unique)
    │   ├── store/usePatrimoineStore.ts  # Zustand persist — clé patrimoine-actuel-[profileId] + bénéficiaires/donations succession
    │   │                                #   + applyVersementsEnAttente() / refreshPrixMarche() (init au mount d'App.tsx)
    │   ├── engine/patrimoineEngine.ts   # computePatrimoineNet(), computeLTV(), computeEmergencyCoverage(), buildTimelineFromSnapshots(), computeTopMovers(), computeVersementsEnAttente()
    │   ├── engine/priceFetcher.ts       # fetchPrixActifs() — réutilise fetchQuotes() du module Finance, TTL 1h/actif
    │   ├── ai/coachEngine.ts        # Coach IA — COACH_TOOLS, buildCoachContext(), sanitizeProposedEvents(), compareScenarios()
    │   ├── succession/
    │   │   ├── successionEngine.ts  # Droit fiscal FR 2024 — abattementParLien(), baremeSuccession(), rappelFiscalDonations(), exonerationAssuranceVie(), computeSuccession()
    │   │   └── SuccessionPage.tsx   # Page 'succession' — CRUD bénéficiaires/donations + résultats live + projection X ans
    │   └── components/
    │       ├── PatrimoineSaisieTab.tsx     # Onglet saisie — 4 sections dépliables, badges fraîcheur, bouton snapshot
    │       └── PatrimoineItemFormModal.tsx # Formulaire contextuel par catégorie (immobilier/bancaire/libre)
    ├── help/                        # Aide contextuelle par page — voir section ## Aide contextuelle
    │   ├── types/help.ts            # HelpPageKey (8 pages), HelpSection, HelpContent
    │   ├── store/useHelpStore.ts    # Zustand SANS persist — { isOpen, page, open(), close() }
    │   ├── content/helpContents.ts  # HELP_CONTENTS — Record<HelpPageKey, HelpContent> (textes FR)
    │   └── components/
    │       ├── HelpOverlay.tsx      # Scrim plein écran + panel centré (titre, intro, sections, tips)
    │       ├── HelpButton.tsx       # Bouton « ? » rond — placé dans le header de chaque page
    │       └── HelpHost.tsx         # Monté une fois dans App.tsx — mappe le store vers HelpOverlay
    ├── tour/                        # Système de visite guidée Spotlight
    │   ├── store/useTourStore.ts    # État tour par profil — clé patrimoine-tour-[profileId]
    │   ├── steps/                   # Étapes par page : simulationSteps, financeSteps, educationSteps, brokersSteps, modelsSteps, budgetSteps, patrimoineSteps, successionSteps
    │   └── components/
    │       ├── TourController.tsx   # Orchestrateur — navigation automatique + détection d'actions utilisateur
    │       ├── SpotlightOverlay.tsx # Overlay visuel — scrim rgba(1,1,2,0.82) + bulle positionnée sur [data-tour-id]
    │       └── WelcomeForm.tsx      # Formulaire de bienvenue (prénom, âge) déclenché avant le tour
    └── utils/
        ├── format.ts                # formatEur(), formatPct(), formatPrice() — source unique du formatage
        ├── exportCSV.ts             # Export résultats en CSV
        └── exportNetWorthXlsx.ts    # Export Excel du bilan net (SheetJS) — bouton sur NetWorthPanel
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
- UI : section "Événements de vie" en bas de la liste d'enveloppes (`EnvelopesPage` → `tools/LifeEvents.tsx`)

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
- Interface dans `TaxOptimizer.tsx` — modal ouverte par le bouton "Optimiser fiscalité" du header du Dashboard ; `onApply` applique le patch via `updateEnvelope` (isDirty → re-run manuel)

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
- **Bilan net** : actifs vs passifs (dettes) sur la durée — onglet `'bilan_net'` + export Excel (`exportNetWorthXlsx`)
- **Analyse** : benchmark d'indice, stress test de krach, calendrier de dividendes — onglet `'analyse'`
- **HealthScoreCard** : score de santé financière 0-100 sous les KPIs (budget + dettes + objectifs)
- **SmartAlerts** : alertes contextuelles intégrées au dashboard (simulation + budget)
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
- **SpotlightOverlay** : overlay visuel — scrim `rgba(1,1,2,0.82)` (4 quads) + bulle de 340px positionnée sur l'élément `[data-tour-id]`
  - Retry jusqu'à 40× (120ms) si l'élément n'est pas encore monté (couvre les changements de page)
  - Scroll smooth si la cible est hors écran, puis **attente de stabilisation du layout** : le rect n'est commité qu'après 3 frames rAF consécutives immobiles (timeout 2 s) — ne jamais mesurer sur un layout en mouvement
  - Suivi continu : `ResizeObserver` sur la cible + scroll capture (conteneurs scrollables internes inclus, coordonnées viewport) + resize + poll 250 ms
  - Bulle : hauteur réelle mesurée en `useLayoutEffect` (avant paint), placement en-dessous → au-dessus → à côté → flottant, toujours clampée dans le viewport (marge 16 px, `maxHeight` + scroll interne)
- **Deux phases** de tour :
  1. **Tour simulation** (`simulationSteps`) — couvre : enveloppes, paramètres globaux, événements de vie (`E5b`), bouton Run, dashboard (9 onglets), optimiseur
  2. **Tours pages transverses** — Finance (dont Replay `F5b`), Éducation, Courtiers (dont courtier perso `B4`), Modèles, Budget (dont onglets avancés `BU5`), **Patrimoine** (`patrimoineSteps`, P1-P5), **Succession** (`successionSteps`, SU1-SU4) — déclenchés à la première visite de chaque page (`DEFERRED_PAGES` dans `TourController`)
- **Tour Patrimoine** (P1-P5) : patrimoine net hero, toggle répartition classe/enveloppe, onglet saisie, bouton snapshot, timeline & top movers
- **Tour Succession** (SU1-SU4) : présentation du simulateur, bénéficiaires, tableau des droits, projection future
- **useTourStore** : Zustand persist par profil — clé `patrimoine-tour-[profileId]`
  - `formCompleted`, `simTourActive/Step/Done`, `pageToursStep/Done`
  - Actions : `completeForm`, `setSimStep`, `finishSimTour`, `dismissSimTour`, `restartSimTour`, `setPageStep`
- Intégration via `data-tour-id` attributs sur les éléments cibles (présents dans les composants concernés)
  - `patrimoine-snapshot-btn` existe sur les deux onglets de `DashboardPatrimoinePage` (vue d'ensemble et saisie) — jamais montés simultanément, sélecteur non ambigu

### Aide contextuelle (src/help/)

Référentiel d'aide consultable à tout moment — **distinct du tour guidé** : le tour est une séquence unique au premier lancement, l'aide est relisible à volonté. Les deux systèmes coexistent sans se mélanger.

- **`HelpButton`** : bouton « ? » rond et discret dans le header de chaque page — `<HelpButton page="…" />`
- **`HelpOverlay`** : scrim plein écran `rgba(1,1,2,0.82)` (même teinte que le tour pour la cohérence visuelle, mais SANS découpe spotlight — composant séparé, ne réutilise PAS `SpotlightOverlay`) + panel centré 560 px : titre, intro, sections structurées, astuces (`tip`) mises en valeur, bouton Fermer. Fermable via Escape (listener capture), clic scrim ou bouton. zIndex 500 (sous le tour à 600)
- **`useHelpStore`** : Zustand **sans persistance** — `{ isOpen, page, open(page), close() }`. Rien n'est mémorisé
- **`HELP_CONTENTS`** (`content/helpContents.ts`) : 8 contenus (`patrimoine`, `succession`, `simulation`, `budget`, `finance`, `education`, `brokers`, `models`) — le contenu `simulation` est partagé entre `DashboardPage` et `EnvelopesPage`
- **`HelpHost`** : monté une seule fois dans `App.tsx` — lit le store et affiche l'overlay de la page active
- Types : `HelpContent` = { `pageTitle`, `intro`, `sections: HelpSection[]` } ; `HelpSection` = { `title`, `content`, `tip?` }

### UX / Navigation
- **10 pages** gérées par `currentPage: AppPage` dans `App.tsx`, avec deux niveaux visuels dans la sidebar :
  - **Pages transverses** (haut de sidebar, toujours accessibles) : `'patrimoine'`, `'succession'`, `'finance'`, `'education'`, `'brokers'`, `'models'`, `'budget'`
  - **Pages simulation** (bloc sous la simulation active) : `'simulation_dashboard'`, `'envelopes'`, `'optimizer'`
  - **`'patrimoine'` est la première page affichée au lancement**
  - `DataModal` n'est plus une page : c'est un overlay ouvert par l'import de frais depuis `EnvelopesPage` (3 onglets : actifs / frais bancaires / glossaire)
- **Sidebar fixe** `position: fixed; width: 224px` — toujours visible, deux sections distinctes (transverse / simulation)
- **CommandPalette** (Cmd+K) — recherche d'actions, navigation clavier
- **ProfileDropdown** intégré dans App.tsx (WorkspaceSwitch dans la sidebar)
- **TourController** monté au niveau App — orchestrateur du tour guidé Spotlight
- Point bleu/orange dans l'onglet Enveloppes quand `isDirty`
- Onboarding wizard → création enveloppes adaptées au profil (prudent/équilibré/dynamique)
- **Onboarding Spotlight** → visite guidée interactive pour les nouveaux utilisateurs (WelcomeForm → TourController)
- Thème sombre, design tokens CSS Linear-inspired, responsive
- Export CSV + impression (PDF navigateur)
- Raccourcis : `Ctrl+Z` / `Ctrl+Y` (undo/redo), `Cmd+1/2/3` (Dashboard simulation/Enveloppes/Optimiseur), `Cmd+4/5/6/7/8/9/0` (Finance/Éducation/Courtiers/Modèles/Budget/Patrimoine/Succession), `Cmd+K` (palette)
- Raccourcis palette : `G P/S/D/E/O/F/U/B/M/G` — navigation vers chaque page (P = Patrimoine, S = Succession)
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
- `patrimoine-budget-[profileId]` — budget mensuel (useBudgetStore)
- `patrimoine-actuel-[profileId]` — patrimoine réel + snapshots + succession (usePatrimoineStore)

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

Fichiers purs dans `src/engine/` (zéro import React) — les moteurs Dashboard/Analyse (`debtPayoffEngine`, `healthScoreEngine`, `benchmarkEngine`, `stressTestEngine`, `dividendCalendarEngine`) sont documentés dans la section « Dashboard — Onglets » :

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
- `sampleNormal(mean, std, rng)` — Box-Muller ; `mulberry32(seed)` — RNG déterministe (tous deux exportés, réutilisés par `education/data/patrimcorpData.ts`)
- `runMonteCarlo(envelopes, params, duration, n?, onProgress?)` → `Promise<MonteCarloOutput>`
  - Chunks de 50 trajectoires + `setTimeout(0)` pour ne pas bloquer le thread UI
  - Activé si `globalParams.simulationMode === 'advanced'`

### portfolioOptimizer.ts
- `buildCovarianceMatrix(assets, regime)`, `applyBlackLitterman()`
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
type AppPage =
  | 'patrimoine' | 'succession'
  | 'simulation_dashboard' | 'envelopes' | 'optimizer'
  | 'finance' | 'education' | 'brokers' | 'models' | 'budget'
```

**Pages transverses** (sidebar haut, toujours accessibles) :
- **`'patrimoine'`** → `DashboardPatrimoinePage` — patrimoine réel actuel, snapshots, saisie (Cmd+9 / G P) — **page d'accueil**
- **`'succession'`** → `SuccessionPage` — droits de succession projetés (Cmd+0 / G S) — **entrée sidebar dédiée** sous Patrimoine (icône cadeau) ; le bouton « Succession / Donation » du header Patrimoine reste comme accès secondaire
- **`'finance'`** → `FinancePage` — marchés temps réel, trading paper, backtest, IA (Cmd+4 / G F)
- **`'education'`** → `EducationPage` — 7 modules de cours interactifs (Cmd+5 / G U)
- **`'brokers'`** → `BrokersPage` — comparateur de courtiers, import de frais (Cmd+6 / G B)
- **`'models'`** → `ModelsReferencePage` — référence mathématique complète avec KaTeX (Cmd+7 / G M)
- **`'budget'`** → `BudgetPage` — pilotage budgétaire mensuel par enveloppes (Cmd+8 / G G)

**Pages simulation** (sidebar bas, sous la simulation active) :
- **`'simulation_dashboard'`** → `DashboardPage` — résultats, 9 onglets, alertes, bilan
- **`'envelopes'`** → `EnvelopesPage` — config enveloppes + paramètres globaux
- **`'optimizer'`** → `PortfolioOptimizer` — optimisation Black-Litterman/CVaR

**CommandPalette (Cmd+K)** : navigation clavier, lancer simulation, onboarding.

**Raccourcis clavier** :
- `Cmd+K` — ouvrir la palette de commandes
- `Cmd+Z` / `Cmd+Y` — undo/redo
- `Cmd+1` / `Cmd+2` / `Cmd+3` — Dashboard simulation / Enveloppes / Optimiseur
- `Cmd+4` / `Cmd+5` / `Cmd+6` / `Cmd+7` / `Cmd+8` / `Cmd+9` / `Cmd+0` — Finance / Éducation / Courtiers / Modèles / Budget / Patrimoine / Succession
- `G P` / `G S` / `G D` / `G E` / `G O` / `G F` / `G U` / `G B` / `G M` / `G G` — navigation via palette (P = Patrimoine, S = Succession)

## Dashboard — Onglets (`ChartTab`)

```ts
type ChartTab = 'projection' | 'inflation' | 'retraite' | 'immobilier' | 'capital' | 'securite' | 'bilan_net' | 'fees' | 'analyse'
```

| Onglet | Composant | Contenu |
|--------|-----------|---------|
| Projection | PatrimoineChart | AreaChart empilé enveloppes |
| Inflation | InflationChart | Nominal vs réel |
| Retraite | RetirementPanel + RetirementDualChart | Capital nécessaire, runway |
| Immobilier | RealEstatePanel | Simulateur prêt |
| Capital | CapitalPanel | Objectif + horizon |
| Sécurité | SecurityPanel | Fonds urgence, score |
| Bilan net | NetWorthPanel | Actifs vs dettes + bouton export Excel |
| Impact frais | FeesImpactChart | Avec/sans frais, économie cumulée |
| Analyse | BenchmarkPanel + StressTestPanel + DividendCalendarPanel | Benchmark indices, stress test, revenus passifs |

Sous les KPIs : `HealthScoreCard` — score de santé financière 0-100 (`engine/healthScoreEngine.ts`), 4 composantes pondérées (taux d'épargne réel 30, maîtrise budget 20, endettement 30, objectifs 20), poids redistribués si données manquantes, masqué si aucune composante disponible.

**Moteurs de l'onglet Analyse** (purs, zéro React) :
- `benchmarkEngine.ts` — `computeBenchmarkSeries(results, annualReturnPct)` : mêmes flux de versements capitalisés au taux de l'indice (`data/benchmarkData.ts`, statique)
- `stressTestEngine.ts` — `computeStressTest(capitalByEnvelope, envelopes, monthlyEffort, shockPct)` : sensibilités par classe (actions ×1, crypto ×1.5, immo ×0.5, obligations ×0.3, livrets ×0), temps de récupération itératif
- `dividendCalendarEngine.ts` — `computeDividendCalendar(envelopes, capitalByEnvelope)` : SCPI/ETF distribuants trimestriels, obligations T2/T4, dividendes CTO via `dividendRate`/`estimatedMonthlyDividends`
- `debtPayoffEngine.ts` — `comparePayoffStrategies(liabilities, extraMonthly)` : avalanche vs snowball vs baseline (utilisé par l'onglet Dettes du Budget, lecture seule sur `useStore.liabilities`)

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
`--bg-elevated` (`#141516`) est aussi défini comme **var CSS dans `:root`** — utilisé par de nombreux styles inline, ne pas le supprimer.

**Contrôles natifs (v1.3.2)** : `color-scheme: dark` est déclaré sur `:root` (popup des `<option>`, calendrier date, scrollbars rendus sombres par le navigateur) + style global `select` / `option` au niveau élément dans `index.css` (fond `--surface-2`, texte `--ink`). Tout `<select>` est lisible par défaut ; les selects stylés par classe ou inline gardent la priorité. **Ne pas supprimer ces règles** (retour du bug blanc-sur-blanc).

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

Page dédiée à la formation financière progressive — page `'education'`, accessible via Cmd+5 ou `G U` dans la palette.

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

Page dédiée aux marchés financiers en temps réel — page `'finance'`, accessible via Cmd+4 ou `G F` dans la palette.

### Structure des dossiers

```
src/finance/
├── types/finance.ts              # Tous les types TS Finance (FinanceAsset, PriceQuote, Candle, Order, Position, Trade, TradingAccount, TradingStrategy, BacktestConfig, BacktestResult, ScreenerFilter…)
├── store/useFinanceStore.ts      # Store Zustand dédié — clé persist 'patrimoine-finance'
├── data/financeAssets.ts         # FINANCE_ASSETS[] — liste statique ~100 actifs (CAC40, S&P500, ETF, crypto, forex, matières premières, obligations)
├── services/
│   ├── priceService.ts           # fetchQuotes(), fetchHistorical(), loadHistCache(), clearPriceCache() — Yahoo Finance API
│   ├── indicatorsService.ts      # Fonctions pures : sma, ema, rsi, macd, bollinger, atr, obv, annualizedVolatility
│   └── alertsService.ts          # checkAlerts(), conditionDisplay()
├── engine/
│   ├── tradingEngine.ts          # fillOrder(), executeMarketOrder(), checkPendingOrders(), computeCommission(), applySlippage(), computeAccountStats(), updatePositionPrices()
│   ├── performanceEngine.ts      # computePerformanceStats(), realizedEquityCurve(), weeklySharpe(), formatDuration() — métriques du journal (P&L net)
│   ├── positionSizing.ts         # computePositionSize() — taille de position depuis capital/risque/stop (long only, sans levier)
│   ├── replayEngine.ts           # createReplaySession(), advanceReplayBar(), placeReplayOrder(), cancelReplayOrder() — Bar Replay (session éphémère)
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
    ├── FinancePage.tsx            # Racine — 8 sous-onglets, toast local
    ├── market/
    │   ├── MarketTab.tsx          # Watchlist + cotations temps réel + sélection actif
    │   └── AssetTable.tsx         # Tableau actifs avec quote + variation
    ├── analysis/
    │   ├── AnalysisTab.tsx        # Conteneur graphique + indicateurs + prédiction
    │   ├── CandleChart.tsx        # Graphique OHLCV (lightweight-charts)
    │   ├── IndicatorPanel.tsx     # Sélecteur + affichage indicateurs techniques
    │   └── PredictionOverlay.tsx  # Superposition courbe de prédiction
    ├── trading/
    │   ├── TradingTab.tsx         # Multi-comptes : sélecteur + portfolio + ordres + backtest
    │   ├── PortfolioPanel.tsx     # Positions ouvertes + ordres en attente + stats compte (P&L, valeur)
    │   ├── OrderPanel.tsx         # Ticket d'ordre complet (market/limite/stop/stop-limit/trailing/OCO) + position sizing + stop auto
    │   ├── BacktestPanel.tsx      # Config backtest (stratégie, dates, capital) + résultats
    │   ├── TradeHistory.tsx       # Historique trades fermés (vue compacte dans Trading)
    │   ├── NewAccountModal.tsx    # Création compte (capital, devise, commissions %/forfait, spread simulé)
    │   └── AccountSettingsModal.tsx # Édition commissions/slippage/nom + suppression du compte
    ├── journal/
    │   ├── JournalTab.tsx         # Journal de trading — table triable/filtrable, notes par trade, export CSV
    │   └── PerformanceDashboard.tsx # KPIs pro (win rate, PF, expectancy, max DD, Sharpe hebdo, RRR, streaks) + equity réalisée
    ├── replay/
    │   └── ReplayTab.tsx          # Bar Replay — config (actif/période/point de départ) + session play/pause/step/vitesse + ticket d'ordre
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

`updateTrade(accountId, tradeId, patch)` — patch d'un trade fermé (utilisé pour les notes du journal).

`getAssetById(id)` est exportée depuis le store (accès aux assets statiques sans prop drilling).

### Moteurs

**tradingEngine.ts** — fonctions pures, zéro état React :
- **Modèle d'exécution** : `computeCommission(account, notional)` (mode `'percent'` sur `feeRate` ou `'flat'` sur `commissionFlat` — absent = percent, rétrocompat) ; `applySlippage(mid, side, account)` — `slippagePct` = spread bid-ask simulé, chaque fill market paie le demi-spread dans le sens défavorable
- `fillOrder(order, rawPrice, withSlippage, account, positions, trades, now?)` → `ExecuteResult` — cœur d'exécution : commission d'entrée capitalisée sur `Position.entryCommission` (imputée au prorata à la sortie), `Trade` avec `grossPnL`/`realizedPnL` net/`rrr` (si `Position.plannedStopPrice` défini)/`openedAt` réel
- `executeMarketOrder(...)` = `fillOrder` avec slippage ; les fills limite passent par `fillOrder(..., false, ...)` (prix limite garanti)
- `checkPendingOrders(pendingOrders, currentPrices, account, positions, trades, priceRanges?, now?)` → `{ triggeredOrders, cancelledOrderIds, orderPatches, ... }` :
  - **limit** : exécuté seulement si le prix CROISE le niveau (strictement au-delà, pas seulement touché)
  - **stop_loss** : déclenche un market au niveau du stop (slippage) — `stopPrice ?? limitPrice` (fallback anciens ordres)
  - **stop_limit** : le stop arme la jambe limite (`stopTriggered` via `orderPatches`)
  - **trailing_stop** : `trailingStopPrice` suit le plus haut (sell) / plus bas (buy) à distance `trailingPct` — patches à persister via `updateOrder`
  - **OCO** : un fill annule les autres ordres du même `ocoGroupId` (`cancelledOrderIds`)
  - `priceRanges` (high/low de bougie) : utilisé par le replay pour tester le franchissement intrabar
- `computeAccountStats(account, positions, trades, currentPrices)` → `AccountStats` (totalValue, P&L total/non-réalisé/réalisé/jour)
- `updatePositionPrices(positions, currentPrices)` → recalcule `unrealizedPnL` sur chaque position

**performanceEngine.ts** — `computePerformanceStats(trades, initialCapital)` → `PerformanceStats` :
- Tout en P&L NET (après commissions) sur la courbe d'equity réalisée (trades triés par `closedAt`)
- Win rate, profit factor, expectancy (€/trade), max drawdown (% et €), Sharpe annualisé **base hebdomadaire** (√52, semaines sans trade = 0), RRR moyen réalisé, streaks win/loss, gain/perte moyens, frais totaux, durée moyenne
- `realizedEquityCurve()` pour le graphique du dashboard

**positionSizing.ts** — `computePositionSize({ capital, riskMode, riskValue, entryPrice, stopPrice })` :
- quantité = floor(risque € / |entrée − stop|), plafonnée au capital (pas de levier), long only

**replayEngine.ts** — Bar Replay, session ÉPHÉMÈRE (jamais persistée, indépendante des comptes paper) :
- `createReplaySession(config)` → `ReplaySession` (mini-compte virtuel avec commissions/spread propres)
- `advanceReplayBar(session)` — avance d'une bougie, vérifie les pending sur le high/low de la bougie, horodate au temps de la bougie
- `placeReplayOrder(session, order)` — market = fill au close courant ; sinon pending (trailing initialisé sur le prix courant)

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

### IA (AIChatTab) — Coach patrimonial agentique

- Modèle : **`claude-haiku-3-5`** (hardcodé — ne pas changer, raison : coût)
- Appel direct navigateur → `https://api.anthropic.com/v1/messages` avec header `anthropic-dangerous-direct-browser-access: true`
- Clé API saisie par l'utilisateur via `ApiKeyModal`, stockée dans le store (persistée)
- Contexte injecté dans le system prompt : actif sélectionné, position ouverte (P&L), valeur compte + instructions coach
- **Tool use** : `tools: COACH_TOOLS` (importés depuis `src/patrimoine/ai/coachEngine.ts`) — voir section ## Patrimoine Réel → Coach IA. Boucle agentique max 5 itérations (`MAX_AGENT_ITERATIONS`), historique API (content blocks) séparé de l'affichage, tronqué à 24 messages (`MAX_API_MESSAGES`) sans casser les paires tool_use/tool_result
- `propose_life_events` exige une **confirmation utilisateur** (carte Confirmer/Annuler) avant tout `addLifeEvent` — ne jamais court-circuiter
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
- **Exécution** : ne pas contourner `fillOrder()`/`computeCommission()`/`applySlippage()` — toute exécution (live, pending, replay) passe par `tradingEngine.ts`, source unique des frictions
- **checkPendingOrders** : après appel, TOUJOURS appliquer `orderPatches` (trailing/stop-limit) et `cancelledOrderIds` (OCO) au store — sinon le trailing stop ne suit pas et les jambes OCO restent actives
- **Replay** : la `ReplaySession` est éphémère (state React local) — ne jamais la persister ni mélanger ses trades avec le journal des comptes paper
- **Journal** : le RRR réalisé dépend de `Position.plannedStopPrice` (posé par le position sizing ou le stop auto) — ne pas le recalculer autrement
- `FinanceTab` = 8 valeurs (`market/analysis/trading/journal/replay/screener/ai/alerts`)

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
- **Aide** : ne pas mélanger le système d'aide (`src/help/`, consultable à tout moment) avec le tour guidé (`src/tour/`, séquence unique) — `HelpOverlay` ne réutilise pas `SpotlightOverlay`
- **Aide** : ne pas ajouter de persistance à `useHelpStore` — store volatil par design (pas de « ne plus afficher »)
- **Courtiers perso** : ne pas renommer la clé `patrimoine-custom-banks-[profileId]` (rupture de persistance)
- **Budget** : ne pas mélanger `useBudgetStore` avec `useStore` ni `useFinanceStore` — stores séparés et indépendants
- **Budget** : `linkedSimEnvelopeId` est purement informatif — ne jamais écrire automatiquement dans `Envelope` ou `GlobalParams` depuis le module Budget
- **Budget** : `compareToSimulationAssumption` lit `GlobalParams.investmentRate`, elle ne doit jamais le modifier
- **Budget** : ne pas renommer la clé `patrimoine-budget-[profileId]` (rupture de persistance)
- **Budget** : `removeCategory` est un no-op sur les catégories système (`isSystem: true`) — ne pas supprimer silencieusement les catégories par défaut
- **Patrimoine** : ne pas mélanger `usePatrimoineStore` avec `useStore`, `useBudgetStore` ni `useFinanceStore` — aucune écriture croisée automatique entre stores
- **Patrimoine** : ne pas renommer la clé `patrimoine-actuel-[profileId]` (rupture de persistance)
- **Patrimoine** : ne jamais appeler `takeSnapshot()` automatiquement — action utilisateur explicite uniquement
- **Patrimoine** : `applyVersementsEnAttente()` et `refreshPrixMarche()` sont appelés UNE fois au mount initial d'`App.tsx` (bloc unique ordonné) — ne pas les déplacer dans des useEffect réactifs dispersés, ne pas les déclencher sur un timer
- **Patrimoine** : pour les prix de marché, ne pas dupliquer la logique Yahoo — tout passe par `fetchQuotes()` de `finance/services/priceService` via `patrimoine/engine/priceFetcher.ts`
- **Patrimoine/Budget** : `linkedBudgetCategoryId` est purement informatif ; la mise à jour d'encours post-import passe TOUJOURS par la carte Mettre à jour / Ignorer de `CsvImportModal` — jamais d'`upsertLiability()` automatique
- **Design** : ne pas supprimer `color-scheme: dark`, le style global `select`/`option` ni la var `--bg-elevated` de `index.css` (retour du bug selects blanc-sur-blanc / fonds transparents)
- **Coach IA** : ne jamais appliquer les événements proposés par le modèle sans passer par la carte de confirmation Confirmer/Annuler ; toute proposition passe par `sanitizeProposedEvents()`

## Budget (src/budget/)

Page dédiée au pilotage budgétaire mensuel — page `'budget'`, accessible via Cmd+8 ou `G G` dans la palette. Page **transverse** (comme Finance/Éducation/Courtiers/Modèles), pas liée à une simulation spécifique.

### Arborescence

```
src/budget/
├── types/budget.ts              # BudgetCategory, BudgetEnvelope, BudgetTransaction, EnvelopeMonthlyStat, MonthlyBudgetSnapshot, SimulationGapResult…
├── data/defaultCategories.ts    # DEFAULT_CATEGORIES (isSystem: true), CATEGORY_GROUP_LABELS
├── store/useBudgetStore.ts      # Zustand persist — clé patrimoine-budget-[profileId]
├── engine/budgetEngine.ts       # computeMonthlySnapshot(), computeEnvelopeStat(), compareToSimulationAssumption()
└── components/
    ├── BudgetPage.tsx           # Racine — sélecteur de mois, 8 onglets (BudgetTab)
    ├── BudgetOverviewPanel.tsx  # Donut dépenses/catégorie + barre budget + KPIs
    ├── BudgetVsSimulationBanner.tsx # Bandeau écart taux d'épargne réel vs simulation
    ├── envelopes/
    │   ├── EnvelopeGrid.tsx         # Grille de cartes + formulaire d'ajout
    │   └── BudgetEnvelopeCard.tsx   # Barre 3 segments, édition inline monthlyAllocation, badge dépassement
    ├── transactions/
    │   ├── TransactionList.tsx      # Liste triée par date décroissante
    │   ├── TransactionRow.tsx       # Ligne (date, libellé, catégorie, montant, suppression)
    │   └── AddTransactionModal.tsx  # CRUD transaction — type/label/montant/date/catégorie/enveloppe
    ├── categories/
    │   └── CategoryManagerModal.tsx # CRUD catégories perso (système non supprimables)
    ├── import/CsvImportModal.tsx    # Wizard import CSV/XLSX
    ├── recurring/RecurringRulesPanel.tsx # Règles récurrentes + suggestions
    ├── subscriptions/SubscriptionsPanel.tsx # Gestionnaire d'abonnements (V3)
    ├── calendar/PaymentCalendar.tsx     # Calendrier de prélèvements (V3)
    ├── goals/SavingsGoalsPanel.tsx      # Objectifs d'épargne (V3)
    ├── debts/DebtPlanPanel.tsx          # Plan de dettes avalanche/snowball (V3)
    └── forecast/CashflowForecastChart.tsx # Prévisions de trésorerie
```

### Types (`src/budget/types/budget.ts`)

- `BudgetCategoryGroup` = `'fixed' | 'variable' | 'savings' | 'income'`
- `TransactionType` = `'expense' | 'income' | 'transfer'`
- `BudgetCategory` — catégorie avec `isSystem: boolean` (les système ne sont pas supprimables) + `keywords?: string[]` (mots-clés normalisés pour la catégorisation automatique — voir section Mots-clés)
- `BudgetEnvelope` — enveloppe avec `rollover: boolean` (report du solde restant au mois suivant)
- `BudgetTransaction` — transaction avec `source: 'manual' | 'csv_import'` + `importHash?` + `categorySource?: 'manual' | 'keyword_match' | 'default'` (absent = traité comme `'manual'`)
- `RecurringRule` — règle récurrente (prévu pour V2 détection de récurrences)
- `EnvelopeMonthlyStat` — stats d'une enveloppe : `allocated`, `spent`, `remaining`, `carryOverFromPrevious`
- `MonthlyBudgetSnapshot` — snapshot mensuel : KPIs globaux + `byEnvelope: Record<string, EnvelopeMonthlyStat>`
- `SimulationGapResult` — `assumedSavingsRate`, `realSavingsRate`, `deltaPct`, `severity: 'ok' | 'warning' | 'critical'`
- `SavingsGoal` — objectif d'épargne : `targetAmount`, `targetDate?` (YYYY-MM), `linkedEnvelopeId?`, `startingAmount`, `createdAt`
- `SavingsGoalProgress` — progression calculée : `current`, `pct`, `monthlyPace`, `projectedMonth`, `onTrack`
- `SubscriptionInfo` — abonnement : `monthlyCost`/`annualCost` normalisés, `nextRenewalDate`, `daysUntilRenewal`, `source: 'rule' | 'detected'`
- `CalendarPaymentItem` — élément du calendrier de prélèvements : `kind: 'actual' | 'upcoming'`

### Store (`src/budget/store/useBudgetStore.ts`)

Clé persist : **`patrimoine-budget-[profileId]`** (par profil).

Champs persistés : `categories`, `envelopes`, `transactions`, `recurringRules`, `savingsGoals`
Champ non persisté (session) : `selectedMonth` (réinitialisé au mois courant via `partialize`)

Actions V1 :
- `addTransaction / updateTransaction / removeTransaction`
- `addEnvelope / updateEnvelope / removeEnvelope`
- `addCategory / removeCategory` (no-op si `isSystem === true`)
- `setSelectedMonth`

Actions objectifs d'épargne :
- `addSavingsGoal / updateSavingsGoal / removeSavingsGoal`

Actions mots-clés :
- `addKeywordToCategory(categoryId, keyword)` → `{ success, error?: 'duplicate' | 'too_short' }` — normalise et stocke le mot-clé ; refuse si déjà utilisé par une AUTRE catégorie ou < 3 caractères normalisés ; fonctionne aussi sur `isSystem === true`
- `removeKeywordFromCategory(categoryId, keyword)` — supprime un mot-clé
- `recategorizeTransactions(scope)` → `{ updated: number }` — recatégorise les transactions selon les mots-clés actuels ; `'uncategorized_only'` : seulement les `categoryId === 'var-uncategorized'` ; `'all_non_manual'` : toutes les `categorySource !== 'manual'` ; ne touche JAMAIS `categorySource === 'manual'`

Actions V2 : `importTransactions`, `upsertRecurringRule`, `removeRecurringRule`, `generateRecurringTransactions` (voir section V2)

### Moteur (`src/budget/engine/budgetEngine.ts`)

Fonctions pures, ZÉRO import React :
- **Helpers partagés du module Budget (source unique)** : `txMonth(date)`, `addMonths(ym, delta)`, `currentYearMonth()`, `uid()` — ne pas les redéfinir dans les composants ou le store
- `computeEnvelopeStat(envelope, transactions, month, carryOver)` → `EnvelopeMonthlyStat`
- `computeMonthlySnapshot(transactions, envelopes, month, previousSnapshot?)` → `MonthlyBudgetSnapshot`
  - Gère le `carryOverFromPrevious` si `envelope.rollover === true`
  - Le snapshot est calculé **à la volée** (hook dans `BudgetPage`), jamais stocké dans le store
- `compareToSimulationAssumption(snapshot, globalParams)` → `SimulationGapResult`
  - Seuils : |delta| < 5pt = ok, < 15pt = warning, sinon critical
  - Lit uniquement `globalParams.investmentRate` — **jamais d'écriture**

### Données par défaut (`src/budget/data/defaultCategories.ts`)

- `DEFAULT_CATEGORIES` — 22 catégories système réparties en 4 groupes (`income`, `fixed`, `variable`, `savings`)
- `CATEGORY_GROUP_LABELS` — libellés français par groupe

### Système de mots-clés (`src/budget/engine/categoryMatcher.ts`)

Catégorisation automatique des transactions par correspondance de mot-clé dans le libellé.

- **`normalizeText(text)`** — lowercase + suppression des accents (NFD) + collapse espaces + trim — source unique de normalisation
- **`matchCategoryByKeyword(label, categories)`** → `{ categoryId, matchedKeyword } | null` — cherche dans `cat.keywords` de toutes les catégories ; le mot-clé normalisé le plus long gagne (correspondance la plus spécifique) ; ignore les keywords < 3 caractères normalisés
- **`applyKeywordMatching(transactions, categories)`** → transactions remappées — ne touche jamais `categorySource === 'manual'` (ou champ absent)

**Règle d'unicité** : un mot-clé normalisé ne peut appartenir qu'à une seule catégorie à la fois. `addKeywordToCategory` renvoie `error: 'duplicate'` si le même keyword normalisé existe déjà sur une autre catégorie.

**`categorySource`** sur `BudgetTransaction` :
- `'manual'` — catégorie choisie explicitement par l'utilisateur (jamais écrasée)
- `'keyword_match'` — catégorie déduite par mot-clé
- `'default'` — aucun mot-clé trouvé, tombé dans "Non catégorisé"
- absent (transactions antérieures) — traité comme `'manual'` pour ne pas écraser silencieusement

**Intégration import** : `mapRowsToTransactions(rows, mapping, categories?)` applique `matchCategoryByKeyword` sur chaque ligne parsée si `categories` est fourni.

**Intégration `AddTransactionModal`** : debounce 300 ms sur le libellé → suggestion automatique du select catégorie via `matchCategoryByKeyword` ; `categorySource: 'manual'` systématiquement au submit (l'utilisateur a validé).

**`CategoryManagerModal`** : section mots-clés pliable par catégorie (chips supprimables + champ ajout) + bouton "Recatégoriser les transactions" avec choix de scope (`uncategorized_only` par défaut / `all_non_manual` avec avertissement).

### Intégration

- **`BudgetVsSimulationBanner`** — affiché seulement si `severity !== 'ok'`, lien vers `EnvelopesPage` via prop `onGoToEnvelopes`
- **Tour** — `BUDGET_STEPS` (5 étapes, dont onglets avancés `BU5`) déclenché à la première visite, pattern identique aux autres pages transverses
- **`AppPage`** — 8 valeurs (l'ancienne valeur `'data'` a été supprimée), `'budget'` est une page transverse dans la sidebar haute

### Alertes budgétaires (`src/budget/engine/budgetAlertsEngine.ts`)

Moteur d'alertes pures dédié au module Budget — fusionné dans `SmartAlerts` avec les alertes de `alertsEngine.ts`.

Signature : `generateBudgetAlerts(snapshot, envelopes, categories, transactions, gapResult, recurringRules?, today?) → Alert[]`
(`recurringRules` et `today` optionnels — rétrocompat ; `today` injectable pour la testabilité)

6 règles triées par priorité croissante en sortie :

- **a. Dépassement d'enveloppe** — pour chaque `EnvelopeMonthlyStat` avec `remaining < 0` :
  - Priority 1, `'warning'` si la catégorie de l'enveloppe a `group === 'fixed'`
  - Priority 2, `'tip'` si `group === 'variable'`
  - `actionTarget: 'budget'` (navigue vers la page Budget)
  - Ignoré pour `group` = `'savings'` ou `'income'`
- **b. Écart taux d'épargne** — depuis `gapResult.severity` :
  - `'critical'` → priority 1, `'warning'` ; `'warning'` → priority 2, `'tip'` ; `'ok'` → aucune alerte
  - Message cite `assumedSavingsRate` et `realSavingsRate`
  - `actionTarget: 'envelopes'`
- **c. Épargne meilleure que prévu** — si `realSavingsRate > assumedSavingsRate + 0.05` :
  - Priority 3, `'success'` — suggère d'augmenter les versements dans la simulation
- **d. Transactions orphelines** — si des dépenses du mois ont un `categoryId` qu'aucune enveloppe active ne couvre :
  - Priority 2, `'tip'` — une seule alerte agrégée (N transactions) ; `actionTarget: 'budget'`
- **e. Anomalie de catégorie** — dépense du mois > moyenne des 3 mois précédents × 1.4 :
  - Priority 2, `'tip'` — garde-fous : ≥ 2 des 3 mois précédents avec dépense, écart ≥ 20 € ; exclut `income` et `savings`
- **f. Abonnement non utilisé probable** — règle mensuelle active (`expense`) sans transaction correspondante (par `recurringRuleId` ou libellé normalisé via `normalizeLabel`) à J+5 de son `dayOfMonth` :
  - Priority 3, `'tip'` — mois courant uniquement (`snapshot.month === mois de today`)

**Intégration SmartAlerts** : alertes calculées seulement si le profil a des données budget (`budgetEnvs.length > 0 || budgetTxs.length > 0`). `Alert.actionTarget` étendu via un type union interne `AnyAlert` dans `SmartAlerts.tsx` (sans modifier `alertsEngine.ts`). Navigation vers `'budget'` via prop `onGoToBudget?: () => void` threadé `App.tsx → DashboardPage → SmartAlerts`.

### V2 — Import CSV, Récurrences, Prévisions (juin 2026)

#### Types supplémentaires (`src/budget/types/budget.ts`)

- `BudgetTransaction['source']` étendu : `'manual' | 'csv_import' | 'recurring'`
- `CsvColumnMapping` — `{ dateColumnIndex, amountColumnIndex, labelColumnIndex, typeColumnIndex?, amountMode: 'signed' | 'absolute' | 'debit_credit_columns', debitColumnIndex?, creditColumnIndex?, dateFormat, headerRowIndex: number }`
  - `headerRowIndex` : index de la ligne d'en-tête dans le fichier brut (0 = première ligne) — les lignes ≤ headerRowIndex sont ignorées comme préambule bancaire
  - `debitColumnIndex` / `creditColumnIndex` : colonnes séparées Débit/Crédit, utilisées si `amountMode === 'debit_credit_columns'`

#### Moteur CSV/XLSX (`src/budget/engine/`)

**`csvImport.ts`** — Fonctions pures, ZÉRO dépendance externe :
- `detectDelimiter(csvText)` → `';' | ','`
- `parseCsvRaw(csvText, delimiter)` → `string[][]`
- `computeImportHash(date, amount, label)` → string — `${date}|${amount.toFixed(2)}|${label.trim().toLowerCase()}`
- `mapRowsToTransactions(rows, mapping, categories?)` → `Omit<BudgetTransaction,'id'>[]` — **fonction principale** : applique `headerRowIndex` (skip des lignes de préambule), gère les 3 modes de montant (signé, absolu, débit/crédit séparés), parse décimales virgule française, applique le keyword matching si `categories` est fourni

**`xlsxImport.ts`** — Dépend de **SheetJS (`xlsx`)** — seule lib externe autorisée dans le module Budget (exception documentée) :
- `parseXlsxRaw(arrayBuffer, sheetIndex?)` → `{ rows: string[][], sheetNames: string[] }`
  - Retourne une `string[][]` identique en forme à `parseCsvRaw()` — le reste du pipeline est 100% partagé
  - Utilise `cell.w` (texte affiché) plutôt que `cell.v` (valeur brute) pour préserver les formats bancaires (virgule décimale, dates localisées)
  - Ignore les lignes entièrement vides (fin de feuille)
  - Si plusieurs feuilles, toutes les `sheetNames` sont retournées — le composant permet à l'utilisateur d'en choisir une

**Exception SheetJS** : `xlsx` est la seule dépendance externe tolérée dans `src/budget/`. Un parseur xlsx maison n'a pas de sens (format zip+XML). Cette lib est utilisée dans `xlsxImport.ts` (conversion xlsx → `string[][]`) et dans `src/utils/exportNetWorthXlsx.ts` (export Excel du bilan net) ; jamais pour le CSV, jamais ailleurs.

#### Moteur récurrences (`src/budget/engine/recurringDetector.ts`)

- `detectRecurringCandidates(transactions, minOccurrences=3)` → `RecurringRule[]` (`active:false`, `detectedAutomatically:true`)
  - Groupement : libellé normalisé + montant ±5% médian ; intervalles weekly/monthly/quarterly/annual avec tolérances ±3/5/10/15 j
  - **Ne déclenche rien automatiquement** — appelée sur clic dans `RecurringRulesPanel`

#### Moteur prévision (`src/budget/engine/forecastEngine.ts`)

- `forecastCashflow(transactions, recurringRules, monthsAhead=6)` → `CashflowForecastPoint[]`
  - Baseline = moyenne mois passés complets ; `confidence` : `'high'` ≥3 mois, `'medium'` 1-2, `'low'` 0

#### Store V2 (`src/budget/store/useBudgetStore.ts`)

- `importTransactions(candidates)` → `{ imported, duplicatesSkipped }` — dédoublonnage via `computeImportHash`
- `upsertRecurringRule(rule)` / `removeRecurringRule(id)`
- `generateRecurringTransactions(month)` → crée les tx `source:'recurring'` pour les règles actives non encore générées ce mois, retourne le nb créé
- `setSelectedMonth` appelle `generateRecurringTransactions` directement (pas de `useEffect`)

#### Composants V2

| Composant | Rôle |
|---|---|
| `src/budget/components/import/CsvImportModal.tsx` | Wizard 3-4 étapes : upload (CSV/XLSX/XLS, drag-and-drop) → [sélection de feuille si xlsx multi-feuilles] → mapping colonnes + sélection ligne d'en-tête + mode débit/crédit → preview doublons grisés → import. Après import : `LiabilityUpdateProposals` — si des dépenses importées matchent une catégorie liée à un passif (`PatrimoineLiability.linkedBudgetCategoryId`), carte « N remboursements détectés (total X €). Mettre à jour l'encours ? » avec boutons Mettre à jour / Ignorer ; `upsertLiability()` uniquement sur clic explicite (seul pont Budget → Patrimoine autorisé) ; les transactions importées sont capturées au confirm (avant recalcul des hashs) |
| `src/budget/components/recurring/RecurringRulesPanel.tsx` | Règles actives (CRUD inline) + Suggestions détectées (Analyser → state local → Confirmer/Ignorer) |
| `src/budget/components/forecast/CashflowForecastChart.tsx` | Recharts `ComposedChart` — barres revenus/dépenses + ligne pointillée solde net + badge confidence |

#### BudgetPage

- 8 onglets (`BudgetTab`) : **Vue d'ensemble** / **Transactions** / **Récurrences** / **Abonnements** / **Calendrier** / **Objectifs** / **Dettes** / **Prévisions**
- Onglet Transactions : bouton "Importer un relevé" ouvrant `CsvImportModal`

#### Données

- Catégorie système `'var-uncategorized'` (id fixe) dans `DEFAULT_CATEGORIES` — catégorie par défaut pour imports CSV/XLSX

### V3 — Abonnements, calendrier, objectifs, dettes (juillet 2026)

#### Moteurs (`src/budget/engine/`, fonctions pures)

- **`subscriptionEngine.ts`** — `listSubscriptions(recurringRules, transactions, today?)` → `SubscriptionInfo[]` :
  règles actives (`expense`, non hebdo) + candidats détectés via `detectRecurringCandidates` sans règle confirmée (dédup par `normalizeLabel`) ; prochain renouvellement depuis `dayOfMonth` (mensuel) ou dernière transaction + période ; `subscriptionTotals()` ; `RENEWAL_ALERT_DAYS = 7` (bandeau J-7 dans le panel)
- **`paymentCalendarEngine.ts`** — `computePaymentCalendar(month, transactions, recurringRules, categories)` → `Record<jour, CalendarPaymentItem[]>` :
  transactions réelles du mois (catégorie `fixed` ou source récurrente) + règles mensuelles à venir non matérialisées ; trimestrielles/annuelles incluses seulement si dues ce mois (dernière occurrence + période) ; `daysInMonth()`, `calendarMonthTotal()`
- **`savingsGoalsEngine.ts`** — `computeGoalProgress(goal, transactions, today?)` → `SavingsGoalProgress` :
  cumul depuis `createdAt` (enveloppe liée : inflows expense/transfer ; sinon épargne globale revenus−dépenses) ; rythme = moyenne des 3 derniers mois pleins ; projection `projectedMonth` + `onTrack` vs `targetDate` ; `averageGoalsProgress()` (utilisé par le score santé)
- `normalizeLabel()` est exporté depuis `recurringDetector.ts` — source unique de normalisation des libellés de transactions (abonnements, calendrier, alerte f)

#### Composants V3

| Composant | Rôle |
|---|---|
| `components/subscriptions/SubscriptionsPanel.tsx` | KPIs (nb, coût mensuel, coût annuel) + bandeau renouvellements J-7 + liste avec badge « détecté » et bouton Confirmer (crée une règle) |
| `components/calendar/PaymentCalendar.tsx` | Grille mensuelle lun–dim, transactions réelles + prélèvements à venir (italique), total/jour et total du mois |
| `components/goals/SavingsGoalsPanel.tsx` | CRUD objectifs, barre de progression, rythme réel, date d'atteinte projetée, statut dans les temps/en retard |
| `components/debts/DebtPlanPanel.tsx` | Avalanche vs snowball (`src/engine/debtPayoffEngine.ts`) — slider effort supplémentaire, graphique comparatif, ordre de remboursement, intérêts économisés ; **lecture seule** sur `useStore.liabilities` |

### Roadmap V4

- Mode couple, lien `HistoryEntry` ↔ épargne réelle mensuelle

## Patrimoine Réel (src/patrimoine/)

Page dédiée au patrimoine **actuel** de l'utilisateur — page `'patrimoine'`, **première page au lancement**, accessible via Cmd+9 ou `G P`. Source de vérité de ce que possède réellement l'utilisateur aujourd'hui — distinct de la simulation (qui projette le futur) et du budget (qui suit les flux).

### Store (usePatrimoineStore)

Clé persist : **`patrimoine-actuel-[profileId]`** (par profil).

Champs : `assets: PatrimoineAsset[]`, `liabilities: PatrimoineLiability[]`, `snapshots: PatrimoineSnapshot[]` (max **120**, FIFO), `beneficiaires: Beneficiaire[]`, `donations: DonationHistorique[]` (paramétrage succession).

Actions : `upsertAsset/removeAsset`, `upsertLiability/removeLiability`, `takeSnapshot()` (retourne le snapshot créé), `applyVersementsEnAttente()`, `refreshPrixMarche()` (async), `upsertBeneficiaire/removeBeneficiaire`, `upsertDonation/removeDonation` (supprimer un bénéficiaire supprime ses donations).

- **Les snapshots ne sont JAMAIS pris automatiquement** — uniquement via `takeSnapshot()` sur action explicite (boutons du dashboard patrimonial)
- `PatrimoineAsset.linkedEnvelopeId` pointe vers `Envelope.id` — **purement informatif**, aucune écriture croisée entre `usePatrimoineStore` et `useStore`
- `PatrimoineLiability.linkedBudgetCategoryId` pointe vers `BudgetCategory.id` — **purement informatif** ; seul pont : la proposition post-import de relevé bancaire (voir section Budget), résolue par clic explicite
- `metadata: PatrimoineMetadata` — champs spécifiques par catégorie (immobilier : `adresse`, `surface`, `loyerMensuel`, `encoursCredit`, `dateAcquisition`, `valeurAcquisition` ; bancaire : `etablissement`, `iban`) + champs typés des catégories financières (`group === 'financier'`) :
  - `versementPeriodique?: { montant, frequence: 'monthly'|'quarterly'|'annual', prochaineDate: 'YYYY-MM-DD', actif } | null`
  - `ticker?` (Yahoo Finance, ex. `EWLD.PA`, `BTC-EUR`), `quantite?`, `prixUnitaire?` (calculé au fetch, readonly dans le formulaire), `lastPriceFetchAt?` — si `ticker` + `quantite` renseignés, `currentValue = prixUnitaire × quantite` ; sinon saisie manuelle

### Versements périodiques & prix de marché (v1.3.2)

**Initialisation au lancement** — bloc unique au mount initial d'`App.tsx` (pattern `generateRecurringTransactions` du Budget : appel explicite une fois, PAS de useEffect réactif récurrent) :
1. `applyVersementsEnAttente()` → `{ updated, totalApplied, nbVersements }` — pour chaque actif avec `versementPeriodique.actif`, `computeVersementsEnAttente(asset, now)` (moteur pur) compare `prochaineDate` à la date système, compte les intervalles écoulés (clamp fin de mois, ancrage sans dérive, garde-fou 600), puis le store fait `currentValue += montantTotal` + avance `prochaineDate` ; toast « X versements appliqués — +Y € sur Z actifs » ; **aucun snapshot automatique**
2. `refreshPrixMarche()` → `{ updated }` — fetch async des actifs avec `ticker` via `engine/priceFetcher.ts` : **réutilise `fetchQuotes()` de `finance/services/priceService`** (même API Yahoo, même proxy dev, même cache `finance-quote-cache` 5 min, échecs avalés) + TTL 1 h par actif sur `lastPriceFetchAt` ; hors ligne = fail silencieux, dernière valeur et `lastPriceFetchAt` conservés

UI : sections « Prix de marché » et « Versements périodiques » dans `PatrimoineItemFormModal` (catégories financières uniquement) ; badge « ● Prix en direct » sur la ligne d'actif de `PatrimoineSaisieTab` (date du dernier fetch au survol) ; valeur actuelle readonly quand calculée depuis le ticker.

### Catégories

- **14 catégories d'actifs** (`PatrimoineAssetCategory`) : `compte_bancaire`, `pea`, `assurance_vie`, `per`, `cto`, `crypto`, `immobilier_principal`, `immobilier_locatif`, `or_metaux`, `private_equity`, `parts_societe`, `vehicule`, `art_collection`, `autre_actif`
- **5 catégories de passifs** (`PatrimoineLiabilityCategory`) : `credit_immobilier`, `credit_conso`, `credit_auto`, `dette_fiscale`, `autre_passif`
- `ASSET_CATEGORY_META` / `LIABILITY_CATEGORY_META` (`data/patrimoineCategories.ts`) — **source unique** des labels, groupes de saisie (financier/immobilier/alternatif), couleurs, flags `liquid` et `envelopeFiscale`

### Moteur (engine/patrimoineEngine.ts) — pur, zéro React

- `computePatrimoineNet(assets, liabilities)` → `{ totalActifs, totalPassifs, patrimoineNet, byCategory, byEnvelopeFiscale, liquiditeRatio, tauxEndettement }`
  - `liquiditeRatio` = (catégories `liquid` : compte_bancaire + cto + crypto) / patrimoineNet
- `computeLTV(asset)` → `number | null` — `metadata.encoursCredit / currentValue`, immobilier uniquement
- `computeEmergencyCoverage(patrimoineNet, monthlyExpenses)` → mois couverts | null — `monthlyExpenses` vient du snapshot budget (`totalExpenses`), passé par le composant
- `buildTimelineFromSnapshots(snapshots)` → points triés pour Recharts
- `computeTopMovers(snapshots, assets, count=3)` → variations d'actifs entre les 2 derniers snapshots (via `PatrimoineSnapshot.byAsset`)
- `computeVersementsEnAttente(asset, now)` → `{ nbVersements, montantTotal, nouvelleProchaineDate }` — versements périodiques dus (voir section Versements périodiques & prix de marché)

**`engine/priceFetcher.ts`** (pas pur : fetch réseau, mais zéro React) : `fetchPrixActifs(assets)` → `Record<assetId, { prix, fetchedAt } | { erreur }>` ; `isPriceFresh()`, `PRICE_FETCH_TTL_MS` (1 h) — ne pas dupliquer la logique Yahoo, tout passe par `fetchQuotes()` du module Finance

### Dashboard patrimonial (components/pages/DashboardPatrimoinePage.tsx)

2 onglets internes :
- **Vue d'ensemble** : patrimoine net en hero + variation vs snapshot précédent + badge « Mettre à jour » (> 30 j) ; KPIs ; `HealthScoreCard` réutilisé ; donut toggle classe/enveloppe fiscale ; top movers (masqué si < 2 snapshots) ; timeline (état vide si < 2 snapshots) ; 3 prochains événements de vie (`useStore.events`) ; 3 alertes P1 (mêmes moteurs que SmartAlerts)
- **Saisir mon patrimoine** : `PatrimoineSaisieTab` — 4 sections dépliables, badges fraîcheur (À jour / Ancien > 30 j / Très ancien > 90 j), `PatrimoineItemFormModal` contextuel par catégorie, bouton snapshot

Reçoit `results/envelopes/globalParams` **en props depuis le RunState** d'`App.tsx` (jamais de `runSimulation()` dans un `useEffect`).

### Succession (src/patrimoine/succession/)

**Moteur pur** (`successionEngine.ts`) — droit fiscal français, **barèmes 2024 hardcodés**, aucune API :
- `abattementParLien(lien)` : conjoint exonéré (TEPA 2007, Infinity), enfant/parent 100 000 €, petit-enfant 31 865 €, frère/sœur 15 932 € (7 967 € si conditions non remplies), neveu/nièce 7 967 €, autre 1 594 €
- `baremeSuccession(base, lien)` : ligne directe 7 tranches (5 % → 45 %), frères/sœurs 35/45 %, neveux 55 %, autres 60 %, conjoint 0
- `rappelFiscalDonations(donations, beneficiaireId)` : somme des donations `manuel` des 15 dernières années (réduit l'abattement)
- `exonerationAssuranceVie(montant, age)` : art. 990 I avant 70 ans (abattement 152 500 €/bénéf, 20 % ≤ 700 k€, 31,25 % au-delà) ; après 70 ans → régime 757 B (abattement global 30 500 € géré dans `computeSuccession`)
- `computeSuccession(patrimoineNet, assetsDetail, beneficiaires, donations, ageDuDefunt, options)` → `SuccessionResult` (masse, détail par bénéficiaire, totalDroits, patrimoineTransmisNet)

**`SuccessionPage`** : paramétrage à gauche (CRUD bénéficiaires avec warning parts ≠ 100 %, CRUD donations, toggle AV hors succession), résultats live à droite, slider « Projeter dans X ans » (ajoute la croissance simulée `results[X].totalNominal − results[0].totalNominal` à la masse).

### Coach IA Patrimonial (src/patrimoine/ai/coachEngine.ts + finance/components/ai/AIChatTab.tsx)

Le chat IA Finance est étendu en **coach patrimonial agentique** (même interface, même clé API, même modèle `claude-haiku-3-5`) :
- **`coachEngine.ts`** (pur) : `COACH_TOOLS` (définitions tool use Anthropic), `buildCoachContext()` (simulation + patrimoine + budget — construit côté moteur, pas dans le composant), `sanitizeProposedEvents()` (validation des LifeEvents proposés par le modèle), `compareScenarios()` (double `runSimulation()` pur avant/après), `comparisonToToolResult()`
- **Boucle agentique** dans `AIChatTab` (max 5 itérations, historique API avec content blocks distinct de l'affichage) :
  - `get_simulation_context` — exécuté automatiquement (lecture seule)
  - `propose_life_events` — **pause obligatoire** : carte de proposition avec boutons Confirmer/Annuler ; l'input est désactivé tant que la proposition est en attente
- Sur confirmation : `addLifeEvent()` (action utilisateur explicite) + comparaison renvoyée en `tool_result` → le modèle présente les métriques en langage naturel. Sur refus : `tool_result` « refusé », rien n'est écrit.

### Règles Patrimoine

- **Ne pas renommer** la clé `patrimoine-actuel-[profileId]` (rupture de persistance)
- **Aucune écriture croisée** : `usePatrimoineStore` ne modifie jamais `useStore` (et inversement) — les liens passent par `linkedEnvelopeId` (informatif) ou par une action utilisateur explicite
- **Ne jamais appeler `takeSnapshot()` automatiquement** (useEffect, timer…) — uniquement sur clic utilisateur
- **Le coach IA n'écrit JAMAIS dans un store sans confirmation explicite** — toute proposition passe par la carte Confirmer/Annuler ; ne pas contourner `sanitizeProposedEvents()`
- Les barèmes succession sont **hardcodés 2024** — pas d'API fiscale externe ; toute mise à jour de barème se fait dans `successionEngine.ts` uniquement
- Labels/couleurs/groupes de catégories : importer depuis `data/patrimoineCategories.ts`, ne pas redéfinir

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
