# Architecture technique — patrimoine-sim

## Flux de données

```
GlobalParams + Envelopes + ScenarioType
        │
        ▼ handleRunSimulation() dans App.tsx (bouton manuel)
engine/simulation.ts → runSimulation()
  ├── engine/inflation.ts  resolveInflationRate(), presentValue()
  └── engine/taxation.ts   computeTax(), taxCTODividend()
        │
        ▼ RunState (snapshot figé)
components/pages/DashboardPage.tsx ← useStore (retirementParams, compareMode)
components/pages/EnvelopesPage.tsx ← useStore (envelopes, globalParams, isDirty)
```

Le store Zustand **ne calcule pas** — il stocke les paramètres.  
Les résultats sont un snapshot `RunState` mis à jour manuellement via le bouton « Lancer la simulation ».  
`isDirty` passe à `true` dès qu'une enveloppe ou un paramètre est modifié ; le bouton Run est actif uniquement si `isContributionCoherent()` est vrai.

## Architecture fiscale

```
Envelope.type → computeTax() dans taxation.ts
                  ├── livret_a / ldds / livret_jeune → exonéré
                  ├── pea    → taxPEA(gain, yearsHeld)
                  ├── cto    → taxCTO(gain, taxProfile)   [dividendes : taxCTODividend()]
                  ├── assurance_vie → taxAV(gain, contributed, yearsHeld, taxProfile)
                  └── per    → taxPER(gain, contributed, taxProfile)
```

Règles en une ligne par type :
- **Livrets réglementés** : `taxAmount = 0` — exonéré IR et PS
- **PEA** : flat 30% si < 5 ans ; PS 17.2% uniquement si ≥ 5 ans ; années = `yearsSimulated + yearsAlreadyHeld`
- **CTO** : barème `TMI + 17.2%` si `TMI ≤ 11%` ; sinon flat 30% (PFU)
- **CTO dividendes** : abattement 40%, taxe annuelle `dividends × 0.60 × (TMI/100 + 0.172)`
- **AV** : flat 30% si < 8 ans ; taux réduit 24.7% + abattement 4 600/9 200 € si ≥ 8 ans ; mixte si versements > 150 000 €
- **PER** : `versements × TMI + gains × 30%` (sortie en capital)

`TaxProfile` est construit dans `runSimulation()` depuis `params.tmi` et `params.isCouple`.  
`PS_RATE`, `taxPEA`, etc. sont tous exportés depuis `taxation.ts`.

## Ajouter une nouvelle enveloppe

1. Si le type fiscal est nouveau, ajouter le cas dans `computeTax()` (`engine/taxation.ts`)
2. Ajouter le type dans `EnvelopeType` (`types/index.ts`) si nécessaire
3. Ajouter le preset dans `ENVELOPE_PRESETS` et `PRESET_GROUPS` (`data/envelopePresets.ts`)
4. Ajouter le mapping `PRESET_TO_TYPE[presetKey]` dans `envelopePresets.ts`
5. Ajouter `TAX_RATE_BY_TYPE` et `DEFAULT_FEES` pour le nouveau type dans `envelopePresets.ts`
6. Ajouter le plafond légal dans `DEFAULT_MAX_CONTRIBUTIONS` (`engine/simulation.ts`) si applicable
7. Ajouter la couleur dans `ENVELOPE_COLORS` dans `PatrimoineChart.tsx` et `AllocationPieChart.tsx`
8. Mettre à jour le tableau des enveloppes dans `CLAUDE.md`

## Ajouter un nouveau graphique / panneau résultat

1. Créer `src/components/results/MonGraphique.tsx`
2. Typer les props avec `interface Props { results: SimulationResult[]; ... }`
3. Ajouter un guard en tête : `if (!results.length) return null`
4. Importer et ajouter dans `DashboardPage.tsx` — soit dans la zone principale, soit dans un onglet secondaire

## Ajouter un onglet secondaire (Dashboard)

Dans `DashboardPage.tsx` :
1. Ajouter `{ id: 'mon-onglet', label: 'Mon Label' }` dans `SECONDARY_TABS`
2. Ajouter le bloc `{secondaryTab === 'mon-onglet' && <MonComposant ... />}` dans le JSX

Les 6 onglets actuels : `inflation` | `repartition` | `retraite` | `immobilier` | `capital` | `securite`

## Modifier le moteur de calcul

Trois fichiers dans `src/engine/`, tous des fonctions pures sans import React.

- **`simulation.ts`** : boucle mensuelle, plafonds, agrégation — point d'entrée `runSimulation()`
- **`taxation.ts`** : toutes les règles fiscales — modifier ici uniquement
- **`inflation.ts`** : Fisher, actualisation, scénarios inflation

Points d'attention :
- `ZERO_FEES` est **exporté** depuis `simulation.ts` — l'importer, ne pas redéfinir
- Les constantes fiscales (`PS_RATE`, etc.) sont dans `taxation.ts` — ne pas les dupliquer
- Le scénario modifie `inflationRate` et `expectedReturn` de chaque actif avant simulation
- La fiscalité est calculée **chaque année** comme si on liquidait (comparaison inter-enveloppes)
- `yearsAlreadyHeld` est calculé depuis `envelope.openedAt` pour la durée de détention réelle

## Modifier le module retraite

`src/engine/retirement.ts` — fonctions pures.

- `computeRunwayYears` a un garde `MAX_RUNWAY_MONTHS = 200 * 12` pour éviter toute boucle infinie
- `computeWeightedReturn` pondère par `monthlyContribution + initialCapital / 120` (proxy encours 10 ans)
- `DEFAULT_RETIREMENT_PARAMS` est exporté depuis `store/useStore.ts` — ne pas le redéfinir

## Modifier le store

`src/store/useStore.ts` — Zustand + persist.

- La clé localStorage est dynamique : `getStoreKey()` → `'patrimoine-data-[profileId]'`
- `past[]` et `future[]` sont strippés à la persistance (reset undo/redo au reload, intentionnel)
- `isDirty` persiste à `true` au reload (résultats toujours obsolètes après refresh navigateur)
- `MAX_HISTORY_SIZE = 30` — limite par simulation
- `pushHistory()` est appelé dans chaque mutation de données (addEnvelope, updateEnvelope…)
- Ne pas appeler `pushHistory()` dans `updateRetirementParams` ou `setScenario`
- `SIMULATION_AFFECTING_KEYS` liste les champs Envelope qui mettent `isDirty` à `true`
- `updateGlobalParams` synchronise automatiquement `monthlyContribution` si salaire/taux change

## Synchronisation effort ↔ versements

Le montant mensuel investi est `salaire × taux / 100` (affiché comme « effort »).  
Chaque enveloppe stocke `contributionMode` (`'euros'` ou `'percent'`) et `contributionPercent`.  
Quand le salaire ou le taux d'investissement change, `updateGlobalParams` recalcule tous les `monthlyContribution` proportionnellement.  
`isContributionCoherent()` vérifie que `sum(contributions) ≈ effort` (tolérance 1 €).  
`rebalanceEnvelopes('last')` absorbe l'écart sur la dernière enveloppe modifiée.  
`rebalanceEnvelopes('proportional')` redistribue en gardant les ratios.

## Données marché

`src/services/marketDataService.ts`

- Cache localStorage `'market-data-cache'` avec TTL 1h (`CACHE_TTL_MS`)
- Fallback silencieux sur `data/assets.json` si fetch échoue
- Timeout par requête : `FETCH_TIMEOUT_MS = 8000ms` via `AbortSignal.timeout`
- `fetchLiveData()` = point d'entrée public ; `getCachedAssets()` pour lecture sans fetch
- `getCacheAgeMs()` retourne l'âge du cache en ms (affiché dans DataModal)

## Presets enveloppes

`src/data/envelopePresets.ts` — source unique pour la création d'enveloppes.

- `ENVELOPE_PRESETS` : 10 presets avec `label`, `maxContribution`, `taxRule`, `defaultReturn`, `regulated`
- `PRESET_GROUPS` : groupes UI (livrets réglementés / enveloppes de marché)
- `createEnvelopeFromPreset(presetKey)` : factory qui construit une `Envelope` complète
- `TAX_RULE_LABEL` : labels courts pour l'UI (table fiscalité dans `ModelsPage`)
- `formatPlafond(maxCont)` : affichage du plafond (Intl.NumberFormat + « Illimité »)

## Points d'attention pour futures modifications

- **Recharts + TypeScript** : les tooltips custom reçoivent `active`, `payload`, `label` injectés automatiquement. Typer avec des interfaces locales (ex. `interface TooltipPayload { dataKey: string; value: number }`) plutôt qu'avec `any`.
- **Recharts height** : ne jamais mettre `height="100%"` sur `ResponsiveContainer` — bug connu. Toujours une valeur numérique (ex. `height={260}`).
- **Epsilon allocation** : `ALLOCATION_EPSILON = 0.01` est défini localement dans `EnvelopeCard` et `AllocationRow`. Si la tolérance change, les modifier ensemble.
- **Export PDF** : `exportToPDF()` appelle `window.print()` — c'est l'impression navigateur, pas un vrai PDF. L'icône et le label reflètent "Imprimer / PDF".
- **RunState et changement de simulation** : quand `activeSim.id` change (switch simulation), un `useEffect` dans `App.tsx` recalcule automatiquement le `RunState` et remet `isDirty` à `false`.
- **LEP / PEL / PEA-PME** : ces presets existent dans `envelopePresets.ts` mais leur `type` est mappé vers un `EnvelopeType` existant. La fiscalité est donc celle du type mappé, pas un comportement dédié.
- **`currentRealValue` vs `initialCapital`** : si une enveloppe a `currentRealValue != null && > 0`, la simulation démarre le solde depuis cette valeur (enveloppe déjà valorisée). `initialCapital` reste la base de coût fiscale (montant investi déclaré).
- **Dividendes CTO non réinvestis** : `reinvestDividends === false` active un retrait mensuel fixe (`estimatedMonthlyDividends`) + la taxe sur dividendes calculée avec `dividendRate` est désactivée (double compte évité).

## TODO identifiés pour la v2

- Simulation Monte-Carlo (N scénarios aléatoires → intervalles de confiance)
- Optimisation Markowitz (frontière efficiente, ratio de Sharpe)
- Régression temporelle sur données historiques
- Black-Scholes simplifié pour produits optionnels
