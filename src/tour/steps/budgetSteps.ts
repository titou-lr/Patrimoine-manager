import type { TourStep } from './simulationSteps'

export const BUDGET_STEPS: TourStep[] = [
  {
    id: 'BU1',
    page: 'budget',
    targetId: 'budget-month-selector',
    title: 'Pilotage mensuel',
    content: () =>
      `Le module Budget suit vos revenus et dépenses mois par mois. Naviguez entre les mois avec les flèches — chaque mois est un snapshot indépendant avec report optionnel des soldes non dépensés.`,
  },
  {
    id: 'BU2',
    page: 'budget',
    targetId: 'budget-overview-panel',
    title: "Vue d'ensemble",
    content: () =>
      `Le panneau de gauche affiche vos KPIs clés : revenus, dépenses, épargne et taux d'épargne réel. Le donut montre la répartition de vos dépenses par catégorie — pratique pour repérer les postes qui dérapent.`,
  },
  {
    id: 'BU3',
    page: 'budget',
    targetId: 'budget-first-envelope-card',
    title: 'Enveloppes budgétaires',
    content: () =>
      `Chaque enveloppe correspond à un poste de dépense (alimentation, loyer, loisirs…) avec un budget mensuel alloué. La barre de progression à 3 segments montre ce qui est dépensé, restant, et reporté. Cliquez sur le montant pour l'éditer en ligne.`,
  },
  {
    id: 'BU4',
    page: 'budget',
    targetId: 'budget-add-transaction',
    title: 'Ajouter une transaction',
    content: () =>
      `Saisissez vos revenus et dépenses manuellement. Associez chaque transaction à une catégorie et une enveloppe pour que les barres de progression se mettent à jour. Le taux d'épargne réel calculé est comparé à votre hypothèse de simulation.`,
  },
  {
    id: 'BU5',
    page: 'budget',
    targetId: 'budget-tabs',
    title: 'Aller plus loin',
    content: () =>
      `Les autres onglets complètent le pilotage : import de relevés bancaires CSV/Excel (onglet Transactions), détection des récurrences et abonnements, calendrier des prélèvements, objectifs d'épargne, plan de remboursement des dettes et prévisions de trésorerie à 6 mois.`,
  },
]
