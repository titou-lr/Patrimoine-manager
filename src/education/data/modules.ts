export type LessonFormat = 'qcm' | 'interactive' | 'mix'

export interface Lesson {
  id: string
  title: string
}

export interface Exercise {
  id: string
  title: string
}

export interface EducationModule {
  id: string
  order: number
  title: string
  description: string
  topics: string[]
  format: LessonFormat
  estimatedMinutes: number
  color: string
  lessons: Lesson[]
  exercises: Exercise[]
}

export const EDUCATION_MODULES: EducationModule[] = [
  {
    id: 'fundamentals',
    order: 1,
    title: 'Les Fondamentaux',
    description: "Comprendre les bases indispensables : inflation, intérêts composés, relation risque/rendement et profil d'investisseur.",
    topics: ['Inflation', 'Intérêts composés', 'Risque & rendement', "Profil d'investisseur"],
    format: 'qcm',
    estimatedMinutes: 25,
    color: '#5e6ad2',
    lessons: [
      { id: 'f-l1', title: "L'inflation et le pouvoir d'achat" },
      { id: 'f-l2', title: 'Les intérêts composés' },
      { id: 'f-l3', title: 'Risque et rendement attendu' },
      { id: 'f-l4', title: "Identifier son profil d'investisseur" },
    ],
    exercises: [
      { id: 'f-e1', title: 'QCM — Fondamentaux' },
    ],
  },
  {
    id: 'allocation',
    order: 2,
    title: 'Allocation d\'actifs',
    description: 'Comprendre les classes d\'actifs, construire un portefeuille diversifié et maintenir son allocation dans le temps.',
    topics: ["Classes d'actifs", 'Diversification', 'Rééquilibrage'],
    format: 'mix',
    estimatedMinutes: 35,
    color: '#4cb782',
    lessons: [
      { id: 'a-l1', title: "Les grandes classes d'actifs" },
      { id: 'a-l2', title: 'La diversification en pratique' },
      { id: 'a-l3', title: "Allocation selon l'âge" },
      { id: 'a-l4', title: 'Rééquilibrage et dérive de portefeuille' },
    ],
    exercises: [
      { id: 'a-e1', title: 'Construire une allocation cible' },
      { id: 'a-e2', title: 'QCM — Allocation' },
    ],
  },
  {
    id: 'envelopes',
    order: 3,
    title: 'Enveloppes fiscales françaises',
    description: 'Maîtriser le PEA, l\'assurance-vie, le PER et le CTO pour optimiser l\'imposition de ses gains.',
    topics: ['PEA', 'Assurance-vie', 'PER', 'CTO'],
    format: 'qcm',
    estimatedMinutes: 35,
    color: '#eb5757',
    lessons: [
      { id: 'e-l1', title: 'Le Plan d\'Épargne en Actions (PEA)' },
      { id: 'e-l2', title: "L'assurance-vie" },
      { id: 'e-l3', title: 'Le Plan d\'Épargne Retraite (PER)' },
      { id: 'e-l4', title: 'Le Compte-Titres Ordinaire (CTO)' },
    ],
    exercises: [
      { id: 'e-e1', title: 'QCM situationnel — Quelle enveloppe choisir ?' },
    ],
  },
  {
    id: 'selection',
    order: 4,
    title: 'Sélectionner ses investissements',
    description: 'Choisir entre ETF, obligations, SCPI et crypto selon son horizon et son profil de risque.',
    topics: ['ETF', 'Obligations', 'SCPI', 'Crypto'],
    format: 'mix',
    estimatedMinutes: 40,
    color: '#f5a623',
    lessons: [
      { id: 's-l1', title: 'Les ETF et fonds indiciels' },
      { id: 's-l2', title: 'Obligations et taux' },
      { id: 's-l3', title: 'SCPI et immobilier papier' },
      { id: 's-l4', title: 'Cryptoactifs — risques et opportunités' },
    ],
    exercises: [
      { id: 's-e1', title: 'Choisir un ETF selon ses critères' },
      { id: 's-e2', title: 'QCM — Instruments financiers' },
    ],
  },
  {
    id: 'markets',
    order: 5,
    title: 'Lire et analyser un marché',
    description: 'Interpréter les graphiques en chandeliers et utiliser les indicateurs techniques : tendances, support/résistance, RSI, MACD, Bollinger et ATR — jusqu\'à l\'exercice pratique sur PatrimCorp.',
    topics: ['Chandeliers japonais', 'Tendances & S/R', 'RSI', 'MACD', 'Bollinger & ATR', 'Stratégies'],
    format: 'interactive',
    estimatedMinutes: 60,
    color: '#9b59b6',
    lessons: [
      { id: 'm-l1', title: 'Lire un graphique de cours' },
      { id: 'm-l2', title: 'Tendances et supports/résistances' },
      { id: 'm-l3', title: 'RSI — mesurer la force du mouvement' },
      { id: 'm-l4', title: 'MACD — suivre la tendance' },
      { id: 'm-l5', title: 'Bandes de Bollinger et ATR' },
      { id: 'm-l6', title: 'Appliquer une stratégie en direct' },
    ],
    exercises: [
      { id: 'm-e1', title: 'Exercice pratique — Appliquer une stratégie sur PatrimCorp' },
    ],
  },
  {
    id: 'portfolio',
    order: 6,
    title: 'Gérer son portefeuille dans le temps',
    description: 'DCA vs lump-sum, asymétrie des pertes, TWR et MWR, biais comportementaux et discipline d\'investisseur.',
    topics: ['DCA vs Lump-sum', 'Drawdown', 'TWR & MWR', 'Biais cognitifs', 'Discipline'],
    format: 'interactive',
    estimatedMinutes: 45,
    color: '#1abc9c',
    lessons: [
      { id: 'p-l1', title: 'DCA vs investissement unique (lump-sum)' },
      { id: 'p-l2', title: 'Comprendre et gérer le drawdown' },
      { id: 'p-l3', title: 'Mesurer sa performance : TWR et MWR' },
      { id: 'p-l4', title: 'Biais cognitifs et psychologie de l\'investisseur' },
      { id: 'p-l5', title: 'Synthèse : construire sa discipline d\'investisseur' },
    ],
    exercises: [
      { id: 'p-e1', title: 'Scénario de crise — simuler ses réactions' },
    ],
  },
  {
    id: 'taxation',
    order: 7,
    title: 'Optimiser sa fiscalité',
    description: 'Maîtriser la flat tax, le tax-loss harvesting, les bases de la succession et les leviers d\'optimisation successorale.',
    topics: ['PFU / Flat tax', 'Tax-loss harvesting', 'Succession', 'Transmission'],
    format: 'mix',
    estimatedMinutes: 45,
    color: '#e67e22',
    lessons: [
      { id: 't-l1', title: 'Flat tax (PFU) vs barème progressif' },
      { id: 't-l2', title: 'Tax-loss harvesting' },
      { id: 't-l3', title: 'Transmettre son patrimoine : les bases de la succession' },
      { id: 't-l4', title: 'Stratégies d\'optimisation successorale' },
    ],
    exercises: [
      { id: 't-e1', title: 'Exercice de synthèse — Stratégie de transmission' },
    ],
  },
]
