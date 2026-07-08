export interface TourStep {
  id: string
  page: string
  targetId: string
  title: string
  content: (name: string) => string
  requiresAction?: boolean
  padding?: number
}

export const SIMULATION_STEPS: TourStep[] = [
  // ── Phase 1 : Enveloppes ────────────────────────────────────────────────────
  {
    id: 'E1',
    page: 'envelopes',
    targetId: 'envelopes-subheadbar',
    title: 'Vos enveloppes de placement',
    content: (name) =>
      `${name ? `Bienvenue ${name} ! ` : ''}C'est ici que tout commence. Chaque enveloppe représente un compte de placement distinct — Livret A, PEA, CTO, assurance-vie, PER — avec ses propres règles fiscales et ses plafonds légaux.`,
  },
  {
    id: 'E2',
    page: 'envelopes',
    targetId: 'filter-chips-bar',
    title: 'Paramètres globaux',
    content: () =>
      `Ces chips définissent les paramètres de la simulation : durée de l'horizon, scénario de marché (pessimiste, réaliste ou optimiste) et mode de calcul. Le mode Monte-Carlo génère 1 000 trajectoires pour des projections probabilistes.`,
  },
  {
    id: 'E3',
    page: 'envelopes',
    targetId: 'envelopes-list-area',
    title: 'La liste de vos enveloppes',
    content: () =>
      `Chaque carte affiche le type d'enveloppe, ses actifs, son versement mensuel et sa part de l'effort total. Cliquez sur le chevron pour déplier et voir les actifs, ou sur l'icône ⚙ pour la configurer en détail.`,
  },
  {
    id: 'E4',
    page: 'envelopes',
    targetId: 'add-envelope-btn',
    title: 'Ajouter une enveloppe',
    content: () =>
      `Ce bouton propose 10 presets clé-en-main : Livret A, LDDS, LEP, PEA, PEA-PME, CTO, Assurance-vie, PER… Les plafonds légaux sont intégrés : quand un compte est plein, les versements excédentaires sont redirigés vers un autre de votre choix.`,
  },
  {
    id: 'E5',
    page: 'envelopes',
    targetId: 'envelope-settings-btn',
    title: 'Configurer une enveloppe',
    content: () =>
      `Ce bouton ouvre le panneau de configuration : capital initial, versements mensuel et annuel, allocation d'actifs avec leurs rendements attendus, frais de courtage (ou import depuis la base Courtiers), et options avancées (date d'ouverture, horizon de clôture, fréquence de versement).`,
  },
  {
    id: 'E5b',
    page: 'envelopes',
    targetId: 'life-events-section',
    title: 'Les événements de vie',
    content: () =>
      `En bas de page, planifiez les événements qui modifieront votre trajectoire : pause d'épargne, rentrée d'argent exceptionnelle, retrait pour un apport immobilier, naissance d'un enfant… Ils sont injectés mois par mois dans le calcul de la simulation.`,
    padding: 16,
  },
  {
    id: 'E6',
    page: 'envelopes',
    targetId: 'run-simulation-btn',
    title: 'Lancer la simulation',
    content: () =>
      `Quand vos enveloppes sont prêtes, cliquez ici. Le moteur mensuel calcule vos projections sur toute la durée avec intérêts composés, fiscalité réelle à la sortie et correction inflation (formule de Fisher). Cliquez maintenant pour voir vos résultats.`,
    requiresAction: true,
  },

  // ── Phase 2 : Dashboard ─────────────────────────────────────────────────────
  {
    id: 'S1',
    page: 'simulation_dashboard',
    targetId: 'dashboard-header',
    title: 'Tableau de bord',
    content: (name) =>
      `${name ? `Parfait ${name} ! ` : ''}Voici le résumé de votre simulation. Les résultats sont un snapshot figé — vous pouvez modifier vos enveloppes sans les perdre, et relancer quand vous voulez.`,
  },
  {
    id: 'S2',
    page: 'simulation_dashboard',
    targetId: 'kpi-strip',
    title: 'Indicateurs clés',
    content: () =>
      `Six KPIs d'un coup d'œil : capital projeté à terme, plus-values nettes après impôts, total des versements, effort mensuel, rendement net annualisé et patrimoine de départ. Le capital affiché est en euros courants (nominal).`,
  },
  {
    id: 'S3',
    page: 'simulation_dashboard',
    targetId: 'smart-alerts-panel',
    title: 'Alertes intelligentes',
    content: () =>
      `L'app analyse automatiquement votre simulation et génère des alertes contextuelles : plafond Livret A atteint, PEA proche des 150 k€, opportunité PER si votre TMI ≥ 30%, fonds d'urgence insuffisant, ratio d'endettement trop élevé…`,
  },
  {
    id: 'S4',
    page: 'simulation_dashboard',
    targetId: 'chart-main-panel',
    title: '9 onglets d\'analyse',
    content: () =>
      `Ce panneau propose 9 analyses dédiées : Projection empilée par enveloppe (avec bandes P10/P50/P90 en mode Monte-Carlo), Inflation (valeur réelle vs nominale), Retraite, Immobilier, Capital cible, Sécurité financière, Bilan net, Impact des frais et Analyse (benchmark, stress test, revenus passifs).`,
  },
  {
    id: 'S5',
    page: 'simulation_dashboard',
    targetId: 'chart-tabs-seg',
    title: 'Naviguez entre les analyses',
    content: () =>
      `Explorez chaque onglet. "Retraite" calcule le capital nécessaire selon votre taux de retrait et simule la phase de décumulation. "Bilan net" intègre vos dettes (crédit immobilier, auto…) pour afficher votre patrimoine réel net de passifs.`,
  },
  {
    id: 'S6',
    page: 'simulation_dashboard',
    targetId: 'allocation-grid',
    title: 'Répartition du portefeuille',
    content: () =>
      `Deux vues complémentaires : répartition par enveloppe et par classe d'actifs (actions, obligations, immobilier, crypto, livrets). Sélectionnez une année pour voir comment l'équilibre évolue dans le temps au fil de vos versements.`,
  },

  // ── Phase 3 : Optimiseur ────────────────────────────────────────────────────
  {
    id: 'O1',
    page: 'optimizer',
    targetId: 'optimizer-page',
    title: 'L\'optimiseur de portefeuille',
    content: (name) =>
      `${name ? `${name}, v` : 'V'}oici l'optimiseur Black-Litterman. Il calcule l'allocation optimale de vos actifs en combinant les rendements d'équilibre de marché avec vos propres convictions, puis minimise le CVaR 95% par descente de gradient.`,
  },
  {
    id: 'O2',
    page: 'optimizer',
    targetId: 'optimizer-regime',
    title: 'Régimes économiques',
    content: () =>
      `Sélectionnez le régime de départ : Expansion, Surchauffe, Récession ou Crise. Chaque régime a ses paramètres de rendement (μ) et de volatilité (σ) par classe d'actifs, et des probabilités de transition vers les autres régimes.`,
  },
  {
    id: 'O3',
    page: 'optimizer',
    targetId: 'optimizer-run-btn',
    title: 'Lancer l\'optimisation',
    content: () =>
      `L'algorithme optimise l'allocation sur 500 itérations. Résultat : portefeuille de Sharpe maximal sous contrainte CVaR 95%, et suggestions d'optimisation fiscale — quel actif placer dans quelle enveloppe pour maximiser le rendement net d'impôts.`,
  },
]
