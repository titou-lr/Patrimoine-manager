/** Pages disposant d'un contenu d'aide contextuelle */
export type HelpPageKey =
  | 'patrimoine' | 'succession' | 'simulation'
  | 'budget' | 'finance' | 'education' | 'brokers' | 'models'

export interface HelpSection {
  title: string
  content: string
  /** Astuce mise en valeur visuellement sous la section */
  tip?: string
}

export interface HelpContent {
  pageTitle: string
  intro: string
  sections: HelpSection[]
}
