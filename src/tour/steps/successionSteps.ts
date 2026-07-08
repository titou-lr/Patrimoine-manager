import type { TourStep } from './simulationSteps'

export const SUCCESSION_STEPS: TourStep[] = [
  {
    id: 'SU1',
    page: 'succession',
    targetId: 'succession-header',
    title: 'Simulateur de succession',
    content: () =>
      `Ce simulateur estime les droits de succession sur votre patrimoine selon le droit fiscal français (barèmes 2024) : abattements par lien de parenté, barème progressif, rappel fiscal des donations sur 15 ans et régime spécifique de l'assurance-vie. Estimation indicative — ne remplace pas un notaire.`,
  },
  {
    id: 'SU2',
    page: 'succession',
    targetId: 'succession-benef-panel',
    title: 'Ajoutez vos bénéficiaires',
    content: () =>
      `Commencez par « + Ajouter » : chaque héritier est défini par son lien de parenté (qui fixe son abattement et son barème) et sa part de la succession en %. Le total doit faire 100 % — le conjoint ou partenaire de PACS est totalement exonéré.`,
  },
  {
    id: 'SU3',
    page: 'succession',
    targetId: 'succession-results-panel',
    title: 'Les droits par bénéficiaire',
    content: () =>
      `Les résultats se recalculent en direct : pour chacun, la part brute reçue, l'abattement appliqué, la base imposable, les droits à payer et le taux effectif. Les donations passées saisies à gauche réduisent l'abattement disponible (rappel fiscal des 15 ans).`,
  },
  {
    id: 'SU4',
    page: 'succession',
    targetId: 'succession-projection',
    title: 'Projeter dans le futur',
    content: () =>
      `Ce curseur ajoute à la masse successorale la croissance calculée par votre simulation d'épargne. Vous voyez comment les droits évolueraient dans 10, 20 ou 30 ans — le point de départ d'une stratégie de donation anticipée.`,
  },
]
