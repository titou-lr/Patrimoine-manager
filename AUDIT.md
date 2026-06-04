# AUDIT — Simulateur de Patrimoine
*Date : 2026-06-04 — Audit complet du répertoire `src/`*

---

## Méthodologie

- Lecture de tous les fichiers source (`src/**/*.{ts,tsx}`)
- Vérification croisée de chaque import/export
- Contrôle des règles d'architecture définies dans CLAUDE.md
- Score de confiance : 10 = certitude absolue, 1 = intuition seulement

---

## Catégorie A — Sûr à nettoyer (confiance ≥ 8/10)

Éléments dont la suppression ou correction est sans risque.

---

### A1 — `src/components/inputs/GlobalParams.tsx`
**Confiance : 10/10**
**Problème : Composant legacy, jamais importé nulle part.**

CLAUDE.md le signale lui-même comme "(legacy)". Aucun fichier du projet n'importe ce composant. Sa fonctionnalité (édition des paramètres globaux) est entièrement dupliquée dans le panneau inline d'`EnvelopesPage.tsx`. Le nom de la fonction exportée est d'ailleurs `GlobalParamsPanel`, pas `GlobalParams`, signe qu'il a été supplanté par une refonte.

---

### A2 — `src/components/profiles/ProfileMenu.tsx`
**Confiance : 10/10**
**Problème : Composant remplacé, jamais importé nulle part.**

CLAUDE.md l'annote explicitement : "(legacy, remplacé par ProfileDropdown inline dans App.tsx)". Aucun fichier ne l'importe. L'équivalent fonctionnel exact (liste des profils, switch, suppression) est recréé en dur dans `App.tsx` (composant interne `ProfileDropdown`). Garder ce fichier entretient une double implémentation qui divergera au fil du temps.

---

### A3 — `src/utils/exportPDF.ts`
**Confiance : 9/10**
**Problème : Utilitaire jamais importé.**

Le fichier contient une seule fonction utile : `exportToPDF()` qui appelle `window.print()`. Aucun composant ne l'importe. L'impression est aujourd'hui gérée via les styles CSS `print:` directement dans les composants. Ce fichier est un vestige d'une approche abandonnée.

---

### A4 — `src/engine/taxOptimizer.ts` ligne 23 : redéfinition de `PS_RATE`
**Confiance : 10/10**
**Problème : Violation de règle d'architecture — `PS_RATE` redéfini localement.**

CLAUDE.md est explicite : *"Ne pas redéfinir `PS_RATE` ailleurs que dans `engine/taxation.ts`"*. Or `taxOptimizer.ts` redéfinit sa propre constante locale `const PS_RATE = 0.172` au lieu d'importer celle de `taxation.ts`. C'est un correctif d'une ligne : remplacer la redéfinition par `import { PS_RATE } from './taxation'`. Risque actuel : si le taux change un jour, `taxOptimizer.ts` ne suivra pas.

---

## Catégorie B — À valider avant de toucher

Ces composants sont orphelins (aucun import actif), mais ils représentent des **fonctionnalités décrites dans CLAUDE.md** comme implémentées. La décision de les supprimer définitivement ou de les réintégrer t'appartient.

---

### B1 — `src/components/inputs/GlobalParamsBand.tsx`
**Enjeu fonctionnel :** C'est une barre complète de paramètres globaux avec les champs durée, inflation, TMI, âge, toggle standard/Monte-Carlo — plus complète que le système inline actuel d'EnvelopesPage. CLAUDE.md la décrit comme "Bande paramètres globaux + bouton Lancer (EnvelopesPage)", mais elle n'est jamais importée.

**Question :** Cette barre était-elle en cours d'intégration et a été abandonnée en faveur des popover chips actuels d'EnvelopesPage ? Ou faut-il la réintégrer à la place des chips ?

---

### B2 — `src/components/results/FeesImpactChart.tsx`
**Enjeu fonctionnel :** Graphique comparatif "avec frais vs sans frais" sur la durée — fonctionnalité décrite dans CLAUDE.md. L'onglet correspondant (`'frais'`) n'existe plus dans le Dashboard (les onglets actuels sont : projection, inflation, retraite, immobilier, capital, securite, bilan_net). Ce composant a survécu à la suppression de son onglet.

**Question :** L'onglet "impact frais" est-il définitivement abandonné, ou faut-il le réintroduire ?

---

### B3 — `src/components/results/BreakdownTable.tsx`
**Enjeu fonctionnel :** Tableau détaillé par enveloppe avec sélecteur d'année, décrit dans CLAUDE.md. Il n'est plus dans DashboardPage — les données sont affichées via d'autres visualisations.

**Question :** Ce tableau a-t-il été volontairement retiré du dashboard, ou était-il prévu d'être réintégré ?

---

### B4 — `src/components/results/MilestonePanel.tsx`
**Enjeu fonctionnel :** Panneau "jalons" (100k€ / 500k€ / 1M€) avec barres de progression, décrit dans CLAUDE.md. N'est plus importé dans DashboardPage.

**Question :** La fonctionnalité "jalons" est-elle définitivement absente de l'app, ou souhaitais-tu la réintégrer ?

---

### B5 — `src/components/results/SummaryCards.tsx`
**Enjeu fonctionnel :** Les "KPI héros" (capital final, valeur réelle, gains nets) décrits dans CLAUDE.md. DashboardPage affiche ces informations, mais en inline dans son propre rendu, sans importer ce composant.

**Question :** Ces cards sont-elles remplacées définitivement par l'implémentation inline, ou faut-il consolider vers ce composant ?

---

### B6 — `src/components/scenarios/ScenarioCompareChart.tsx`
**Enjeu fonctionnel :** Graphique superposant les 3 scénarios (pessimiste / réaliste / optimiste), décrit dans CLAUDE.md. Le mode comparaison de scénarios est aujourd'hui géré différemment (`compareMode` dans `PatrimoineChart`).

**Question :** Ce graphique dédié est-il abandonné au profit de `compareMode`, ou y a-t-il un usage prévu ?

---

### B7 — `src/components/scenarios/ScenarioSelector.tsx`
**Enjeu fonctionnel :** Boutons de sélection de scénario (pessimiste / réaliste / optimiste), jamais importé. La sélection du scénario se fait via un popover chip dans EnvelopesPage.

**Question :** Ce composant est-il une ébauche abandonnée, ou était-il prévu pour être utilisé à un autre endroit ?

---

### B8 — `src/components/tools/BackwardCalculator.tsx`
**Enjeu fonctionnel :** Calculateur inverse (capital cible → versement mensuel nécessaire), avec bouton "Appliquer" pour injecter dans les paramètres. Fonctionnalité décrite dans CLAUDE.md. N'est accessible nulle part dans l'interface.

**Question :** Faut-il exposer ce calculateur dans l'UI (par exemple dans un onglet Outils ou dans la sidebar), ou est-il définitivement abandonné ?

---

### B9 — `src/components/compare/StrategyComparator.tsx`
**Enjeu fonctionnel :** Comparateur multi-simulations avec graphique LineChart, décrit dans CLAUDE.md. `SimulationComparePanel.tsx` (lui bien importé dans App.tsx) semble avoir pris ce rôle.

**Question :** Ce composant est-il doublon de `SimulationComparePanel` ? Si oui, c'est plutôt catégorie A.

---

## Catégorie C — Laisser tel quel

Tout le reste est propre, bien importé, et respecte les règles d'architecture.

**Moteurs (src/engine/) — tous sains :**
- `simulation.ts`, `taxation.ts`, `inflation.ts`, `retirement.ts` — fonctions pures, bien structurées
- `lifeEventsEngine.ts`, `netWorthEngine.ts`, `alertsEngine.ts` — importés correctement
- `markovEngine.ts` — importe `getEffectiveTaxRate` depuis `portfolioOptimizer.ts` : légitime
- `portfolioOptimizer.ts` — importe `PS_RATE` depuis `taxation.ts` : correct
- `taxOptimizer.ts` — importé correctement par `TaxOptimizer.tsx`, seul problème = PS_RATE local (→ A4)

**Constantes sources uniques :**
- `ZERO_FEES` : défini une seule fois dans `simulation.ts`, importé correctement par `App.tsx`, `envelopePresets.ts`, `EnvelopeAssetsFees.tsx` ✓
- `DEFAULT_RETIREMENT_PARAMS` : défini une seule fois dans `useStore.ts`, importé par `RetirementPanel.tsx` ✓
- `PS_RATE` : défini dans `taxation.ts` ✓ (violation dans taxOptimizer.ts → traitée en A4)

**Fausse alerte — NumberInput :**
CLAUDE.md mentionne `NumberInput.tsx` en double (dans `inputs/` et `ui/`), mais le fichier `src/components/inputs/NumberInput.tsx` n'existe pas. Il n'y a qu'une seule implémentation : `src/components/ui/NumberInput.tsx`. Pas de doublon.

**Composants actifs (tous bien importés) :**
- DashboardPage, EnvelopesPage, App.tsx
- PatrimoineChart, AllocationPieChart, InflationChart, RetirementPanel, RetirementDualChart
- RealEstatePanel, CapitalPanel, SecurityPanel, NetWorthPanel, HistoryPanel
- SmartAlerts, SimulationComparePanel, EnvelopeCard, EnvelopeTypeSelector
- EnvelopeMetaSection, EnvelopeProjectionSection, EnvelopeAssetsFees, EnvelopeTaxInfo
- AllocationRow, NumberInput (ui/), FormulaBlock, InteractiveExample, GlossaryTooltip, GlossaryModal
- ProfileScreen, CreateProfileModal, DataModal, AssetsTab, BanksTab, BankCard, BankCompareOverlay, ModelsPage
- PortfolioOptimizer, TaxOptimizer, LifeEvents, OnboardingModal, SimulationTabs, SimulationDropdown
- format.ts, exportCSV.ts, marketDataService.ts, profileService.ts
- envelopePresets.ts, glossary.ts, regimeData.ts, assets.json, banks.json

---

## Résumé exécutif

| Catégorie | Nombre d'items | Action |
|-----------|---------------|--------|
| A — Nettoyer | 4 (3 fichiers + 1 violation) | Suppression + correctif immédiat |
| B — Valider | 9 composants | Questions ci-dessus à trancher |
| C — Laisser | ~45 fichiers | Rien à faire |

**Estimation gain catégorie A :** ~700 lignes de code mort supprimées + 1 violation de règle corrigée.
