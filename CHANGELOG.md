# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.3.2] — 2026-07-08

### Fixed — Menus déroulants illisibles (blanc sur blanc)

- **`color-scheme: dark`** déclaré sur `:root` — les contrôles natifs (popup des `<option>`, calendrier des `input date`, scrollbars) sont désormais rendus en thème sombre par le navigateur au lieu du blanc système
- **Style global `select` / `option`** dans `index.css` (sélecteur au niveau élément) : fond `--surface-2`, texte `--ink`, hairline — tout futur `<select>` de n'importe quel module est lisible par défaut ; les selects déjà stylés par classe (`.btn…`) ou style inline gardent la priorité
- **Alias `--bg-elevated` défini** dans `:root` (`#141516`) — utilisé par ~12 fichiers de styles inline mais jamais défini (seul `--color-elevated` existait via le bridge `@theme`), les fonds retombaient en transparent

### Added — Versements périodiques automatiques (Patrimoine)

- **`PatrimoineMetadata.versementPeriodique`** : `{ montant, frequence: monthly|quarterly|annual, prochaineDate, actif }` — catégories financières uniquement
- **`computeVersementsEnAttente(asset, now)`** (`engine/patrimoineEngine.ts`) — compte les intervalles écoulés depuis `prochaineDate` (date système, clamp fin de mois, ancrage sans dérive, garde-fou 600 intervalles) et recalcule la prochaine date
- **`applyVersementsEnAttente()`** (store) — applique les versements dus (`currentValue += total`, `prochaineDate` avancée, `lastUpdatedAt`) ; retourne `{ updated, totalApplied, nbVersements }` ; **aucun snapshot automatique**
- UI : section « Versements périodiques » dans le formulaire d'actif financier (toggle, montant, fréquence, date) ; toast au lancement « X versements appliqués — +Y € sur Z actifs »

### Added — Prix de marché automatiques par ticker (Patrimoine)

- **`PatrimoineMetadata`** : `ticker` (Yahoo Finance, ex. `EWLD.PA`, `BTC-EUR`), `quantite`, `prixUnitaire` (readonly, calculé), `lastPriceFetchAt` — si ticker + quantité renseignés, `currentValue = prixUnitaire × quantite`
- **`engine/priceFetcher.ts`** — `fetchPrixActifs(assets)` : réutilise **exactement** `fetchQuotes()` du module Finance (même API Yahoo, proxy Vite dev, cache `finance-quote-cache` 5 min, échecs silencieux) + TTL propre 1 h sur `lastPriceFetchAt` ; aucune nouvelle dépendance
- **`refreshPrixMarche()`** (store) — met à jour prix et valeurs ; hors ligne : fail silencieux, dernière valeur connue conservée
- **Bloc d'initialisation unique** au mount d'`App.tsx` : `applyVersementsEnAttente()` puis `refreshPrixMarche()` (pattern `generateRecurringTransactions`, pas de useEffect réactif dispersé)
- UI : badge « ● Prix en direct » sur la ligne d'actif (date du dernier fetch au survol)

### Added — Lien passifs ↔ budget (proposition post-import)

- **`PatrimoineLiability.linkedBudgetCategoryId`** — pointe vers une `BudgetCategory`, purement informatif, aucune écriture croisée automatique
- Formulaire de passif : sélecteur « Catégorie budget associée » (lecture seule sur `useBudgetStore`)
- **`CsvImportModal`** : après confirmation d'un import, si des dépenses importées correspondent à une catégorie liée à un passif → carte de proposition « N remboursements détectés (total X €). Mettre à jour l'encours de [passif] ? » avec boutons **Mettre à jour** / **Ignorer** ; `upsertLiability()` uniquement sur clic explicite — seul pont autorisé entre les deux stores

---

## [1.3.1] — 2026-07-08

### Changed — Succession en page transverse autonome

- **Entrée sidebar dédiée « Succession »** (icône cadeau, sous Patrimoine) — la page n'est plus accessible uniquement depuis le dashboard Patrimoine ; le bouton « Succession / Donation » du header Patrimoine est conservé comme accès secondaire
- Nouveau raccourci clavier **`Cmd+0`** → Succession (suite de la séquence `Cmd+1..9`) ; `G S` dans la palette inchangé
- L'item sidebar Patrimoine n'est plus marqué actif sur la page Succession (chaque page a son entrée)

### Added — Aide contextuelle par page (`src/help/`)

Nouveau système d'aide consultable à tout moment, distinct du tour guidé (les deux coexistent sans se mélanger) :

- **`HelpButton`** — bouton « ? » rond et discret dans le header des 9 pages (Patrimoine, Succession, Dashboard simulation, Enveloppes, Budget, Finance, Éducation, Courtiers, Modèles)
- **`HelpOverlay`** — scrim plein écran `rgba(1,1,2,0.82)` (même teinte que le tour, sans découpe spotlight — composant indépendant de `SpotlightOverlay`) + panel centré : titre, intro, sections structurées, astuces mises en valeur ; fermable via Escape, clic scrim ou bouton Fermer
- **`useHelpStore`** — store Zustand minimal **sans persistance** (`isOpen` + page active) ; aucun store existant modifié
- **`HELP_CONTENTS`** — 8 contenus rédigés en français (3-5 sections par page) : calcul du patrimoine net, snapshots, masse successorale, rappel fiscal 15 ans, types d'ordres, Bar Replay, mots-clés de catégorisation, calculateurs interactifs…

### Added / Changed — Tour d'introduction enrichi

Audit complet des steps existants, puis :

- **Nouveau tour Patrimoine** (`patrimoineSteps.ts`, P1-P5) : patrimoine net, toggle répartition classe/enveloppe fiscale, onglet saisie, bouton snapshot (et son rôle pour la timeline), timeline & top movers
- **Nouveau tour Succession** (`successionSteps.ts`, SU1-SU4) : présentation du simulateur, ajout d'un bénéficiaire, lecture du tableau des droits, projection future
- Les deux tours sont enregistrés dans `TourController` (`DEFERRED_PAGES` — déclenchement à la première visite, même pattern que les autres pages transverses)
- **Gaps comblés dans les tours existants** :
  - Simulation : nouveau step `E5b` (événements de vie) ; step S4 corrigé (« 9 onglets » au lieu de 8, mention de l'onglet Analyse)
  - Finance : nouveau step `F5b` (onglet Bar Replay, seul onglet non couvert)
  - Courtiers : nouveau step `B4` (créer un courtier personnalisé)
  - Budget : nouveau step `BU5` (onglets avancés : import de relevés, récurrences, abonnements, calendrier, objectifs, dettes, prévisions)
- Nouveaux attributs `data-tour-id` : `patrimoine-net-hero`, `patrimoine-repartition-toggle`, `patrimoine-tab-seg`, `patrimoine-snapshot-btn` (vue d'ensemble), `patrimoine-timeline`, `succession-header`, `succession-benef-panel`, `succession-results-panel`, `succession-projection`, `life-events-section`, `budget-tabs`, `brokers-add-custom-btn`

---

## [1.6.0] — 2026-07-07

### Added — Module Patrimoine Réel (`src/patrimoine/`)

Nouveau module source de vérité du patrimoine **actuel** — distinct de la simulation (futur) et du budget (flux).

- **Types** (`types/patrimoine.ts`) : `PatrimoineAsset` (14 catégories d'actifs : comptes, PEA, AV, PER, CTO, crypto, immobilier principal/locatif, or, private equity, parts de société, véhicule, art, autre), `PatrimoineLiability` (5 catégories de passifs), `PatrimoineSnapshot` (photo à date avec `byCategory` + `byAsset`), `metadata` libre par catégorie (immobilier : adresse, surface, loyer, encours crédit…)
- **Store** `usePatrimoineStore` — clé **`patrimoine-actuel-[profileId]`** : `upsertAsset/removeAsset`, `upsertLiability/removeLiability`, `takeSnapshot()` (max 120 snapshots FIFO, **jamais automatique**), + paramétrage succession (`beneficiaires`, `donations`)
- **Moteur pur** (`engine/patrimoineEngine.ts`) : `computePatrimoineNet()` (totaux, byCategory, byEnvelopeFiscale, liquiditeRatio, tauxEndettement), `computeLTV()` (immobilier), `computeEmergencyCoverage()` (mois couverts via dépenses budget), `buildTimelineFromSnapshots()`, `computeTopMovers()`
- `linkedEnvelopeId` optionnel vers `Envelope.id` — purement informatif, **aucune écriture croisée** entre stores

### Added — Dashboard patrimonial (`components/pages/DashboardPatrimoinePage.tsx`)

Nouvelle page transverse `'patrimoine'` — **première page au lancement** (Cmd+9 / `G P`).

- **Onglet Vue d'ensemble** : patrimoine net en hero + variation vs snapshot précédent, badge « Mettre à jour » (> 30 j) ; KPIs (actifs, passifs, ratio liquidités, fonds d'urgence, endettement, taux d'épargne réel si budget) ; `HealthScoreCard` réutilisé ; donut avec toggle classe d'actifs / enveloppe fiscale ; top movers (entre 2 derniers snapshots) ; timeline AreaChart depuis les snapshots ; 3 prochains événements de vie ; 3 alertes P1 (mêmes moteurs que SmartAlerts)
- **Onglet Saisir mon patrimoine** : 4 sections dépliables (financier / immobilier / alternatif / passifs), badges de fraîcheur (À jour / Ancien > 30 j / Très ancien > 90 j), formulaire contextuel par catégorie (immobilier : adresse/surface/loyer/encours/acquisition ; bancaire : établissement/IBAN/liaison enveloppe), bouton « Prendre un snapshot maintenant » avec toast de confirmation

### Added — Simulateur Succession / Donation (`src/patrimoine/succession/`)

- **Moteur pur** (`successionEngine.ts`) — droit fiscal français, barèmes 2024 hardcodés : `abattementParLien()` (conjoint exonéré TEPA, enfant/parent 100 k€, petit-enfant 31 865 €, frère/sœur 15 932/7 967 €, neveu 7 967 €, tiers 1 594 €), `baremeSuccession()` (7 tranches ligne directe 5→45 %, frères/sœurs 35/45 %, neveux 55 %, tiers 60 %), `rappelFiscalDonations()` (15 ans), `exonerationAssuranceVie()` (990 I : 152 500 €/bénéf puis 20 %/31,25 % ; 757 B : abattement global 30 500 €), `computeSuccession()` → détail par bénéficiaire (part, abattement, base imposable, droits, taux effectif)
- **`SuccessionPage`** (page `'succession'`, `G S`, accessible depuis le dashboard Patrimoine) : CRUD bénéficiaires (warning si parts ≠ 100 %), CRUD donations 15 ans, toggle AV hors succession, résultats recalculés live, slider « Projeter dans X ans » (croissance simulée ajoutée à la masse)

### Added — Coach IA Patrimonial agentique

Extension du chat IA existant (`finance/components/ai/AIChatTab.tsx`) — pas de nouvelle interface.

- **Moteur** (`src/patrimoine/ai/coachEngine.ts`, pur) : `COACH_TOOLS` (tool use Anthropic), `buildCoachContext()` (simulation + patrimoine réel + budget, construit côté moteur), `sanitizeProposedEvents()`, `compareScenarios()` (double `runSimulation()` pur avant/après), `comparisonToToolResult()`
- **Boucle agentique** dans AIChatTab (max 5 itérations) : `get_simulation_context` auto-exécuté ; `propose_life_events` → **carte de proposition avec Confirmer/Annuler obligatoire** — l'IA n'écrit JAMAIS dans le store sans confirmation explicite
- Après confirmation : événements ajoutés via `addLifeEvent`, comparaison avant/après renvoyée au modèle qui présente les métriques clés (capital final, euros constants, revenus passifs 4 %) en langage naturel

### Changed

- `AppPage` : **10 valeurs** — `'dashboard'` renommé **`'simulation_dashboard'`**, ajout `'patrimoine'` (page d'accueil) et `'succession'` ; sidebar : « Patrimoine » en tête des pages transverses
- Raccourcis : `Cmd+9` → Patrimoine ; palette `G P` (Patrimoine) / `G S` (Succession) ; `Cmd+1` → tableau de bord simulation (inchangé)
- `tour/steps/simulationSteps.ts` + `TourController` : pages renommées `simulation_dashboard`
- `profileService.deleteProfile()` purge aussi `patrimoine-actuel-[id]`

---

## [1.5.0] — 2026-07-07

### Fixed — Tour guidé : positionnement du spotlight (`src/tour/`)

- **Mesure après stabilisation du layout** : `getBoundingClientRect()` n'est plus capturé sur un timer fixe (350 ms) après `scrollIntoView` smooth, mais via une boucle `requestAnimationFrame` qui attend que le rect soit immobile sur 3 frames consécutives (timeout 2 s) — corrige les découpes décalées après scroll, montage de charts ou navigation de page
- **Suivi continu de la cible** : `ResizeObserver` sur l'élément ciblé + listeners scroll (capture, conteneurs internes inclus) / resize + poll de sécurité 250 ms — le spotlight suit les layout shifts silencieux
- **Bulle toujours dans le viewport** : hauteur réelle mesurée (`useLayoutEffect`, avant paint) au lieu d'une estimation fixe de 200 px ; placement dessous → dessus → côté → flottant, clampé aux 4 bords avec `maxHeight` + scroll interne
- **Viewport réactif** : `vw`/`vh` en état React mis à jour au resize (les 4 quads du scrim se recalculent)
- **Nettoyage complet des timers** (le timeout imbriqué post-scroll fuyait sur changement de step)
- **Steps réparés** : `finance-tab-backtest` (onglet inexistant depuis la refonte 1.4.0) → `finance-tab-journal` (contenu mis à jour) ; `brokers-import-hint` (jamais implémenté) → `brokers-filter-area`
- Vérifié par test Playwright automatisé : 34 contrôles (ring aligné ±3 px sur la cible, bulle entièrement visible, cible dans le viewport) sur les tours simulation/dashboard/optimiseur/budget, en 1440×900 et 1024×640

### Added — Budget : abonnements, calendrier, objectifs, dettes

`BudgetPage` passe de 4 à **8 onglets** : Vue d'ensemble / Transactions / Récurrences / **Abonnements** / **Calendrier** / **Objectifs** / **Dettes** / Prévisions.

- **Gestionnaire d'abonnements** (`engine/subscriptionEngine.ts`, `components/subscriptions/SubscriptionsPanel.tsx`) : liste les dépenses récurrentes (règles actives + détection complémentaire via `detectRecurringCandidates`, dédupliquée par libellé normalisé), coût mensuel normalisé + coût annuel, date de prochain renouvellement (dayOfMonth ou dernière transaction + période), bandeau J-7 avant chaque renouvellement, bouton « Confirmer » pour promouvoir un abonnement détecté en règle
- **Calendrier de prélèvements** (`engine/paymentCalendarEngine.ts`, `components/calendar/PaymentCalendar.tsx`) : grille mensuelle (lun–dim) des dépenses fixes/récurrentes — transactions réelles du mois + règles à venir (italique), total du mois, jour courant surligné
- **Objectifs d'épargne** (`engine/savingsGoalsEngine.ts`, `components/goals/SavingsGoalsPanel.tsx`, type `SavingsGoal`) : objectifs nommés avec montant cible, date cible optionnelle, enveloppe budgétaire liée optionnelle, montant de départ ; progression depuis les transactions réelles, rythme = moyenne des 3 derniers mois pleins, projection de la date d'atteinte + statut « dans les temps / en retard » ; persistés dans `useBudgetStore` (`savingsGoals` + CRUD)
- **Plan de remboursement de dettes** (`src/engine/debtPayoffEngine.ts`, `components/debts/DebtPlanPanel.tsx`) : lit `useStore.liabilities` en **lecture seule**, simule avalanche vs snowball mois par mois (intérêts composés, boule de neige des mensualités libérées, effort supplémentaire réglable 0–1000 €), graphique comparatif, ordre de remboursement, date de fin et intérêts économisés vs mensualités minimales

### Added — Dashboard : score de santé + onglet Analyse

- **Score de santé financière** (`src/engine/healthScoreEngine.ts`, `results/HealthScoreCard.tsx`) : indicateur 0–100 sous les KPIs — 4 composantes pondérées (taux d'épargne réel 30, maîtrise du budget 20, endettement 30, objectifs 20), poids redistribués si une source de données manque, jauge circulaire + barres par composante, grades excellent/bon/fragile/critique
- **Onglet Dashboard `'analyse'`** (9ᵉ onglet, label « Analyse ») regroupant :
  - **Benchmark de portefeuille** (`src/engine/benchmarkEngine.ts`, `src/data/benchmarkData.ts`, `results/BenchmarkPanel.tsx`) : mêmes flux de versements investis dans MSCI World / S&P 500 / CAC 40 GR (rendements annualisés historiques statiques, aucune API), graphique superposé + écart à terme
  - **Stress test** (`src/engine/stressTestEngine.ts`, `results/StressTestPanel.tsx`) : scénarios 2008 (-50 %), Covid 2020 (-35 %), dot-com (-75 %), personnalisé (slider) ; sensibilités par classe (actions ×1, crypto ×1,5, immobilier ×0,5, obligations ×0,3, livrets ×0) ; temps de récupération selon l'effort d'épargne actuel + rendement pondéré
  - **Calendrier de dividendes** (`src/engine/dividendCalendarEngine.ts`, `results/DividendCalendarPanel.tsx`) : revenus passifs estimés par trimestre depuis les rendements saisis — SCPI/ETF distribuants (trimestriel), obligations (T2/T4), dividendes CTO (`dividendRate` / `estimatedMonthlyDividends`) ; sélecteur d'année

### Added — Alertes budgétaires (2 règles) & export Excel

- `generateBudgetAlerts()` — 2 nouveaux paramètres optionnels (`recurringRules`, `today`) et 2 règles :
  - **e. Anomalie de catégorie** : dépense du mois > +40 % vs moyenne des 3 mois précédents (min 2 mois d'historique, écart ≥ 20 €) → tip P2
  - **f. Abonnement non utilisé probable** : règle mensuelle active sans transaction correspondante (id de règle ou libellé normalisé) à J+5 de sa date habituelle, mois courant uniquement → tip P3
- **Export Excel du bilan net** (`src/utils/exportNetWorthXlsx.ts`, bouton sur `NetWorthPanel`) : classeur SheetJS 3 feuilles — Bilan net (projection 5 ans), Actifs par enveloppe (capital par année), Passifs (restant dû, intérêts restants, projection 5 ans)

### Changed
- `ChartTab` (Dashboard) : 9 valeurs (ajout `'analyse'`)
- `BudgetTab` : 8 valeurs
- Exception SheetJS étendue : `xlsx` utilisé dans `budget/engine/xlsxImport.ts` **et** `utils/exportNetWorthXlsx.ts` (import + export uniquement)
- `normalizeLabel()` exporté depuis `budget/engine/recurringDetector.ts` (réutilisé par abonnements, calendrier et alertes)

---

## [1.4.0] — 2026-07-07

### Added — Module Finance : simulateur de trading professionnel

Refonte du paper trading Finance au niveau des simulateurs de tier 1 (thinkorswim paperMoney, IBKR TWS paper). Scope exclusivement `src/finance/` — aucun autre module touché, aucune dépendance ajoutée.

#### Types d'ordres complets (`engine/tradingEngine.ts`, `OrderPanel.tsx`)
- **6 types** : Market, Limite, Stop, Stop-Limit, Trailing Stop, OCO (One-Cancels-Other)
- Sémantique broker rigoureuse : un limit n'est exécuté que si le prix **croise** le niveau (strictement au-delà, pas seulement touché), fill garanti au prix limite sans slippage
- Le stop déclenche un ordre **market** à l'activation (slippage appliqué) ; le stop-limit arme une jambe limite (`stopTriggered`) ; le trailing stop suit le prix à distance `trailingPct` (high-water mark persisté via `orderPatches`)
- OCO : deux ordres liés par `ocoGroupId` — le premier exécuté annule le second (`cancelledOrderIds`)
- Les ordres sont vérifiés côté buy ET sell (stop d'achat sur breakout, limite d'achat au repli)

#### Réalisme d'exécution
- **Slippage configurable par compte** : `TradingAccount.slippagePct` = spread bid-ask simulé (%), chaque fill market paie le demi-spread dans le sens défavorable (`applySlippage`)
- **Commissions configurables par compte** : `commissionMode: 'percent' | 'flat'` — % du montant (`feeRate`) ou forfait par ordre (`commissionFlat`) ; réglables à la création (`NewAccountModal`) et a posteriori (`AccountSettingsModal`, nouveau)
- P&L net rigoureux : les commissions d'entrée sont capitalisées sur la position (`Position.entryCommission`) et imputées **au prorata** à chaque sortie partielle ; `Trade.grossPnL` (brut) et `realizedPnL` (net) distincts

#### Bar Replay (`engine/replayEngine.ts`, `components/replay/ReplayTab.tsx`) — nouvel onglet Finance
- L'utilisateur choisit un actif, une période d'historique (1M→5Y) et un **point de départ** (slider), puis le marché se déroule bougie par bougie : play/pause, pas-à-pas, vitesse 0.5×→5×
- Ordres passés en replay comme en live (market/limite/stop/trailing) — fills testés sur le **high/low** de chaque bougie, horodatés au temps de la bougie
- Session éphémère avec compte virtuel dédié (capital/commission/spread configurables), indépendante des comptes paper persistés — stats de session (win rate, PF, expectancy, max DD) affichées en direct
- Graphique chandeliers dédié avec mise à jour incrémentale (lightweight-charts, déjà présent)

#### Journal de trading (`components/journal/JournalTab.tsx`) — nouvel onglet Finance
- Chaque trade fermé est loggé automatiquement : instrument, date/heure d'entrée réelle (`Position.openedAt`) et de sortie, prix E/S, taille, **P&L brut, P&L net, RRR réalisé, durée**
- Note libre éditable par trade (`Trade.note`, action store `updateTrade`)
- Triable (date, instrument, taille, P&L brut/net, RRR, durée), filtrable (instrument, gagnants/perdants), export CSV complet
- Un journal par compte (sélecteur de compte intégré)

#### Dashboard de performance (`engine/performanceEngine.ts`, `PerformanceDashboard.tsx`)
- Calculé sur le P&L **net** de la courbe d'equity réalisée : win rate, profit factor, expectancy (€/trade), max drawdown (% ET valeur absolue), **Sharpe annualisé base hebdomadaire** (√52, semaines sans trade incluses à 0), RRR moyen réalisé, gains/pertes consécutifs max, gain/perte moyens, commissions totales, durée moyenne
- Courbe d'equity réalisée (Recharts) avec ligne de référence au capital initial

#### Position sizing (`engine/positionSizing.ts`, intégré au ticket d'ordre)
- Panel pliable dans `OrderPanel` : capital du compte, risque max (% ou €), niveau de stop → **taille de position exacte** (quantité, valeur, risque effectif), plafonnée au capital (pas de levier)
- « Appliquer la taille » préremplit la quantité ; le stop prévu est mémorisé sur la position (`plannedStopPrice`, base du RRR du journal) et un **ordre stop-loss est attaché automatiquement** après l'achat market (option cochable)

#### Comptes virtuels multiples
- Déjà multi-comptes ; ajout : paramètres d'exécution par compte (commissions, spread), renommage et **suppression de compte** (avec confirmation) via `AccountSettingsModal` — chaque compte garde ses positions, ordres, journal et dashboard propres (`Record<accountId, T>`, clé `patrimoine-finance` inchangée)

### Changed
- `FinanceTab` : 2 nouveaux onglets top-level `'journal'` et `'replay'` (8 onglets Finance au total)
- `checkPendingOrders()` : nouvelle signature — retourne aussi `cancelledOrderIds` (OCO) et `orderPatches` (trailing/stop-limit), accepte `priceRanges` (high/low, mode replay) et `now` (horodatage replay) en options
- `executeMarketOrder()` : slippage + commission intégrés au fill ; `fillOrder()` exporté (fills limite sans slippage)
- Rétrocompatibilité totale : anciens comptes (`commissionMode` absent = `'percent'`), anciens ordres `stop_loss` (fallback `stopPrice ?? limitPrice`), anciennes positions (fallbacks `openedAt`/`entryCommission`)

---

## [1.3.3] — 2026-07-06

### Added

- **`LifeEvents` et `TaxOptimizer` enfin branchés à l'UI** — l'audit a révélé que ces deux composants n'avaient jamais été montés (aucun import depuis le commit initial) :
  - `LifeEvents` : section "Événements de vie" en bas de la liste d'enveloppes (`EnvelopesPage`) — CRUD complet, `addLifeEvent`/`removeLifeEvent` marquent `isDirty`
  - `TaxOptimizer` : bouton "Optimiser fiscalité" dans le header du Dashboard → modal de suggestions ; "Appliquer" patch le versement mensuel via `updateEnvelope`

### Fixed

- **`package.json`** : champ `version` resynchronisé avec le changelog (était resté à 1.0.0)
- **`profileService.deleteProfile(id)`** : purge désormais TOUTES les clés localStorage par profil (`patrimoine-education-`, `patrimoine-tour-`, `patrimoine-custom-banks-`, `patrimoine-budget-` en plus de `patrimoine-data-`) — plus de clés orphelines après suppression d'un profil

### Changed — Audit & nettoyage de dette technique (aucun changement de comportement utilisateur)

#### Déduplication de logique
- **Budget** : helpers `txMonth()`, `addMonths()`, `currentYearMonth()`, `uid()` centralisés dans `budgetEngine.ts` (étaient dupliqués dans `useBudgetStore`, `BudgetPage`, `forecastEngine`, `recurringDetector`, `AddTransactionModal`)
- **Budget** : `UNCATEGORIZED_ID` exporté depuis `defaultCategories.ts` (était défini 3×)
- **Budget** : `formatEur` importé depuis `utils/format.ts` dans les 4 composants qui le redéfinissaient localement
- **Budget** : `CategoryManagerModal` utilise `normalizeText()` (au lieu d'un `toLowerCase()` local) pour retrouver la catégorie propriétaire d'un mot-clé dupliqué
- **Finance** : `formatPrice()` déplacé dans `utils/format.ts` (était dupliqué à l'identique dans `AssetTable` et `AnalysisTab`)
- **Finance** : `loadHistCache()` exporté par `priceService.ts` — `ScreenerTab` ne lit plus la clé `finance-hist-cache` en dur
- **Éducation** : `patrimcorpData.ts` importe `mulberry32()` et `sampleNormal()` depuis `engine/markovEngine.ts` (implémentations identiques, données générées inchangées)

#### Code mort supprimé
- Composants orphelins supplantés par les refontes v1.1.0 (plus importés nulle part) : `EnvelopeCard`, `EnvelopeMetaSection`, `EnvelopeProjectionSection`, `EnvelopeAssetsFees`, `EnvelopeTaxInfo`, `AllocationRow` (remplacés par l'implémentation inline d'`EnvelopesPage`), `SimulationTabs`, `SimulationDropdown` (remplacés par la sidebar), `ModelsPage` (remplacé par `ModelsReferencePage`)
- Onglet "Modèles & Formules" retiré de `DataModal` (doublon de la page Modèles dédiée) — les onglets actifs / frais bancaires / glossaire restent
- Valeur `'data'` retirée du type `AppPage` (`App.tsx` + `TourController`) — aucune navigation ne l'utilisait
- Exports jamais consommés : `parseCsvTransactions` (csvImport), `runSingleTrajectory` (markovEngine), `effectivePERReturn`, `computeImpliedReturns`, `buildMarketWeightsForAssets` (portfolioOptimizer), `conditionLabel` (alertsService), `MAIN_FAKEOUT_LEVEL`, `MAIN_SQUEEZE_RANGE`, `EXERCISE_SQUEEZE_RANGE` (patrimcorpData)
- Variables inutilisées : paramètre `month` de `recurringAmountForMonth` (forecastEngine), destructuration `transactions` dans `generateRecurringTransactions` (useBudgetStore)

#### Documentation
- `CLAUDE.md` : arborescence, type `AppPage` (8 valeurs), stack (`lightweight-charts`, `xlsx`), API des moteurs et constantes resynchronisés avec le code réel
- `src/README_DEV.md` : références aux composants supprimés corrigées
- Correction d'un warning React (clés manquantes sur fragments dans `RegimeParamsTable`, page Modèles)

---

## [1.3.2] — 2026-06-19

### Added

#### Budget — Catégorisation automatique par mots-clés

- **`BudgetCategory.keywords?: string[]`** — liste de mots-clés normalisés (lowercase, sans accents) associés à chaque catégorie, gérés via `addKeywordToCategory` ; fonctionne aussi sur les catégories système (`isSystem: true`)
- **`BudgetTransaction.categorySource?`** — `'manual' | 'keyword_match' | 'default'` ; absent = traité comme `'manual'` pour ne jamais écraser les catégorisations antérieures silencieusement
- **`categoryMatcher.ts`** (`src/budget/engine/`) — fonctions pures :
  - `normalizeText(text)` — normalisation NFD + lowercase + collapse espaces
  - `matchCategoryByKeyword(label, categories)` — retourne `{ categoryId, matchedKeyword } | null` ; le mot-clé normalisé le plus long gagne ; keywords < 3 caractères ignorés
  - `applyKeywordMatching(transactions, categories)` — remapping pur, ne touche jamais `categorySource === 'manual'`
- **Store** : 3 nouvelles actions dans `useBudgetStore` :
  - `addKeywordToCategory(categoryId, keyword)` → `{ success, error?: 'duplicate' | 'too_short' }` — unicité globale par keyword normalisé
  - `removeKeywordFromCategory(categoryId, keyword)`
  - `recategorizeTransactions(scope: 'uncategorized_only' | 'all_non_manual')` → `{ updated: number }`
- **Import** : `mapRowsToTransactions` accepte un 3ème argument optionnel `categories?` pour appliquer le keyword matching au moment du parsing ; `parseCsvTransactions` wrapper mis à jour en conséquence ; `CsvImportModal` passe `categories` au build de la preview
- **`AddTransactionModal`** : debounce 300 ms sur le champ libellé → pré-sélection automatique de la catégorie par `matchCategoryByKeyword` ; badge "suggestion mot-clé" si la suggestion est active ; `categorySource: 'manual'` au submit
- **`CategoryManagerModal`** entièrement revu :
  - Chaque catégorie est désormais cliquable (expand/collapse) pour afficher sa section mots-clés : chips supprimables + champ d'ajout (Enter ou "+") avec erreur inline (`duplicate` / `too_short`)
  - Badge compteur de mots-clés sur chaque catégorie
  - Section "Recatégoriser les transactions" : choix de scope + bouton Appliquer + feedback nombre de lignes mises à jour

---

## [1.3.1] — 2026-06-19

### Added

#### Import bancaire — support XLSX + mapping avancé

- **Dépendance** : `xlsx` (SheetJS) ajouté comme seule lib externe tolérée dans le module Budget — utilisée uniquement pour la conversion xlsx → `string[][]` dans `xlsxImport.ts`, jamais pour le CSV
- **`xlsxImport.ts`** (`src/budget/engine/xlsxImport.ts`) : `parseXlsxRaw(arrayBuffer, sheetIndex?)` → `{ rows: string[][], sheetNames: string[] }` — retourne la même forme que `parseCsvRaw()` pour un pipeline partagé ; utilise `cell.w` (texte formaté) plutôt que `cell.v` pour préserver les décimales à virgule et formats de date bancaires
- **`CsvColumnMapping`** étendu (`src/budget/types/budget.ts`) :
  - `amountMode` : nouveau mode `'debit_credit_columns'` pour les exports avec colonnes Débit/Crédit séparées (Crédit Agricole, CIC, etc.)
  - `debitColumnIndex?` / `creditColumnIndex?` : colonnes utilisées si `amountMode === 'debit_credit_columns'`
  - `headerRowIndex: number` : index de la ligne d'en-tête — permet de sauter les lignes de préambule bancaire (solde initial, coordonnées agence, etc.)
- **`csvImport.ts`** refactorisé : `mapRowsToTransactions(rows, mapping)` — nouvelle fonction principale source-agnostique ; applique `headerRowIndex` en interne ; gère les 3 modes de montant. `parseCsvTransactions` conservée comme wrapper de compatibilité (`headerRowIndex: -1`)
- **`CsvImportModal.tsx`** mis à jour (`src/budget/components/import/`) :
  - `accept=".csv,.xlsx,.xls"` + détection par extension (CSV → `readAsText`, XLSX/XLS → `readAsArrayBuffer`)
  - Étape 2 (conditionnelle) : sélecteur de feuille si le fichier xlsx contient plusieurs onglets
  - Étape 3 — mapping : tableau des 8 premières lignes brutes avec sélection de la ligne d'en-tête au clic ; bouton "Débit / Crédit séparés" dans le sélecteur de mode montant avec deux sélecteurs de colonnes dédiés
  - `StepIndicator` dynamique (3 ou 4 étapes selon le type de fichier)
  - Description mise à jour : Boursorama, Fortuneo, LCL et **Crédit Agricole** supportés

### Changed

- **`CLAUDE.md`** : section Budget V2 mise à jour — `CsvColumnMapping` avec les 3 nouveaux champs, doc `xlsxImport.ts`, exception SheetJS documentée, composant `CsvImportModal` reflète le wizard 3-4 étapes

---

## [1.3.0] — 2026-06-19

### Added

#### Module Budget V2 — Import CSV, Récurrences, Prévisions

- **Types** : `BudgetTransaction['source']` étendu avec `'recurring'` ; nouveau type `CsvColumnMapping` (`src/budget/types/budget.ts`)
- **Données** : catégorie système `'var-uncategorized'` ajoutée dans `DEFAULT_CATEGORIES` (catégorie par défaut pour les imports CSV non mappés)
- **`csvImport.ts`** (`src/budget/engine/csvImport.ts`) : fonctions pures ZÉRO lib externe — `detectDelimiter()`, `parseCsvRaw()`, `computeImportHash()`, `parseCsvTransactions()` (modes `signed` / `absolute`, parse dates DD/MM/YYYY et YYYY-MM-DD, décimales virgule→point)
- **`recurringDetector.ts`** (`src/budget/engine/recurringDetector.ts`) : `detectRecurringCandidates()` — groupement par libellé normalisé + montant ±5% médian, validation intervalle (weekly ±3j · monthly ±5j · quarterly ±10j · annual ±15j), fréquence déduite, montant = médiane, dayOfMonth = mode ; retourne `RecurringRule[]` `active:false` — aucune activation automatique
- **`forecastEngine.ts`** (`src/budget/engine/forecastEngine.ts`) : `forecastCashflow()` — baseline moyenne mois complets passés + règles récurrentes actives, confidence `high`/`medium`/`low` selon historique, 6 mois de projection par défaut
- **Store V2** (`src/budget/store/useBudgetStore.ts`) : implémentation des 4 actions V2 : `importTransactions()` (dédoublonnage hash), `upsertRecurringRule()`, `removeRecurringRule()`, `generateRecurringTransactions()` ; `setSelectedMonth` déclenche maintenant `generateRecurringTransactions` directement
- **`CsvImportModal.tsx`** (`src/budget/components/import/`) : wizard 3 étapes — upload FileReader (0 appel réseau) + détection délimiteur auto → mapping colonnes (date/montant/libellé/type, toggle signé/absolu, format date) avec aperçu header → preview transactions parsées (doublons grisés en temps réel) → confirmation + résultat `imported/duplicatesSkipped`
- **`RecurringRulesPanel.tsx`** (`src/budget/components/recurring/`) : section "Règles actives" (CRUD inline avec `RuleForm`) + section "Suggestions détectées" (bouton Analyser → `detectRecurringCandidates` → state local → Confirmer/Ignorer par suggestion)
- **`CashflowForecastChart.tsx`** (`src/budget/components/forecast/`) : Recharts `ComposedChart` — barres groupées revenus/dépenses estimés + ligne pointillée solde net, badge confidence coloré, tokens CSS cohérents avec `PatrimoineChart`

### Changed

- **`BudgetPage.tsx`** : ajout de 4 onglets secondaires (Vue d'ensemble / Transactions / Récurrences / Prévisions) ; bouton "Importer un relevé" dans l'onglet Transactions ; bandeau gap simulation masqué sur l'onglet Prévisions
- **`CLAUDE.md`** : section `## Budget` enrichie avec les nouvelles fonctions/composants V2

---

## [1.2.0] — 2026-06-19

### Added

#### Module Budget (`src/budget/`) — MVP V1

- **Types** (`src/budget/types/budget.ts`) : `BudgetCategory`, `BudgetEnvelope`, `BudgetTransaction`, `RecurringRule`, `EnvelopeMonthlyStat`, `MonthlyBudgetSnapshot`, `SimulationGapResult`, `CashflowForecastPoint` — types complets incluant les champs V2 (`recurringRuleId`, `importHash`) pour éviter une migration ultérieure
- **Données par défaut** (`src/budget/data/defaultCategories.ts`) : `DEFAULT_CATEGORIES` — 22 catégories système réparties en 4 groupes (`income`, `fixed`, `variable`, `savings`) avec couleurs; `CATEGORY_GROUP_LABELS`
- **Store** (`src/budget/store/useBudgetStore.ts`) : Zustand persist, clé dynamique `patrimoine-budget-[profileId]`, indépendant de `useStore` et `useFinanceStore`; actions V1 : CRUD transactions/enveloppes/catégories + `setSelectedMonth`; `selectedMonth` exclu de la persistance via `partialize`
- **Moteur** (`src/budget/engine/budgetEngine.ts`) : fonctions pures ZÉRO import React — `computeEnvelopeStat()`, `computeMonthlySnapshot()` (avec gestion du rollover entre mois), `compareToSimulationAssumption()` (lecture seule de `GlobalParams.investmentRate`, seuils ok/warning/critical à ±5pt/±15pt)
- **BudgetPage** (`src/budget/components/BudgetPage.tsx`) : racine — sélecteur de mois avec navigation ‹/›, layout 2 colonnes (overview + grille enveloppes + transactions), snapshot calculé à la volée
- **BudgetOverviewPanel** (`src/budget/components/BudgetOverviewPanel.tsx`) : 4 KPIs (revenus/dépenses/épargne/taux), barre budget utilisé, donut Recharts dépenses par catégorie avec légende liste — cohérent visuellement avec `AllocationPieChart`
- **BudgetVsSimulationBanner** (`src/budget/components/BudgetVsSimulationBanner.tsx`) : bandeau affiché uniquement si `severity !== 'ok'`; lien vers `EnvelopesPage` via prop `onGoToEnvelopes`
- **EnvelopeGrid** (`src/budget/components/envelopes/EnvelopeGrid.tsx`) : grille auto-fill avec formulaire d'ajout inline (label, montant, catégorie, rollover)
- **BudgetEnvelopeCard** (`src/budget/components/envelopes/BudgetEnvelopeCard.tsx`) : barre de progression 3 segments (dépensé/restant/report), édition inline de `monthlyAllocation`, badge "DÉPASSÉ" si `remaining < 0`
- **TransactionList** (`src/budget/components/transactions/TransactionList.tsx`) : liste triée par date décroissante avec compteur
- **TransactionRow** (`src/budget/components/transactions/TransactionRow.tsx`) : date, libellé, catégorie (dot coloré + label), montant coloré par type, suppression
- **AddTransactionModal** (`src/budget/components/transactions/AddTransactionModal.tsx`) : sélecteur type dépense/revenu/virement, champs label/montant/date/catégorie/enveloppe/note, filtrage catégories selon le type
- **CategoryManagerModal** (`src/budget/components/categories/CategoryManagerModal.tsx`) : CRUD catégories perso avec sélecteur de couleur; catégories système non supprimables (badge "système")

#### Alertes budgétaires

- **`budgetAlertsEngine.ts`** (`src/budget/engine/budgetAlertsEngine.ts`) : moteur d'alertes pur (ZÉRO import React) — `generateBudgetAlerts(snapshot, envelopes, categories, transactions, gapResult) → Alert[]` — 4 règles : dépassement enveloppe (fixed=P1 warning / variable=P2 tip), écart taux d'épargne vs simulation (critical=P1 / warning=P2), épargne supérieure à l'hypothèse (P3 success), transactions orphelines sans enveloppe (P2 tip)
- **`SmartAlerts.tsx`** mis à jour : fusion des alertes simulation (`generateAlerts`) + alertes budget (`generateBudgetAlerts`), re-tri global par priorité ; calcul silencieux si aucune donnée budget ; bug préexistant de hooks corrigé (double `useStore` après early return consolidé en un seul appel) ; nouveau prop `onGoToBudget?: () => void` pour naviguer vers la page Budget depuis un bouton d'action ; type interne `AnyAlert` étend `Alert.actionTarget` avec `'budget'` sans modifier `alertsEngine.ts`
- **`DashboardPage`** et **`App.tsx`** mis à jour : prop `onGoToBudget` threadé jusqu'à `SmartAlerts`

#### Navigation & Tour

- `AppPage` étendu à 9 valeurs : ajout de `'budget'` (page transverse, sidebar haute)
- Raccourci Cmd+8 / palette G G pour accéder directement à la page Budget
- **`BUDGET_STEPS`** (`src/tour/steps/budgetSteps.ts`) : 4 étapes de visite guidée (sélecteur mois, vue d'ensemble, enveloppes, transaction)
- `TourController` mis à jour : `budget` ajouté aux `DEFERRED_PAGES`, déclenché à la première visite

### Changed

#### `src/App.tsx`
- Type `AppPage` étendu : `| 'budget'`
- Ajout `IconBudget` (SVG Linear-style)
- Entrée "Budget" dans la sidebar (pages transverses) + entrée palette de commandes "G G" + raccourci Cmd+8
- Rendu conditionnel `<BudgetPage onGoToEnvelopes={...} />`

#### `src/tour/components/TourController.tsx`
- Import `BUDGET_STEPS` + case `'budget'` dans `getPageSteps()`
- `DEFERRED_PAGES` et `AppPage` local mis à jour

#### `CLAUDE.md`
- Arborescence projet mise à jour (ajout `src/budget/`)
- Nouvelle section `## Budget (src/budget/)` complète
- `AppPage` mis à jour (8 → 9 valeurs)
- Raccourcis clavier, clés localStorage, pages transverses, règles "NE doit PAS faire" mis à jour

---

## [1.1.0] — 2026-06-18

### Added

#### Module Éducation (`src/education/`)
- 7 modules de cours interactifs couvrant l'ensemble du parcours investisseur :
  1. Les Fondamentaux (inflation, intérêts composés, risque/rendement, profil investisseur)
  2. Allocation d'actifs (classes d'actifs, diversification, allocation selon l'âge, rééquilibrage)
  3. Enveloppes fiscales françaises (PEA, Assurance-vie, PER, CTO)
  4. Sélectionner ses investissements (ETF, Obligations, SCPI, Crypto)
  5. Lire et analyser un marché (chandeliers, tendances/S/R, RSI, MACD, Bollinger/ATR, stratégie live)
  6. Gérer son portefeuille dans le temps (DCA, drawdown, TWR/MWR, biais cognitifs, discipline)
  7. Optimiser sa fiscalité (PFU, tax-loss harvesting, succession, transmission)
- 29 leçons + 10 exercices (QCM, simulateurs interactifs, exercice pratique d'analyse technique sur PatrimCorp)
- Progression séquentielle déverrouillée : compléter un module débloque le suivant
- `QuizScreen` : composant QCM réutilisable avec correction immédiate
- `EduCandleChart` + `EduIndicatorPanel` : graphiques interactifs adaptés à l'enseignement
- `useEducationStore` : persistance de progression par profil (`patrimoine-education-[profileId]`)
- Écran de complétion global affiché après les 7 modules

#### Page Courtiers (`src/components/pages/BrokersPage.tsx`)
- Page dédiée au comparateur de courtiers/banques, remplaçant l'ancien onglet "Banques" intégré au DataModal
- `AddBankModal` : formulaire complet pour créer ou éditer un courtier personnalisé (nom, type, note /5, pros/cons, frais par enveloppe)
- `useCustomBanks` : store Zustand persisté par profil pour les courtiers personnalisés (`patrimoine-custom-banks-[profileId]`)
- `BanksTab` enrichi : filtrage par type, mode comparaison multi-sélection (max 3), import direct de frais dans une enveloppe active
- `BankCard` enrichi : badge "personnalisé", actions édition/suppression en ligne pour les courtiers créés par l'utilisateur

#### Page Modèles & Formules (`src/components/pages/ModelsReferencePage.tsx`)
- Page dédiée à la référence mathématique exhaustive de tous les calculs de l'application
- 8 sections documentées avec navigation latérale fixe :
  Simulation & Épargne · Fiscalité française · Retraite & Revenus passifs · Crédit & Bilan net ·
  Indicateurs techniques · Monte-Carlo & Markov · Black-Litterman & CVaR · Métriques de backtest
- Rendu LaTeX via `KatexFormula` (bibliothèque KaTeX 0.17)
- Calculateurs interactifs (`InteractiveExample`) pour 10+ formules financières

#### Système de visite guidée Spotlight (`src/tour/`)
- `WelcomeForm` : formulaire de bienvenue (prénom, âge) affiché une seule fois au premier lancement
- `SpotlightOverlay` : overlay visuel (scrim + bulle positionnée sur l'élément `[data-tour-id]`) avec positionnement intelligent et scroll automatique
- `TourController` : orchestrateur de tour en deux phases — tour simulation puis tours des pages transverses (Finance, Éducation, Courtiers, Modèles)
- `useTourStore` : persistance de l'état du tour par profil (`patrimoine-tour-[profileId]`)
- Attributs `data-tour-id` ajoutés aux éléments cibles de tous les composants concernés

#### Navigation
- 4 nouvelles pages : `'education'` (Cmd+5 / G U), `'brokers'` (Cmd+6 / G B), `'models'` (Cmd+7 / G M), `'finance'` étendue
- Réorganisation de la sidebar : distinction visuelle entre pages transverses (haut) et pages liées à la simulation active (bas)
- Raccourcis clavier Cmd+5/6/7 pour accéder directement aux nouvelles pages

#### Dépendances
- `katex` 0.17.0 + `@types/katex` 0.16.8 — rendu de formules mathématiques LaTeX

### Changed

- `BanksTab` et `BankCard` refactorisés pour supporter les courtiers personnalisés en plus des données statiques
- `DataModal` recentré sur l'onglet actifs uniquement (banques et modèles migrés vers des pages dédiées)
- `App.tsx` : `AppPage` type étendu de 5 à 8 valeurs, `TourController` monté au niveau racine
- CLAUDE.md mis à jour pour refléter l'état v1.1.0 du projet (structure, fonctionnalités, stores, navigation)

---

## [1.0.0] — 2026-05 *(baseline)*

Version initiale : moteur de simulation multi-enveloppes, fiscalité française complète, bilan net, alertes intelligentes, optimiseur Black-Litterman/CVaR, module Finance avec trading paper et backtest, événements de vie, suivi réel.
