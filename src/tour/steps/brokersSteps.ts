import type { TourStep } from './simulationSteps'

export const BROKERS_STEPS: TourStep[] = [
  {
    id: 'B1',
    page: 'brokers',
    targetId: 'brokers-page-header',
    title: 'Courtiers & Banques',
    content: () =>
      `Base de données des courtiers français avec leurs grilles de frais par type d'enveloppe : courtage, gestion, garde, entrée. Toutes les données sont statiques et vérifiées — comparez avant de choisir où ouvrir votre PEA ou votre CTO.`,
  },
  {
    id: 'B2',
    page: 'brokers',
    targetId: 'brokers-filter-area',
    title: 'Filtrer et comparer',
    content: () =>
      `Filtrez par type d'enveloppe (PEA, CTO, AV, PER) pour voir uniquement les brokers qui la proposent. Sélectionnez plusieurs brokers pour ouvrir la comparaison côte à côte — frais de courtage, minimum par ordre, frais annuels…`,
  },
  {
    id: 'B3',
    page: 'brokers',
    targetId: 'brokers-filter-area',
    title: 'Importer dans une enveloppe',
    content: () =>
      `Depuis la page Enveloppes, le panneau de configuration de chaque enveloppe a un bouton "Importer" dans la section Banque & frais. Un clic applique directement la grille de frais du courtier choisi à votre simulation — plus besoin de ressaisir.`,
  },
  {
    id: 'B4',
    page: 'brokers',
    targetId: 'brokers-add-custom-btn',
    title: 'Créer un courtier personnalisé',
    content: () =>
      `Votre banque n'est pas dans la liste ? Ce bouton crée une fiche personnalisée : nom, type d'établissement, note, points forts/faibles et grille de frais par enveloppe. Vos fiches restent modifiables, sont marquées d'un badge et propres à votre profil.`,
  },
]
