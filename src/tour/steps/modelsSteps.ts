import type { TourStep } from './simulationSteps'

export const MODELS_STEPS: TourStep[] = [
  {
    id: 'M1',
    page: 'models',
    targetId: 'models-page-header',
    title: 'Modèles & Formules',
    content: () =>
      `Référence mathématique exhaustive de l'app : toutes les formules utilisées dans le code, avec leur source exacte (nom de fichier + numéro de ligne). 8 sections couvrent la simulation, la fiscalité française, la retraite, le crédit, les indicateurs techniques, Monte-Carlo, Black-Litterman et le backtest.`,
  },
  {
    id: 'M2',
    page: 'models',
    targetId: 'models-left-nav',
    title: 'Navigation par section',
    content: () =>
      `Le panneau gauche liste les 8 sections et suit votre position dans la page. Cliquez sur une section pour y sauter directement. La section active se met à jour au scroll.`,
  },
  {
    id: 'M3',
    page: 'models',
    targetId: 'models-content-area',
    title: 'Formules avec calculateurs',
    content: () =>
      `Chaque formule est accompagnée de ses variables définies, d'un exemple numérique chiffré, et souvent d'un calculateur interactif. Modifiez les inputs pour voir le résultat changer en temps réel — utile pour comprendre l'impact de chaque paramètre.`,
    padding: 20,
  },
]
