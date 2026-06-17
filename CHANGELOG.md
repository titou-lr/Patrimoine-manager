# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
