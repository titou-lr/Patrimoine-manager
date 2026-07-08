import type { TourStep } from './simulationSteps'

export const PATRIMOINE_STEPS: TourStep[] = [
  {
    id: 'P1',
    page: 'patrimoine',
    targetId: 'patrimoine-net-hero',
    title: 'Votre patrimoine net',
    content: (name) =>
      `${name ? `${name}, v` : 'V'}oici le chiffre de référence de cette page : tout ce que vous possédez moins tout ce que vous devez. C'est la photo de votre situation réelle aujourd'hui — distincte de la simulation, qui projette le futur.`,
  },
  {
    id: 'P2',
    page: 'patrimoine',
    targetId: 'patrimoine-repartition-toggle',
    title: 'Deux lectures de votre répartition',
    content: () =>
      `Ce toggle bascule le donut entre deux vues : par classe d'actifs (bancaire, immobilier, crypto, or…) pour juger votre diversification, et par enveloppe fiscale (PEA, assurance-vie, CTO…) pour voir où loge votre argent fiscalement.`,
  },
  {
    id: 'P3',
    page: 'patrimoine',
    targetId: 'patrimoine-tab-seg',
    title: 'Saisir mon patrimoine',
    content: () =>
      `Cet onglet ouvre la saisie : 4 sections dépliables (financier, immobilier, alternatif, passifs) avec un formulaire adapté à chaque catégorie. Des badges de fraîcheur signalent les valeurs anciennes (> 30 jours) à mettre à jour.`,
  },
  {
    id: 'P4',
    page: 'patrimoine',
    targetId: 'patrimoine-snapshot-btn',
    title: 'Prendre un snapshot',
    content: () =>
      `Un snapshot fige la photo du moment. Chaque snapshot ajoute un point à la courbe d'évolution — sans snapshots réguliers, pas d'historique. Il n'est jamais pris automatiquement : c'est vous qui décidez quand vos valeurs sont à jour. Une fois par mois est un bon rythme.`,
  },
  {
    id: 'P5',
    page: 'patrimoine',
    targetId: 'patrimoine-timeline',
    title: 'Évolution & top movers',
    content: () =>
      `Cette courbe trace actifs, passifs et patrimoine net à chaque snapshot. Dès que vous en avez deux, la section « Top movers » apparaît à côté de la répartition : les actifs qui ont le plus varié entre les deux dernières photos, en euros et en pourcentage.`,
  },
]
