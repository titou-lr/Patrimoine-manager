import type { TourStep } from './simulationSteps'

export const EDUCATION_STEPS: TourStep[] = [
  {
    id: 'Ed1',
    page: 'education',
    targetId: 'education-page-header',
    title: 'Éducation financière',
    content: () =>
      `7 modules progressifs pour maîtriser la gestion de patrimoine : Fondamentaux, Allocation d'actifs, Enveloppes fiscales, Sélection d'actifs, Marchés financiers, Gestion de portefeuille et Fiscalité. Chaque module se déverrouille en complétant le précédent.`,
  },
  {
    id: 'Ed2',
    page: 'education',
    targetId: 'education-stats-strip',
    title: 'Votre progression',
    content: () =>
      `Suivez votre avancement : modules complétés, en cours, et leçons lues. La progression est persistante — vous pouvez quitter et reprendre à tout moment sans perdre votre avancement.`,
  },
  {
    id: 'Ed3',
    page: 'education',
    targetId: 'education-modules-grid',
    title: 'Catalogue de modules',
    content: () =>
      `Chaque carte affiche le format (QCM, interactif, mix), la durée estimée et les thèmes abordés. Cliquez sur un module pour voir ses leçons et exercices — les modules verrouillés se débloquent automatiquement quand vous terminez le précédent.`,
  },
  {
    id: 'Ed4',
    page: 'education',
    targetId: 'education-modules-grid',
    title: 'Leçons interactives & exercices',
    content: () =>
      `À l'intérieur d'un module : des leçons interactives avec simulateurs et QCMs (pas de lecture passive), et des exercices validables. Terminer certaines leçons valide automatiquement les exercices associés. Commencez par les Fondamentaux.`,
    padding: 20,
  },
]
